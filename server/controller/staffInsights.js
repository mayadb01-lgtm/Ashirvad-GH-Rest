// 👥 Staff performance: din-wise hazri (machine file se), advance, salary sheet, restaurant ki bikri → ranking.
// ⚠️ Purana data sirf PADHA jata hai (RestStaff, RestEntry, OfficeBook, StaffSalary).
//    Naya data sirf "kitchen_staff_days" (din-wise hazri) aur kitchen_docs "staff/meta" (role, shift, zaroorat) mein.
import { Router } from "express";
import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { isAuthenticated } from "../middleware/auth.js";
import RestStaff from "../model/restStaff.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import StaffSalary from "../model/staffSalary.js";

dayjs.extend(customParseFormat);
const router = Router();
const ISO = "YYYY-MM-DD";
const STATUSES = ["P", "A", "H", "L", "WO"]; // Present, Absent, Half day, Leave (bata ke), Week off
const okIso = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || "")) && dayjs(s, ISO, true).isValid();
const okTime = (s) => s === "" || /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s));
const days = () => mongoose.connection.db.collection("kitchen_staff_days");
const docs = () => mongoose.connection.db.collection("kitchen_docs");
const isOwner = (u) => u?.constructor?.modelName === "Admin" && u.viewOnly !== true;
const fail = (res, e) => res.status(500).json({ success: false, message: e.message });
const bad = (res, m, c = 400) => res.status(c).json({ success: false, message: m });

router.use(isAuthenticated, (req, res, next) => {
  const u = req.user;
  if (u?.constructor?.modelName === "Admin" || u?.role === "Admin" || u?.isSuperUser) return next();
  if (req.reportOk === "staff-insights" && req.method === "GET") return next(); // malik ne yeh report di hai
  return bad(res, "Owner/Admin only", 403);
});

const DEFAULT_META = { roles: {}, shift: {}, need: {}, weights: { att: 40, peak: 30, punct: 15, adv: 15 } };
const loadMeta = async () => {
  const d = await docs().findOne({ _id: "staff/meta" });
  return { ...DEFAULT_META, ...(d?.data || {}) };
};

// GET /staff-insights?from=YYYY-MM-DD&to=YYYY-MM-DD → sab kuch ek saath (hisaab browser mein)
router.get("/", async (req, res) => {
  try {
    const today = dayjs(new Date(Date.now() + 330 * 60 * 1000).toISOString().slice(0, 10));
    const to = okIso(req.query.to) ? dayjs(req.query.to) : today;
    const from = okIso(req.query.from) ? dayjs(req.query.from) : to.subtract(89, "day");
    if (from.isAfter(to)) return bad(res, "from must be before to");
    if (to.diff(from, "day") > 800) return bad(res, "Range too long (max ~2 years)");
    // Bikri: chuni hui range + aaj tak ke pichhle 120 din (agle peak din ka andaza)
    const sFrom = dayjs(Math.min(from.valueOf(), today.subtract(120, "day").valueOf()));
    const sTo = dayjs(Math.max(to.valueOf(), today.valueOf()));
    const range = (a, b) => ({ entryCreateDate: { $gte: a.startOf("day").toDate(), $lte: b.endOf("day").toDate() } });

    const [staff, rest, office, sheets, dayRows, meta] = await Promise.all([
      RestStaff.find({}, { fullname: 1, category: 1, perDayPay: 1, staffStatus: 1, createdAt: 1, createDate: 1 }).lean(),
      RestEntry.find(range(sFrom, sTo), { entryCreateDate: 1, grandTotal: 1, "upad._id": 1, "upad.amount": 1 }).lean(),
      OfficeBook.find(range(from, to), { entryCreateDate: 1, "officeOut.categoryName": 1, "officeOut.fullname_id": 1, "officeOut.amount": 1 }).lean(),
      StaffSalary.find({ $or: [{ year: { $gt: from.year(), $lt: to.year() } }, { year: from.year(), month: { $gte: from.month() + 1 } }, { year: to.year(), month: { $lte: to.month() + 1 } }] }).lean(),
      days().find({ date: { $gte: from.format(ISO), $lte: to.format(ISO) } }, { projection: { _id: 0, s: 1, date: 1, st: 1, in: 1, out: 1 } }).toArray(),
      loadMeta(),
    ]);

    const sales = {}; // YYYY-MM-DD → restaurant grand total
    const adv = {}; // staffId → { "YYYY-MM": { rest, office } }
    const addAdv = (sid, m, k, a) => {
      if (!sid || !(Number(a) > 0)) return;
      ((adv[sid] ||= {})[m] ||= { rest: 0, office: 0 })[k] += Number(a);
    };
    const inRange = (d) => !d.isBefore(from, "day") && !d.isAfter(to, "day");
    rest.forEach((e) => {
      const d = dayjs(e.entryCreateDate);
      const k = d.format(ISO);
      sales[k] = (sales[k] || 0) + (Number(e.grandTotal) || 0);
      if (inRange(d)) (e.upad || []).forEach((u) => addAdv(String(u._id), d.format("YYYY-MM"), "rest", u.amount));
    });
    office.forEach((e) => {
      const m = dayjs(e.entryCreateDate).format("YYYY-MM");
      (e.officeOut || []).forEach((o) => /upad|upaad/i.test(o.categoryName || "") && addAdv(String(o.fullname_id || "").trim(), m, "office", o.amount));
    });
    const salary = {}; // staffId → { "YYYY-MM": { att, perDayPay, earned, paid } }
    sheets.forEach((sh) => {
      const m = `${sh.year}-${String(sh.month).padStart(2, "0")}`;
      if (m < from.format("YYYY-MM") || m > to.format("YYYY-MM")) return;
      (sh.rows || []).forEach((r) => {
        const sid = String(r.staffId);
        const att = Number(r.attendance) || 0;
        const pdp = Number(r.perDayPay) || 0;
        (salary[sid] ||= {})[m] = { att, perDayPay: pdp, earned: Math.round(att * pdp), paid: r.salaryPaid ? Number(r.salaryPaidAmount) || Math.round(att * pdp) : 0 };
      });
    });

    res.json({
      success: true,
      from: from.format(ISO),
      to: to.format(ISO),
      today: today.format(ISO),
      staff: staff.map((s) => ({ _id: String(s._id), name: s.fullname, category: s.category || "", perDayPay: s.perDayPay || 0, active: s.staffStatus !== "Inactive", since: s.createdAt || null })),
      days: dayRows,
      sales,
      adv,
      salary,
      meta,
    });
  } catch (e) {
    fail(res, e);
  }
});

