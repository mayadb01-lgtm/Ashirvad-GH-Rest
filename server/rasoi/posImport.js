// POS (My Hotel Sense) ki report CSV → Manager. ⚠️ Sirf naye collections: kitchen_pos_daily (din-wise jod) + kitchen_pos_files (asli file ka backup).
// App ka purana data nahi chhoota. Same din dobara aaye to us din ka wahi hissa badal jata hai (duplicate nahi).
import mongoose from "mongoose";
import crypto from "crypto";

const dailySchema = new mongoose.Schema({ _id: String, data: mongoose.Schema.Types.Mixed, at: Date }, { versionKey: false, minimize: false });
export const PosDaily = mongoose.models.KitchenPosDaily || mongoose.model("KitchenPosDaily", dailySchema, "kitchen_pos_daily");
const fileSchema = new mongoose.Schema(
  { _id: String, name: String, type: String, from: String, to: String, rows: Number, text: String, by: String, at: Date, meta: mongoose.Schema.Types.Mixed },
  { versionKey: false }
);
export const PosFile = mongoose.models.KitchenPosFile || mongoose.model("KitchenPosFile", fileSchema, "kitchen_pos_files");

// CSV (quotes ke saath)
export function parseCSV(text) {
  const rows = [];
  let row = [], cur = "", q = false;
  const s = String(text || "").replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && s[i + 1] === "\n") i++; row.push(cur); rows.push(row); row = []; cur = ""; }
    else cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((x) => String(x).trim() !== ""));
}
const MON = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
// "1 Jul 26" / "2026-10-22" / "22-10-2026" → "2026-10-22"
export function isoDate(h) {
  const x = String(h || "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(x);
  if (m) return x;
  m = /^(\d{1,2})[ -]([A-Za-z]{3})[a-z]*[ -](\d{2,4})$/.exec(x);
  if (m && MON[m[2].toLowerCase()]) { const y = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3]); return `${y}-${String(MON[m[2].toLowerCase()]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`; }
  m = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/.exec(x);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}
const num = (v) => { const n = Number(String(v ?? "").replace(/[,₹\s]/g, "")); return Number.isFinite(n) ? n : 0; };
const keyName = (s) => String(s || "").trim().replace(/\s+/g, " ").slice(0, 80);
const safeKey = (s) => keyName(s).replace(/\./g, "·").replace(/^\$/, "＄");

// Report pehchano (pehli line se)
export function detect(head) {
  const h = head.map((x) => String(x).trim().toLowerCase());
  if (h[0] === "dish name") return "dish";
  if (h[0] === "category name") return "category";
  if (h[0] === "space type name") return "spacetype";
  if (h[0] === "space name") return "space";
  if (h[0] === "date" && h.includes("total footfall") && h.includes("adults (male)")) return "footfall";
  if (h[0] === "date" && h.includes("sale/person")) return "perperson";
  return null;
}

// Ek file → din-wise hisse { "2026-10-21": { dish: {...} } } + meta (kul matra/rakam)
export function toDaily(type, rows) {
  const head = rows[0], body = rows.slice(1), days = {}, meta = {};
  const put = (d, part, val) => { (days[d] ||= {})[part] = val; };
  if (["dish", "category", "spacetype", "space"].includes(type)) {
    // pehle kuch column total wale, baaki din wale
    const dcols = head.map((h, i) => [i, isoDate(h)]).filter(([, d]) => d);
    const totQ = head.findIndex((h) => /^total (qty|orders)$/i.test(String(h).trim()));
    const totA = head.findIndex((h) => /^total amt$/i.test(String(h).trim()));
    const tat = head.findIndex((h) => /turn ?around/i.test(String(h)));
    const part = { dish: "dish", category: "cat", spacetype: "stype", space: "space" }[type];
    const per = {};
    body.forEach((r) => {
      const name = safeKey(r[0]);
      if (!name || /^total$/i.test(name)) return;
      meta[name] = { qty: totQ >= 0 ? num(r[totQ]) : 0, amt: totA >= 0 ? num(r[totA]) : 0, ...(tat >= 0 ? { tat: num(r[tat]) } : {}) };
      dcols.forEach(([i, d]) => { const v = num(r[i]); if (v) ((per[d] ||= {})[name] = v); else (per[d] ||= {}); });
    });
    Object.entries(per).forEach(([d, v]) => put(d, part, v));
    return { days, meta, from: dcols.length ? dcols[0][1] : null, to: dcols.length ? dcols[dcols.length - 1][1] : null, rows: body.length };
  }
  // footfall / per-person: ek line = ek din
  const idx = (re) => head.findIndex((h) => re.test(String(h).trim()));
  const ds = body.map((r) => isoDate(r[0])).filter(Boolean).sort();
  body.forEach((r) => {
    const d = isoDate(r[0]);
    if (!d) return;
    if (type === "footfall") put(d, "foot", { total: num(r[idx(/^total footfall$/i)]), orders: num(r[idx(/^total orders$/i)]), male: num(r[idx(/male/i)]), female: num(r[idx(/female/i)]), seniors: num(r[idx(/^seniors$/i)]), kids: num(r[idx(/^kids$/i)]) });
    else put(d, "pp", { orders: num(r[idx(/^total orders$/i)]), foot: num(r[idx(/^total footfall$/i)]), sale: num(r[idx(/^total sale$/i)]), weight: num(r[idx(/^total weight$/i)]), targetW: num(r[idx(/^total target weight$/i)]), cal: num(r[idx(/^total calorie$/i)]), targetC: num(r[idx(/^total target calorie$/i)]) });
  });
  return { days, meta, from: ds[0] || null, to: ds[ds.length - 1] || null, rows: body.length };
}

