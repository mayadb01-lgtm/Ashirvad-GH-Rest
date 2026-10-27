// 📈 Naye graphs (GH, Restaurant, Merged) aur Sales Goals ke liye ek hi data API.
// GET  /api/v1/biz/daily?from=YYYY-MM-DD&to=YYYY-MM-DD  → roz ka hisaab (is range ka + pichhle saal ki same dates)
// GET  /api/v1/biz/goals?year=2026                      → har business ke 12 mahine ke goals
// PUT  /api/v1/biz/goals                                 → goals save (sirf naya "bizgoals" collection)
// ⚠️ daily route READ-ONLY. App ki entries ko kabhi nahi badalta. Sirf Admin / Super User.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { Schema, model } from "mongoose";
import { isAuthenticated } from "../middleware/auth.js";
import Entry from "../model/entry.js";
import Room from "../model/room.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import { headKey, headLabel } from "../utils/expenseHeads.js";
import { loadPast } from "../utils/pastData.js";
import { payParts } from "../utils/payParts.js";

dayjs.extend(customParseFormat);
const router = Router();
router.use(isAuthenticated, (req, res, next) => {
  if (req.user?.role === "Admin" || req.user?.isSuperUser) return next();
  if (req.reportOk && req.method === "GET") return next(); // malik ne yeh report di hai (staffGuard)
  return res.status(403).json({ success: false, message: "Owner/Admin only" });
});

const F = "DD-MM-YYYY";
const ISO = "YYYY-MM-DD";
const SOLD = ["day", "night", "extraDay", "extraNight"];
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const IST_MS = 330 * 60 * 1000;
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10));
export const BUSINESSES = ["gh", "rest", "banquet", "bakery", "moti"];
const OFFICE_BIZ = { Banquet: "banquet", "Bakery Baada": "bakery", "Moti baada": "moti" };