// POST /staff-insights/days { rows: [{ s: staffId, date: YYYY-MM-DD, st, in, out }], file } → din-wise hazri (machine file) — sirf malik
router.post("/days", async (req, res) => {
  try {
    if (!isOwner(req.user)) return bad(res, "Only the owner can import attendance", 403);
    const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
    if (!rows.length) return bad(res, "Nothing to save");
    if (rows.length > 30000) return bad(res, "Too many rows in one file (max 30,000)");
    const ids = new Set((await RestStaff.find({}, { _id: 1 }).lean()).map((s) => String(s._id)));
    const file = String(req.body?.file || "").slice(0, 120);
    const ops = [];
    let skipped = 0;
    rows.forEach((r) => {
      const s = String(r?.s || "");
      const st = String(r?.st || "");
      const tin = String(r?.in || "");
      const tout = String(r?.out || "");
      if (!ids.has(s) || !okIso(r?.date) || !STATUSES.includes(st) || !okTime(tin) || !okTime(tout)) return skipped++;
      ops.push({
        updateOne: {
          filter: { _id: `${s}|${r.date}` },
          // "L" (bata ke chhutti) malik ne haath se lagayi ho to machine ka "A" usse na mitaye
          update: [{ $set: { s: { $literal: s }, date: { $literal: r.date }, in: { $literal: tin }, out: { $literal: tout }, file: { $literal: file }, at: "$$NOW", st: { $cond: [{ $and: [{ $eq: ["$st", "L"] }, { $eq: ["$manual", true] }, { $eq: [{ $literal: st }, "A"] }] }, "L", { $literal: st }] } } }],
          upsert: true,
        },
      });
    });
    for (let i = 0; i < ops.length; i += 2000) await days().bulkWrite(ops.slice(i, i + 2000), { ordered: false });
    res.json({ success: true, saved: ops.length, skipped, message: `${ops.length} days saved${skipped ? `, ${skipped} skipped` : ""}` });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /staff-insights/day { s, date, st } → ek din badlo (jaise "A" ko "L" = bata ke chhutti) — sirf malik
router.put("/day", async (req, res) => {
  try {
    if (!isOwner(req.user)) return bad(res, "Only the owner can change attendance", 403);
    const { s, date, st } = req.body || {};
    if (!okIso(date) || !STATUSES.includes(st)) return bad(res, "Invalid day");
    if (!(await RestStaff.exists({ _id: s }))) return bad(res, "Staff not found", 404);
    await days().updateOne({ _id: `${s}|${date}` }, { $set: { s: String(s), date, st, manual: true, by: req.user?.name || "owner", at: new Date() } }, { upsert: true });
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /staff-insights/meta { roles, shift, need, weights } → role, shift ka samay, har role ke kam se kam log, score ke weight — sirf malik
router.put("/meta", async (req, res) => {
  try {
    if (!isOwner(req.user)) return bad(res, "Only the owner can change this", 403);
    const b = req.body || {};
    const cur = await loadMeta();
    const clean = (o, f) => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {}).slice(0, 500).map(([k, v]) => [String(k).slice(0, 40).replace(/[.$]/g, "_"), f(v)]).filter(([, v]) => v !== undefined));
    const next = { ...cur };
    if (b.roles) next.roles = { ...cur.roles, ...clean(b.roles, (v) => String(v || "").trim().slice(0, 30)) };
    if (b.shift) next.shift = { ...cur.shift, ...clean(b.shift, (v) => (v && okTime(v.start || "") && okTime(v.end || "") ? { start: v.start || "", end: v.end || "" } : undefined)) };
    if (b.need) next.need = clean(b.need, (v) => Math.max(0, Math.min(50, Math.round(Number(v) || 0))));
    if (b.weights) {
      const w = clean(b.weights, (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0))));
      next.weights = { att: w.att ?? 40, peak: w.peak ?? 30, punct: w.punct ?? 15, adv: w.adv ?? 15 };
    }
    await docs().updateOne({ _id: "staff/meta" }, { $set: { data: next, at: new Date() } }, { upsert: true });
    res.json({ success: true, meta: next });
  } catch (e) {
    fail(res, e);
  }
});

export default router;