export async function importText(name, text, by) {
  const rows = parseCSV(text);
  if (rows.length < 2) throw new Error("Empty file");
  const type = detect(rows[0]);
  if (!type) throw new Error("Unknown report — upload POS dish / category / space / space type / footfall / per-person report");
  const out = toDaily(type, rows);
  // din-wise: sirf is report wala hissa badlo
  const ops = Object.entries(out.days).map(([d, parts]) => ({
    updateOne: { filter: { _id: d }, update: { $set: { ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [`data.${k}`, v])), at: new Date() } }, upsert: true },
  }));
  if (ops.length) await PosDaily.bulkWrite(ops, { ordered: false });
  const id = crypto.createHash("sha1").update(type + "|" + text).digest("hex").slice(0, 24);
  await PosFile.updateOne(
    { _id: id },
    { $set: { name: String(name || "").slice(0, 120), type, from: out.from, to: out.to, rows: out.rows, text: String(text).slice(0, 3_000_000), by: String(by || "").slice(0, 60), at: new Date(), meta: out.meta } },
    { upsert: true }
  );
  return { type, from: out.from, to: out.to, rows: out.rows, days: ops.length };
}

// POS ke apne JSON API (My Hotel Sense /api/reports/*) se aaya data → wahi din-wise hisse. Hotel PC ka sync program bhejta hai.
export async function importSync(reports, by) {
  const days = {}, metas = {};
  const put = (d, part, k, v) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return; ((days[d] ||= {})[part] ||= {}); if (k != null) days[d][part][k] = v; };
  const n = (v) => Number(v) || 0;
  const list = (x) => (x && typeof x === "object" ? Object.values(x) : []);
  const named = { dish: ["dish", "dish_name"], category: ["cat", "category_name"], space: ["space", "space_name"], spacetype: ["stype", "space_type_name"] };
  for (const [type, [part, nk]] of Object.entries(named)) {
    const data = reports[type];
    if (!data) continue;
    // range ke har din ka hissa khaali se shuru (us din kuch na bika ho to purana na bache)
    (reports.dates || []).forEach((d) => { put(d, part); put(d, part + "Amt"); });
    const meta = {};
    list(data).forEach((r) => {
      const name = safeKey(r[nk]);
      if (!name) return;
      let q = 0, a = 0;
      Object.entries(r.daily_data || {}).forEach(([d, v]) => {
        const val = type === "dish" || type === "category" ? n(v.quantity) : n(v.orders);
        if (val) put(d, part, name, val);
        if (n(v.amount)) put(d, part + "Amt", name, n(v.amount));
        q += val; a += n(v.amount);
      });
      meta[name] = { qty: q, amt: a, ...(r.avg_tat != null ? { tat: n(r.avg_tat) } : {}) };
    });
    metas[type] = meta;
  }
  for (const [d, v] of Object.entries(reports.footfall || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    (days[d] ||= {}).foot = { total: n(v.total_footfall), orders: n(v.total_orders), male: n(v.adults_male), female: n(v.adults_female), seniors: n(v.adults_senior), kids: n(v.kids) };
  }
  for (const [d, v] of Object.entries(reports.perperson || {})) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) continue;
    (days[d] ||= {}).pp = { orders: n(v.total_orders), foot: n(v.total_footfall), sale: n(v.total_amount), weight: n(v.total_weight), targetW: n(v.total_target_weight), cal: n(v.total_energy), targetC: n(v.total_target_energy) };
  }
  const ops = Object.entries(days).map(([d, parts]) => ({
    updateOne: { filter: { _id: d }, update: { $set: { ...Object.fromEntries(Object.entries(parts).map(([k, v]) => [`data.${k}`, v])), at: new Date() } }, upsert: true },
  }));
  if (ops.length) await PosDaily.bulkWrite(ops, { ordered: false });
  const ds = Object.keys(days).sort(), from = ds[0] || null, to = ds[ds.length - 1] || null;
  // backup: har sync ki asli JSON + meta (type-wise, taaki daam / table ka samay naya rahe)
  const raw = JSON.stringify(reports).slice(0, 3_000_000);
  const stamp = new Date();
  await PosFile.updateOne({ _id: "sync-" + crypto.createHash("sha1").update(raw).digest("hex").slice(0, 19) }, { $set: { name: `POS auto-sync ${from}..${to}`, type: "sync", from, to, rows: ops.length, text: raw, by, at: stamp } }, { upsert: true });
  for (const [type, meta] of Object.entries(metas)) if (Object.keys(meta).length) await PosFile.updateOne({ _id: `syncmeta-${type}` }, { $set: { name: `POS auto-sync (${type})`, type, from, to, rows: Object.keys(meta).length, text: "", by, at: stamp, meta } }, { upsert: true });
  return { from, to, days: ops.length };
}