// ── Goals (naya collection) ──
const goalSchema = new Schema(
  {
    business: { type: String, required: true, enum: BUSINESSES },
    year: { type: Number, required: true, min: 2020, max: 2100 },
    monthly: { type: [Number], default: () => Array(12).fill(0), validate: (a) => Array.isArray(a) && a.length === 12 },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);
goalSchema.index({ business: 1, year: 1 }, { unique: true });
const BizGoal = model("BizGoal", goalSchema);

// Ek din ka khaali dabba
const blank = () => ({
  gh: { rev: 0, rooms: 0, stays: 0, dayStays: 0, nightStays: 0, people: 0, unpaid: 0, mode: {}, type: {}, room: {}, has: false },
  rest: { sale: 0, cash: 0, card: 0, pp: 0, upad: 0, pending: 0, expenses: 0, exp: {}, upadBy: {}, has: false },
  office: { in: {}, out: {}, inTotal: 0, outTotal: 0, has: false },
  banquet: 0, bakery: 0, moti: 0,
});

const inRange = (iso, a, b) => iso >= a && iso <= b;

const build = async (ranges) => {
  const [gh, rest, office, rooms] = await Promise.all([
    Entry.find({}, { date: 1, entry: 1 }).lean(),
    RestEntry.find({}, { createDate: 1, totalCash: 1, totalCard: 1, totalPP: 1, totalUpad: 1, totalPending: 1, totalExpenses: 1, expenses: 1, upad: 1 }).lean(),
    OfficeBook.find({}, { createDate: 1, officeIn: 1, officeOut: 1 }).lean(),
    Room.countDocuments({}),
  ]);
  const want = (iso) => ranges.some(([a, b]) => inRange(iso, a, b));
  const D = {};
  const get = (iso) => (D[iso] ||= blank());
  gh.forEach((doc) => {
    const d = dayjs(doc.date, F, true);
    if (!d.isValid()) return;
    const iso = d.format(ISO);
    if (!want(iso)) return;
    const x = get(iso).gh;
    const list = doc.entry || [];
    const sold = list.filter((e) => SOLD.includes(e.period));
    if (sold.length) x.has = true;
    x.rooms += new Set(sold.map((e) => e.roomNo)).size;
    const seenRoom = new Set();
    sold.forEach((e) => {
      const r = n(e.rate);
      x.rev += r;
      x.stays += 1;
      if (e.period === "day" || e.period === "extraDay") x.dayStays += 1; else x.nightStays += 1;
      x.people += n(e.noOfPeople);
      const m = e.modeOfPayment || "Other";
      payParts(e).forEach((p) => (x.mode[p.mode || "Other"] = (x.mode[p.mode || "Other"] || 0) + p.amount));
      const t = e.type && e.type !== "Select" ? e.type : "Not set";
      x.type[t] = (x.type[t] || 0) + 1;
      const rk = String(e.roomNo);
      const ro = (x.room[rk] ||= { rev: 0, nights: 0 });
      ro.rev += r;
      if (!seenRoom.has(rk)) { seenRoom.add(rk); ro.nights += 1; }
      if (m === "UnPaid") x.unpaid += r;
    });
  });
  rest.forEach((doc) => {
    const d = dayjs(doc.createDate, F, true);
    if (!d.isValid()) return;
    const iso = d.format(ISO);
    if (!want(iso)) return;
    const x = get(iso).rest;
    const sale = n(doc.totalCash) + n(doc.totalCard) + n(doc.totalPP) + n(doc.totalUpad) + n(doc.totalPending) + n(doc.totalExpenses);
    if (sale < 1000) return; // test / adhoori entry
    x.has = true;
    x.sale += sale; x.cash += n(doc.totalCash); x.card += n(doc.totalCard); x.pp += n(doc.totalPP);
    x.upad += n(doc.totalUpad); x.pending += n(doc.totalPending); x.expenses += n(doc.totalExpenses);
    (doc.expenses || []).forEach((e) => {
      const k = headLabel(headKey(e.expenseName));
      const o = (x.exp[k] ||= { amount: 0, category: e.categoryName || "" });
      o.amount += n(e.amount);
    });
    (doc.upad || []).forEach((e) => {
      const k = String(e.fullname || "Not named").trim();
      x.upadBy[k] = (x.upadBy[k] || 0) + n(e.amount);
    });
  });
  office.forEach((doc) => {
    const d = dayjs(doc.createDate, F, true);
    if (!d.isValid()) return;
    const iso = d.format(ISO);
    if (!want(iso)) return;
    const day = get(iso);
    const x = day.office;
    x.has = true;
    (doc.officeIn || []).forEach((e) => {
      const c = e.categoryName || "Other";
      x.in[c] = (x.in[c] || 0) + n(e.amount);
      x.inTotal += n(e.amount);
      if (OFFICE_BIZ[c]) day[OFFICE_BIZ[c]] += n(e.amount);
    });
    (doc.officeOut || []).forEach((e) => {
      const c = e.categoryName || "Other";
      x.out[c] = (x.out[c] || 0) + n(e.amount);
      x.outTotal += n(e.amount);
    });
  });
  // 📚 Purane records (Tally): sirf jin dino app ka data nahi (sirf kamai; rooms / mode ki jaankari nahi)
  const P = await loadPast();
  Object.entries(P.days).forEach(([k, p]) => {
    if (!want(k)) return;
    const day = get(k);
    if (!day.rest.has && p.restaurant >= 1000) Object.assign(day.rest, { sale: p.restaurant, has: true, past: true });
    if (!day.gh.has && p.gh > 0) Object.assign(day.gh, { rev: p.gh, has: true, past: true });
    if (!day.office.has && p.banquet > 0) day.banquet += p.banquet;
  });
  return { D, nRooms: rooms || 16 };
};

const rowsFor = (D, a, b) => {
  const out = [];
  for (let d = dayjs(a); !d.isAfter(dayjs(b), "day"); d = d.add(1, "day")) {
    const iso = d.format(ISO);
    out.push({ date: iso, ...(D[iso] || blank()) });
  }
  return out;
};

router.get("/daily", async (req, res) => {
  try {
    const ok = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && dayjs(s, ISO, true).isValid();
    const today = todayIst();
    const to = ok(req.query.to) ? req.query.to : today.format(ISO);
    const from = ok(req.query.from) ? req.query.from : dayjs(to).subtract(29, "day").format(ISO);
    if (from > to) return res.status(400).json({ success: false, message: "from must be before to" });
    if (dayjs(to).diff(dayjs(from), "day") > 400) return res.status(400).json({ success: false, message: "Range too long (max ~13 months)" });
    const lyFrom = dayjs(from).subtract(1, "year").format(ISO), lyTo = dayjs(to).subtract(1, "year").format(ISO);
    const len = dayjs(to).diff(dayjs(from), "day") + 1;
    const ppTo = dayjs(from).subtract(1, "day").format(ISO), ppFrom = dayjs(from).subtract(len, "day").format(ISO);
    const { D, nRooms } = await build([[from, to], [lyFrom, lyTo], [ppFrom, ppTo]]);
    res.json({
      success: true,
      data: { from, to, today: today.format(ISO), nRooms, days: rowsFor(D, from, to), lastYear: rowsFor(D, lyFrom, lyTo), prevPeriod: rowsFor(D, ppFrom, ppTo) },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/goals", async (req, res) => {
  try {
    const year = Number(req.query.year) || todayIst().year();
    const docs = await BizGoal.find({ year }).lean();
    const goals = Object.fromEntries(BUSINESSES.map((b) => [b, (docs.find((d) => d.business === b)?.monthly || Array(12).fill(0)).map(n)]));
    const updated = docs.reduce((a, d) => (!a || d.updatedAt > a ? d.updatedAt : a), null);
    res.json({ success: true, data: { year, goals, updatedAt: updated } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.put("/goals", async (req, res) => {
  try {
    const { year, goals } = req.body || {};
    const y = Number(year);
    if (!(y >= 2020 && y <= 2100)) return res.status(400).json({ success: false, message: "year required" });
    if (!goals || typeof goals !== "object") return res.status(400).json({ success: false, message: "goals required" });
    const saved = [];
    for (const b of BUSINESSES) {
      const m = goals[b];
      if (!Array.isArray(m) || m.length !== 12) continue;
      const monthly = m.map((v) => Math.max(0, Math.round(n(v))));
      await BizGoal.updateOne({ business: b, year: y }, { $set: { monthly, updatedBy: req.user?.email || req.user?.name || "" } }, { upsert: true });
      saved.push(b);
    }
    res.json({ success: true, data: { year: y, saved } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
