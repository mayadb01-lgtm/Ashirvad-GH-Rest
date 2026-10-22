// 🏨🏨 Group dashboard: apne hotel + doosre hotel(on) ka summary ek jagah (sirf malik ke liye).
// ⚠️ READ-ONLY: sirf padhta hai. Har hotel ka data apne hi database mein rehta hai — yahan sirf totals aate hain.
//
// GET /api/v1/group/summary    → is hotel ka summary. Doosra hotel (server) "x-group-key" header ke saath maangta hai.
//                                Key server ki env file mein: GROUP_KEY=...   (login nahi, sirf ye key; isme naam / guest / password kuch nahi)
// GET /api/v1/group/dashboard  → Super Admin: apna + GROUP_REMOTES wale hotels ka summary
//                                env: GROUP_REMOTES=Naam|http://server:port|key ; doosra|...|...
import { Router } from "express";
import crypto from "crypto";
import dayjs from "dayjs";
import process from "process";
import { loadDaily } from "./forecast.js";
import performance from "./performance.js";
import { isAdminLike } from "../middleware/staffAccess.js";

const router = Router();
const IST_MS = 330 * 60 * 1000;
const ISO = "YYYY-MM-DD";
const fin = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const r0 = (v) => Math.round(fin(v));
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10));
const myName = () => process.env.GROUP_NAME || process.env.VITE_REACT_APP_BUSINESS_NAME || "This hotel";

// Performance page wala hisaab hi (mahine + kharch) — dobara likhne ki zaroorat nahi
const perfData = () =>
  new Promise((resolve, reject) => {
    const layer = performance.stack.find((l) => l.route?.path === "/" && l.route.methods.get);
    const h = layer.route.stack[layer.route.stack.length - 1].handle;
    h({ query: {}, params: {}, user: { role: "Admin" } }, { status() { return this; }, json(o) { return o.success ? resolve(o.data) : reject(new Error(o.message || "performance failed")); } });
  });

let cache = { at: 0, v: null };
const buildSummary = async () => {
  if (cache.v && Date.now() - cache.at < 60000) return cache.v;
  const [perf, { D, nRooms }] = await Promise.all([perfData(), loadDaily()]);
  const today = todayIst();
  const t = today.format(ISO), y = today.subtract(1, "day").format(ISO), ym = today.format("YYYY-MM");
  const day = (k) => {
    const x = D[k] || {};
    return { gh: r0(x.hasGh ? x.rev : 0), rooms: x.hasGh ? x.occ : 0, rest: r0(x.rest ?? 0), banquet: r0(x.banquet), hasData: !!(x.hasGh || x.rest != null || x.hasOff) };
  };
  // is mahine ab tak (Performance mein chalu mahina nahi hota)
  const mtd = { gh: 0, roomNights: 0, rest: 0, banquet: 0, days: 0 };
  Object.keys(D).filter((k) => k.startsWith(ym) && k <= t).forEach((k) => {
    const d = day(k);
    mtd.gh += d.gh; mtd.roomNights += d.rooms; mtd.rest += d.rest; mtd.banquet += d.banquet;
    if (d.hasData) mtd.days++;
  });
  // mahine-war kharch (Performance wale books)
  const exp = {};
  (perf.expenses || []).forEach((e) => {
    const k = e.month || `${e.year}-${String(e.m).padStart(2, "0")}`;
    const x = (exp[k] ||= { restaurant: 0, office: 0, upad: 0, personal: 0, investment: 0 });
    if (e.book in x) x[e.book] += fin(e.amount);
  });
  const months = (perf.months || []).map((m) => {
    const e = exp[m.month] || {};
    const kharch = fin(e.restaurant) + fin(e.office) + fin(e.upad);
    const sale = fin(m.gh_revenue) + fin(m.restaurant) + fin(m.banquet);
    return {
      month: m.month, gh: r0(m.gh_revenue), rest: r0(m.restaurant), banquet: r0(m.banquet), sale: r0(sale),
      roomNights: m.room_nights || 0, occupancy: m.occupancy ?? null, avgRate: m.avg_rate ?? null,
      restKharch: r0(e.restaurant), kharch: r0(kharch), source: m.source,
    };
  });
  const v = {
    name: myName(), nRooms, today: t,
    todayFig: day(t), yesterday: day(y),
    mtd: { ...mtd, gh: r0(mtd.gh), rest: r0(mtd.rest), banquet: r0(mtd.banquet), sale: r0(mtd.gh + mtd.rest + mtd.banquet), occupancy: mtd.days ? mtd.roomNights / (nRooms * today.date()) : null },
    months,
    updatedAt: new Date().toISOString(),
  };
  cache = { at: Date.now(), v };
  return v;
};

const sameKey = (a, b) => {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length > 0 && x.length === y.length && crypto.timingSafeEqual(x, y);
};

// Doosre hotel ka server yahan aata hai (login nahi, sirf GROUP_KEY)
router.get("/summary", async (req, res) => {
  try {
    const key = process.env.GROUP_KEY;
    if (!key || key.length < 24) return res.status(404).json({ success: false, message: "Not found" });
    if (!sameKey(req.headers["x-group-key"], key)) return res.status(403).json({ success: false, message: "Forbidden" });
    res.json({ success: true, data: await buildSummary() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

const remotes = () =>
  String(process.env.GROUP_REMOTES || "")
    .split(";")
    .map((s) => s.split("|").map((x) => x.trim()))
    .filter(([name, url, key]) => name && /^https?:\/\//.test(url || "") && key)
    .map(([name, url, key]) => ({ name, url: url.replace(/\/+$/, ""), key }));

// Super Admin: apna + baaki hotels
router.get("/dashboard", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Owner/Admin only" });
    const own = buildSummary().then((data) => ({ ok: true, data })).catch((e) => ({ ok: false, name: myName(), message: e.message }));
    const others = remotes().map(async (r) => {
      try {
        const ctl = new AbortController();
        const timer = setTimeout(() => ctl.abort(), 20000);
        const resp = await fetch(`${r.url}/api/v1/group/summary`, { headers: { "x-group-key": r.key }, signal: ctl.signal });
        clearTimeout(timer);
        const j = await resp.json().catch(() => ({}));
        if (!resp.ok || !j.success) return { ok: false, name: r.name, message: j.message || `HTTP ${resp.status}` };
        return { ok: true, data: { ...j.data, name: r.name || j.data.name } };
      } catch (e) {
        return { ok: false, name: r.name, message: e.name === "AbortError" ? "Server did not answer in time" : e.message };
      }
    });
    const hotels = await Promise.all([own, ...others]);
    res.json({ success: true, data: { hotels, connected: remotes().length } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
