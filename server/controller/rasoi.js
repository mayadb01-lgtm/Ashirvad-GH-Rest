// 🍳 Rasoi Board (kitchen board): aaj ki taiyari, team ke kaam, ordering, recipe book, rates.
// ⚠️ App ka asli data (Entry, RestEntry, OfficeBook …) yahan SIRF PADHA jaata hai (roz ka restaurant sale).
//    Board ka apna sab kuch naye, alag collections mein: kitchen_docs, kitchen_rate_history.
//    Board hatana ho to bas ye do collections aur ye route hatao — baaki system pehle jaisa.
//
// GET    /api/v1/rasoi/doc/<path>     → ek document (days/2026-10-22, settings/main, stock/main, rates/main, ideas/<id>)
// PUT    /api/v1/rasoi/doc/<path>     → save (sabke liye)
// DELETE /api/v1/rasoi/doc/ideas/<id> → apna banaya idea hatao (sirf ideas)
// GET    /api/v1/rasoi/list/<days|ideas>
// GET    /api/v1/rasoi/board          → board ka page (recipes, rates) — sirf login ke baad, public file nahi
// GET    /api/v1/rasoi/sales          → roz ka restaurant sale (app + purane records), sirf padhna
// GET    /api/v1/rasoi/banquet?from=YYYY-MM-DD&to=YYYY-MM-DD → banquet booking ka menu (dish × gram × plate), sirf padhna.
//        Ye sirf kachche maal ki order list ke liye hai — restaurant ki bikri / forecast mein kabhi nahi juda.
// GET    /api/v1/rasoi/mandi          → Surat district APMC (Surat, Songadh …) ke aaj ke sabzi bhaav (sarkari Agmarknet / data.gov.in).
//        Server har 3 ghante mein naya laata hai aur kitchen_mandi mein itihaas rakhta hai (naya collection).
import { Router } from "express";
import mongoose from "mongoose";
import fs from "fs";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { loadDaily } from "./forecast.js";
import { PastDaily } from "../model/pastData.js";
import { BanquetBooking, BanquetItem } from "../model/banquet.js";
import { Candidate, candFields, ROLES, STATUSES } from "./jobs.js";
import { importText, PosDaily, PosFile } from "../rasoi/posImport.js";

const router = Router();
const BOARD_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "rasoi", "board.html");
let boardHtml = null;
router.get("/board", (req, res) => {
  try {
    boardHtml ||= fs.readFileSync(BOARD_FILE, "utf8");
    res.set("Cache-Control", "private, no-store").type("text/plain").send(boardHtml);
  } catch (e) {
    res.status(500).json({ success: false, message: "Board file missing" });
  }
});

const docSchema = new mongoose.Schema(
  { _id: String, col: String, data: mongoose.Schema.Types.Mixed, by: String, at: { type: Date, default: Date.now } },
  { versionKey: false }
);
const KitchenDoc = mongoose.models.KitchenDoc || mongoose.model("KitchenDoc", docSchema, "kitchen_docs");
const rateSchema = new mongoose.Schema(
  { code: String, rate: Number, prev: Number, validFrom: { type: Date, default: Date.now }, by: String, source: { type: String, default: "manual" } },
  { versionKey: false }
);
const RateHistory = mongoose.models.KitchenRateHistory || mongoose.model("KitchenRateHistory", rateSchema, "kitchen_rate_history");

const PATH_RE = /^(days\/\d{4}-\d{2}-\d{2}|settings\/main|hiring\/main|stock\/main|rates\/main|bqmap\/main|ideas\/[A-Za-z0-9_-]{1,40})$/;
const who = (u) => String(u?.name || u?.email || "").slice(0, 60);
const pathOf = (req) => decodeURIComponent(req.params[0] || "").replace(/^\/+|\/+$/g, "");

router.get(/^\/doc\/(.+)$/, async (req, res) => {
  const p = pathOf(req);
  if (!PATH_RE.test(p)) return res.status(400).json({ success: false, message: "Bad path" });
  try {
    const d = await KitchenDoc.findById(p).lean();
    res.json({ success: true, exists: !!d, data: d ? d.data : null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put(/^\/doc\/(.+)$/, async (req, res) => {
  const p = pathOf(req);
  if (!PATH_RE.test(p)) return res.status(400).json({ success: false, message: "Bad path" });
  const data = req.body?.data;
  if (!data || typeof data !== "object" || Array.isArray(data)) return res.status(400).json({ success: false, message: "Bad data" });
  if (JSON.stringify(data).length > 400000) return res.status(413).json({ success: false, message: "Too large" });
  try {
    // Rate badla → itihaas mein likho (kaun, kab, pehle kitna)
    if (p === "rates/main") {
      const prevDoc = (await KitchenDoc.findById(p).lean())?.data || {};
      const old = prevDoc.items || {};
      // Board sirf badle hue rate bhejta hai (changed) - bill se aaye naye rate purane board se mitte nahi
      if (Array.isArray(data.changed)) {
        const items = { ...old }, src = { ...(prevDoc.src || {}) };
        for (const k of data.changed.map(String).slice(0, 500)) {
          if (data.items?.[k] == null) delete items[k]; else items[k] = Number(data.items[k]);
          delete src[k];
        }
        data.items = items; data.src = src; delete data.changed;
      } else if (prevDoc.src && !data.src) data.src = prevDoc.src;
      const now = data.items || {};
      const rows = Object.keys({ ...old, ...now })
        .filter((k) => Number(old[k]) !== Number(now[k]))
        .map((k) => ({ code: k, rate: now[k] == null ? null : Number(now[k]), prev: old[k] == null ? null : Number(old[k]), by: who(req.user) }));
      if (rows.length) await RateHistory.insertMany(rows);
    }
    await KitchenDoc.updateOne({ _id: p }, { $set: { col: p.split("/")[0], data, by: who(req.user), at: new Date() } }, { upsert: true });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.delete(/^\/doc\/(ideas\/[A-Za-z0-9_-]{1,40})$/, async (req, res) => {
  try {
    await KitchenDoc.deleteOne({ _id: req.params[0] });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/list/:col(days|ideas)", async (req, res) => {
  try {
    const q = { col: req.params.col };
    // din: sirf pichhle 120 din (board ko bas itna chahiye)
    if (req.params.col === "days") {
      const from = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10);
      q._id = { $gte: `days/${from}` };
    }
    const rows = await KitchenDoc.find(q).lean();
    res.json({ success: true, docs: rows.map((r) => ({ id: r._id.split("/")[1], data: r.data })) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Roz ka restaurant sale (₹): app ka apna aankda pehle; jis din app mein nahi, wahan purana record (Tally)
router.get("/sales", async (req, res) => {
  try {
    const [{ D }, past] = await Promise.all([loadDaily(), PastDaily.find({}, { _id: 0, date: 1, restaurant: 1 }).lean().catch(() => [])]);
    const sales = {};
    (past || []).forEach((p) => {
      const v = Number(p.restaurant);
      if (p.date && v >= 1000) sales[p.date] = Math.round(v);
    });
    Object.keys(D).forEach((k) => {
      if (D[k].rest != null) sales[k] = Math.round(D[k].rest);
    });
    res.json({ success: true, sales });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Banquet: booking ka menu → har dish ka kul kg / litre / pc (cancel wali booking nahi). Grahak ka naam / mobile nahi bhejte.
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
router.get("/banquet", async (req, res) => {
  try {
    const from = String(req.query.from || ""), to = String(req.query.to || "");
    if (!ISO_RE.test(from) || !ISO_RE.test(to) || to < from) return res.status(400).json({ success: false, message: "Bad dates" });
    const a = new Date(from + "T00:00:00+05:30"), b = new Date(to + "T23:59:59+05:30");
    if ((b - a) / 864e5 > 100) return res.status(400).json({ success: false, message: "Range too long" });
    const [list, items] = await Promise.all([
      BanquetBooking.find({ status: { $ne: "cancelled" }, eventCreateDate: { $gte: new Date(a - 864e5), $lte: new Date(+b + 864e5) } }, { customer: 0, payments: 0 }).lean(),
      BanquetItem.find({}, { name: 1, unit: 1, category: 1 }).lean(),
    ]);
    const unitOf = Object.fromEntries(items.map((x) => [String(x._id), x.unit || "kg"]));
    const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
    const out = [];
    list.forEach((bk) => {
      const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(bk.eventDate || "");
      if (!m) return;
      const date = `${m[3]}-${m[2]}-${m[1]}`;
      if (date < from || date > to) return;
      const lines = {};
      (bk.menus || []).forEach((mn) => {
        const plates = n(mn.plates);
        const flat = [...(mn.items || []), ...(mn.choices || []).flatMap((c) => (c.items || []).map((x) => ({ ...x, grams: c.grams })))];
        flat.forEach((x) => {
          const key = x.itemId || x.name;
          const l = (lines[key] ||= { key, name: x.name, category: x.category || "", unit: unitOf[x.itemId] || "kg", qty: 0 });
          l.qty += (n(x.grams) * plates) / (l.unit === "pc" ? 1 : 1000); // kg / litre / pc
        });
      });
      out.push({
        id: String(bk._id), no: bk.bookingNo, date, slot: bk.slot || "", occasion: bk.occasion || "", status: bk.status,
        plates: (bk.menus || []).reduce((t, mn) => t + n(mn.plates), 0) || n(bk.guests),
        menus: (bk.menus || []).map((mn) => `${mn.name} × ${n(mn.plates)}`),
        lines: Object.values(lines).map((l) => ({ ...l, qty: Math.round(l.qty * 1000) / 1000 })),
      });
    });
    out.sort((x, y) => (x.date + x.slot).localeCompare(y.date + y.slot));
    res.json({ success: true, data: out });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- Mandi bhaav (data.gov.in "Current Daily Price of Various Commodities from Various Markets (Mandi)") ----------
const mandiSchema = new mongoose.Schema(
  { _id: String, date: String, scope: String, market: String, district: String, commodity: String, variety: String, grade: String, min: Number, max: Number, modal: Number, at: { type: Date, default: Date.now } },
  { versionKey: false }
);
const Mandi = mongoose.models.KitchenMandi || mongoose.model("KitchenMandi", mandiSchema, "kitchen_mandi");
const MANDI_RES = "9ef84268-d588-465a-a308-a864a43d0070";
const SAMPLE_KEY = "579b464db66ec23bdd000001cdd3946e44ce4aad7209ff7b23ac571b"; // data.gov.in ki public sample key (apni key: env DATAGOV_KEY)
let mandiAt = 0, mandiBusy = null, keyCache = null;
// Apni data.gov.in key: env DATAGOV_KEY, warna malik ne Manager se jo save ki (kabhi wapas nahi bheji jaati), warna public sample key
async function apiKey() {
  if (process.env.DATAGOV_KEY) return process.env.DATAGOV_KEY;
  if (keyCache === null) keyCache = (await KitchenDoc.findById("secret/datagov").lean().catch(() => null))?.data?.key || "";
  return keyCache || SAMPLE_KEY;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
class RateLimited extends Error {}
const dmyIso = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || "")); return m ? `${m[3]}-${m[2]}-${m[1]}` : null; };
async function pullMandi() {
  const key = await apiKey();
  let off = 0, total = Infinity, pages = 0; const ops = [];
  while (off < total && pages < 40) {
    const url = `https://api.data.gov.in/resource/${MANDI_RES}?api-key=${encodeURIComponent(key)}&format=json&limit=100&offset=${off}&filters%5Bstate.keyword%5D=Gujarat&filters%5Bdistrict%5D=Surat`;
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
    let j; try { const rs = await fetch(url, { signal: ctl.signal }); if (rs.status === 429) throw new RateLimited(); j = await rs.json(); } finally { clearTimeout(t); }
    const recs = j?.records || []; total = Number(j?.total) || 0; pages++;
    if (!recs.length) break;
    await sleep(800);
    recs.forEach((r) => {
      const date = dmyIso(r.arrival_date); if (!date) return;
      const id = [date, r.market, r.commodity, r.variety].join("|");
      ops.push({ updateOne: { filter: { _id: id }, update: { $set: { date, market: r.market, commodity: r.commodity, variety: r.variety || "", min: Number(r.min_price) || 0, max: Number(r.max_price) || 0, modal: Number(r.modal_price) || 0, at: new Date() } }, upsert: true } });
    });
    off += recs.length;
  }
  if (ops.length) await Mandi.bulkWrite(ops, { ordered: false });
  return ops.length;
}
// Kirana / masale / anaaj-dal: poore Gujarat ki APMC ke aaj ke thok bhaav (variety + grade = quality). Har 6 ghante, background mein.
const KIRANA_TERMS = ["Cummin Seed(Jeera)", "Coriander Seed", "Dry Chillies", "Ajwan", "Fennel", "Mustard", "Sesamum", "Turmeric",
  "Arhar (Tur/Red Gram)(Whole)", "Green Gram (Moong)(Whole)", "Black Gram (Urd Beans)(Whole)", "Bengal Gram(Gram)(Whole)", "Kabuli Chana",
  "Wheat", "Rice", "Bajra", "Groundnut", "Soyabean", "Methi Seeds"];
let kiranaAt = 0, kiranaBusy = null, lastLimit = null;
async function pullTerm(term, key, ops) {
  let off = 0, total = Infinity, pages = 0;
  while (off < total && pages < 12) {
    const url = `https://api.data.gov.in/resource/${MANDI_RES}?api-key=${encodeURIComponent(key)}&format=json&limit=100&offset=${off}&filters%5Bstate.keyword%5D=Gujarat&filters%5Bcommodity%5D=${encodeURIComponent(term)}`;
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 20000);
    let j; try { const rs = await fetch(url, { signal: ctl.signal }); if (rs.status === 429) throw new RateLimited(); j = await rs.json(); } catch (e) { if (e instanceof RateLimited) throw e; break; } finally { clearTimeout(t); }
    await sleep(800);
    const recs = j?.records || []; total = Number(j?.total) || 0; pages++;
    if (!recs.length) break;
    recs.forEach((r) => {
      const date = dmyIso(r.arrival_date); if (!date) return;
      const id = ["G", date, r.market, r.commodity, r.variety, r.grade].join("|");
      ops.push({ updateOne: { filter: { _id: id }, update: { $set: { date, scope: "gujarat", market: r.market, district: r.district || "", commodity: r.commodity, variety: r.variety || "", grade: r.grade || "", min: Number(r.min_price) || 0, max: Number(r.max_price) || 0, modal: Number(r.modal_price) || 0, at: new Date() } }, upsert: true } });
    });
    off += recs.length;
  }
}
async function pullKirana() {
  const key = await apiKey(); const ops = [];
  try { for (const term of KIRANA_TERMS) await pullTerm(term, key, ops); }
  finally { if (ops.length) await Mandi.bulkWrite(ops, { ordered: false }); }
  return ops.length;
}
// Din mein (8 se 23 baje IST) sabzi bhaav har ghante, warna 3 ghante purana chalega; masala-anaaj har 6 ghante
const istHour = () => (new Date().getUTCHours() + 5.5 + (new Date().getUTCMinutes() / 60)) % 24;
const mandiMaxAge = () => (istHour() >= 8 && istHour() < 23 ? 1 : 3) * 3600 * 1000;
function refreshMandi() {
  if (Date.now() - kiranaAt > 6 * 3600 * 1000 && !kiranaBusy) {
    kiranaAt = Date.now(); // background — jawab ke liye intezaar nahi
    kiranaBusy = pullKirana().catch((e) => { kiranaAt = Date.now() - (e instanceof RateLimited ? 5 : 5.5) * 3600 * 1000; lastLimit = e instanceof RateLimited ? new Date() : lastLimit; }).finally(() => { kiranaBusy = null; });
  }
  if (Date.now() - mandiAt > mandiMaxAge()) {
    mandiBusy ||= pullMandi().then(() => { mandiAt = Date.now(); }).catch((e) => { if (e instanceof RateLimited) { lastLimit = new Date(); mandiAt = Date.now() - mandiMaxAge() + 3600 * 1000; } }).finally(() => { mandiBusy = null; });
  }
  return mandiBusy;
}
// Koi Manager na khole tab bhi apne aap (server chalu hote hi, phir har 20 min jaanch)
setTimeout(() => { refreshMandi(); setInterval(() => { try { refreshMandi(); } catch {} }, 20 * 60 * 1000).unref?.(); }, 60 * 1000).unref?.();
router.get("/mandi", async (req, res) => {
  try {
    const busy = refreshMandi();
    if (busy) await Promise.race([busy, new Promise((r) => setTimeout(r, 15000))]);
    const since = new Date(Date.now() - 10 * 864e5).toISOString().slice(0, 10);
    const rows = await Mandi.find({ date: { $gte: since } }, { _id: 0, at: 0 }).sort({ date: -1 }).lean();
    // har market + commodity ka sabse naya din
    const seen = new Set(), latest = [];
    rows.forEach((r) => { const k = (r.scope || "surat") + "|" + r.market + "|" + r.commodity + "|" + r.variety + "|" + (r.grade || ""); if (seen.has(k)) return; seen.add(k); latest.push({ ...r, min: r.min / 100, max: r.max / 100, modal: r.modal / 100 }); });
    const surat = latest.filter((r) => r.scope !== "gujarat"), gujarat = latest.filter((r) => r.scope === "gujarat");
    res.json({ success: true, source: "Agmarknet (data.gov.in)", unit: "₹/kg", fetchedAt: mandiAt ? new Date(mandiAt) : null, kiranaBusy: !!kiranaBusy, ownKey: !!(process.env.DATAGOV_KEY || keyCache), rateLimitedAt: lastLimit, rows: surat, kirana: gujarat });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Malik apni data.gov.in key save kare (sirf Super Admin; key kabhi wapas nahi bheji jaati)
router.post("/datagov-key", async (req, res) => {
  try {
    const u = req.user;
    if (!(u?.constructor?.modelName === "Admin" && u.viewOnly !== true)) return res.status(403).json({ success: false, message: "Only the owner can set this." });
    const key = String(req.body?.key || "").trim();
    if (key && !/^[A-Za-z0-9]{20,80}$/.test(key)) return res.status(400).json({ success: false, message: "This does not look like a data.gov.in API key." });
    await KitchenDoc.updateOne({ _id: "secret/datagov" }, { $set: { col: "secret", data: { key }, by: who(u), at: new Date() } }, { upsert: true });
    keyCache = key; mandiAt = 0; kiranaAt = 0;
    res.json({ success: true, set: !!key });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Asli kharcha (din ki entry ke Expenses se): sirf maal / utility ke naam aur rakam, staff-personal nahi. Sirf padhta hai.
router.get("/spend", async (req, res) => {
  try {
    const now = new Date(), d30 = new Date(now - 30 * 864e5), d365 = new Date(now - 365 * 864e5);
    const rows = await mongoose.connection.db.collection("restentries").aggregate([
      { $match: { entryCreateDate: { $gte: d365 } } },
      { $unwind: "$expenses" },
      { $match: { "expenses.categoryName": { $in: ["Food & Beverages", "Utility"] } } },
      { $group: { _id: { c: "$expenses.categoryName", n: { $trim: { input: { $toLower: "$expenses.expenseName" } } } },
        name: { $first: "$expenses.expenseName" }, y: { $sum: "$expenses.amount" }, ny: { $sum: 1 },
        m: { $sum: { $cond: [{ $gte: ["$entryCreateDate", d30] }, "$expenses.amount", 0] } },
        nm: { $sum: { $cond: [{ $gte: ["$entryCreateDate", d30] }, 1, 0] } } } },
      { $sort: { y: -1 } }, { $limit: 80 },
    ]).toArray();
    // Packing ka maal (Krishna Plastik) Office Book se bhi aata hai
    const pk = {}; const PK = /kris?h?na\s*p(a)?l?a?st|krishna pal/i;
    for await (const d of mongoose.connection.db.collection("officebooks").find({ entryCreateDate: { $gte: d365 } }, { projection: { officeOut: 1, entryCreateDate: 1 } }))
      for (const e of d.officeOut || []) if (PK.test(e.fullname || "")) { const m = d.entryCreateDate.toISOString().slice(0, 7); pk[m] = (pk[m] || 0) + (Number(e.amount) || 0); }
    res.json({ success: true, packOffice: Object.entries(pk).sort().map(([month, amount]) => ({ month, amount: Math.round(amount) })), rows: rows.map((r) => ({ cat: r._id.c, name: String(r.name || "").trim(), year: Math.round(r.y), yearTimes: r.ny, month: Math.round(r.m), monthTimes: r.nm })) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- POS report (My Hotel Sense CSV) → din-wise + file backup ----------
router.put("/pos/upload", async (req, res) => {
  try {
    const { name, text } = req.body || {};
    if (!text || String(text).length > 3_000_000) return res.status(400).json({ success: false, message: "File missing or too big" });
    const r = await importText(name, text, who(req.user));
    res.json({ success: true, ...r });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});
// Malik: hotel PC ke sync program ki key banao (ek baar dikhegi; server par sirf hash)
router.put("/pos/key", async (req, res) => {
  try {
    const u = req.user;
    if (!(u?.constructor?.modelName === "Admin" && u.viewOnly !== true)) return res.status(403).json({ success: false, message: "Only the owner can do this." });
    const key = crypto.randomBytes(18).toString("base64url");
    await KitchenDoc.updateOne({ _id: "secret/possync" }, { $set: { col: "secret", data: { hash: crypto.createHash("sha256").update(key).digest("hex"), last4: key.slice(-4), at: new Date() }, by: who(u), at: new Date() } }, { upsert: true });
    res.json({ success: true, key });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.get("/pos/summary", async (req, res) => {
  try {
    const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || "") ? req.query.to : "9999-12-31";
    const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || "") ? req.query.from : new Date(Date.now() - 400 * 864e5).toISOString().slice(0, 10);
    const [days, files] = await Promise.all([
      PosDaily.find({ _id: { $gte: from, $lte: to } }).sort({ _id: 1 }).lean(),
      PosFile.find({}, { text: 0 }).sort({ at: -1 }).limit(60).lean(),
    ]);
    const metaByType = {};
    files.forEach((f) => { if (!metaByType[f.type] && f.meta && Object.keys(f.meta).length) metaByType[f.type] = f.meta; });
    const sk = (await KitchenDoc.findById("secret/possync").lean())?.data;
    const sync = sk ? { set: !!sk.hash, last4: sk.last4, keyAt: sk.at, last: sk.lastSync || null } : { set: false };
    res.set("Cache-Control", "no-store").json({ success: true, sync, days: days.map((d) => ({ d: d._id, ...d.data })), files: files.map((f) => ({ name: f.name, type: f.type, from: f.from, to: f.to, rows: f.rows, at: f.at, by: f.by })), dishMeta: metaByType.dish || {}, metaByType });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ---------- Staff bharti: candidate list (sirf Manager login) ----------
router.get("/hiring", async (req, res) => {
  try {
    const rows = await Candidate.find({ at: { $gte: new Date(Date.now() - 365 * 864e5) } }).sort({ updatedAt: -1 }).limit(1000).lean();
    res.set("Cache-Control", "no-store").json({ success: true, rows: rows.map((r) => ({ ...r, id: String(r._id), _id: undefined })), roles: ROLES, statuses: STATUSES });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.put("/hiring/add", async (req, res) => {
  try {
    const f = candFields(req.body || {});
    if (f.name.length < 2 || !/^\d{10}$/.test(f.phone)) return res.status(400).json({ success: false, message: "Name and 10-digit mobile are required" });
    const old = await Candidate.findOne({ phone: f.phone });
    if (old) return res.status(409).json({ success: false, message: `Already in the list: ${old.name}` });
    const c = await Candidate.create({ ...f, source: f.referredBy ? "referral" : "manual", by: who(req.user) });
    res.json({ success: true, id: String(c._id) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.put("/hiring/:id([a-f0-9]{24})", async (req, res) => {
  try {
    const b = req.body || {}, set = { updatedAt: new Date(), by: who(req.user) };
    if (b.status != null) { if (!STATUSES.includes(b.status)) return res.status(400).json({ success: false, message: "Bad status" }); set.status = b.status; }
    if (b.notes != null) set.notes = String(b.notes).slice(0, 500);
    if (b.interviewAt != null) set.interviewAt = String(b.interviewAt).slice(0, 20);
    const r = await Candidate.updateOne({ _id: req.params.id }, { $set: set });
    if (!r.matchedCount) return res.status(404).json({ success: false, message: "Not found" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});
router.delete("/hiring/:id([a-f0-9]{24})", async (req, res) => {
  try {
    await Candidate.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Purchase bill save hone par: catalogue wale saamaan ki Manager dar = bill ki dar (unit badal kar)
const CAT = (() => { try { return JSON.parse(fs.readFileSync(path.join(path.dirname(BOARD_FILE), "items.json"), "utf8")); } catch { return []; } })();
const CATK = Object.fromEntries(CAT.map((x) => [x.key, x]));
export const catalogItems = () => CAT;
const CONV = { kg: { kg: 1, g: 1000 }, L: { ltr: 1, ml: 1000 }, pc: { pcs: 1, dozen: 1 / 12 }, g: { g: 1, kg: 1 / 1000 } };
export async function applyBillRates(bill, user) {
  try {
    const its = (bill.items || []).filter((x) => x.key && CATK[x.key] && Number(x.rate) > 0);
    if (!its.length) return 0;
    const doc = (await KitchenDoc.findById("rates/main").lean())?.data || {};
    const items = { ...(doc.items || {}) }, src = { ...(doc.src || {}) }, hist = [];
    for (const x of its) {
      const f = CONV[CATK[x.key].iu]?.[x.unit];
      if (!f) continue;
      const r = Math.round(Number(x.rate) * f * 100) / 100;
      if (Number(items[x.key]) !== r) hist.push({ code: x.key, rate: r, prev: items[x.key] == null ? null : Number(items[x.key]), by: who(user), source: "bill" });
      items[x.key] = r;
      src[x.key] = { vendor: String(bill.vendor?.name || bill.vendor?.expenseName || "").slice(0, 60), date: bill.date, billNo: String(bill.billNo || "").slice(0, 30), unit: x.unit, rate: Number(x.rate) };
    }
    if (hist.length) await RateHistory.insertMany(hist);
    await KitchenDoc.updateOne({ _id: "rates/main" }, { $set: { col: "rates", data: { ...doc, items, src, updatedAt: new Date().toISOString() }, by: who(user), at: new Date() } }, { upsert: true });
    return hist.length;
  } catch (e) {
    console.warn("applyBillRates", e.message);
    return 0;
  }
}

export default router;
