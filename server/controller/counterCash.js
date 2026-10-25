// Teeno counter (GH / Restaurant / Office) ka taalmel:
//   1) GH ka purana baaki Office mein wasool  → naya collection "ghduereceipts" (GH ki baaki list se hat jaata hai)
//   2) Counter ka cash Office ko diya          → naya collection "cashhandovers" (transfer, kamai nahi)
// ⚠️ Purani entries (entries / restentries / officebooks) sirf PADHI jaati hain.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Entry from "../model/entry.js";
import GhDueReceipt, { officeReceivedGhIds } from "../model/ghDueReceipt.js";
import CashHandover from "../model/cashHandover.js";
import RoomCharge from "../model/roomCharge.js";
import Booking from "../model/booking.js";
import { allowedStaffDates, isAdminLike, dateOk as staffDateOk } from "../middleware/staffAccess.js";
import { payParts } from "../utils/payParts.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const fail = (res, e) => res.status(500).json({ success: false, message: e.message });
const validDate = (d) => dayjs(d, F, true).isValid();
const dateOk = (req, d) => staffDateOk(req, d);
const who = (req) => req.user?.name || req.user?.email || "";
const OFFICE_MODES = ["Cash", "PP", "PPS", "PPC"];

/* ───────────── 1) GH ka baaki → Office ───────────── */
// GET /gh-dues/:date → GH ke saare baaki room (jo na GH mein jama hue, na Office mein) + aaj Office mein wasool hue
router.get("/gh-dues/:date", async (req, res) => {
  try {
    if (!validDate(req.params.date)) return bad(res, "Invalid date");
    const [rows, done, today] = await Promise.all([
      Entry.aggregate([
        { $unwind: "$entry" },
        { $match: { "entry.modeOfPayment": "UnPaid", "entry.isPaid": { $ne: true }, "entry.period": { $ne: "UnPaid" } } },
        { $project: { _id: 0, id: "$entry._id", date: "$entry.createDate", roomNo: "$entry.roomNo", fullname: "$entry.fullname", mobileNumber: "$entry.mobileNumber", rate: "$entry.rate", period: "$entry.period" } },
      ]),
      officeReceivedGhIds(),
      GhDueReceipt.find({ date: req.params.date }).sort({ createdAt: 1 }).lean(),
    ]);
    const dv = (s) => String(s).split("-").reverse().join("");
    const due = rows
      .filter((r) => !done.has(String(r.id)) && Number(r.rate) > 0)
      .map((r) => ({ ...r, id: String(r.id) }))
      .sort((a, b) => dv(b.date).localeCompare(dv(a.date)));
    res.json({ success: true, data: { due, today } });
  } catch (e) {
    fail(res, e);
  }
});

// POST /gh-dues/:srcId/receive { date, mode, note }
router.post("/gh-dues/:srcId([a-f0-9]{24})/receive", async (req, res) => {
  try {
    const b = req.body || {};
    if (!validDate(b.date)) return bad(res, "Invalid date");
    if (!dateOk(req, b.date)) return bad(res, "Only today's collection can be added", 403);
    if (!OFFICE_MODES.includes(b.mode)) return bad(res, `Choose ${OFFICE_MODES.join(" / ")}`);
    const srcId = req.params.srcId;
    const doc = await Entry.findOne({ "entry._id": srcId }, { "entry.$": 1 }).lean();
    const row = doc?.entry?.[0];
    if (!row || row.modeOfPayment !== "UnPaid" || row.period === "UnPaid") return bad(res, "Due not found", 404);
    if (row.isPaid) return bad(res, "Already collected at the GH counter");
    if (await GhDueReceipt.exists({ srcId, cancelled: { $ne: true } })) return bad(res, "Already received in the Office");
    const rec = await GhDueReceipt.create({
      date: b.date,
      srcId,
      srcDate: row.createDate || "",
      roomNo: row.roomNo,
      name: row.fullname || "",
      mobile: row.mobileNumber ? String(row.mobileNumber) : "",
      amount: Math.round(Number(row.rate) || 0),
      mode: b.mode,
      note: String(b.note || "").trim().slice(0, 200),
      enteredBy: who(req),
    });
    res.json({ success: true, data: rec });
  } catch (e) {
    fail(res, e);
  }
});

router.put("/gh-dues/receipt/:id([a-f0-9]{24})/cancel", async (req, res) => {
  try {
    const doc = await GhDueReceipt.findById(req.params.id);
    if (!doc) return bad(res, "Not found", 404);
    if (!dateOk(req, doc.date)) return bad(res, "Only today's collection can be removed", 403);
    Object.assign(doc, { cancelled: true, cancelledBy: who(req), cancelledAt: new Date() });
    await doc.save();
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

/* ───────────── 2) Counter ka cash → Office (transfer) ───────────── */
router.get("/handover/:date", async (req, res) => {
  try {
    if (!validDate(req.params.date)) return bad(res, "Invalid date");
    const data = await CashHandover.find({ date: req.params.date }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data });
  } catch (e) {
    fail(res, e);
  }
});

// POST /handover { date, from: rest | gh, amount, note } — Office cashier jab cash le
router.post("/handover", async (req, res) => {
  try {
    const b = req.body || {};
    const amount = Math.round(Number(b.amount) || 0);
    if (!validDate(b.date)) return bad(res, "Invalid date");
    if (!dateOk(req, b.date)) return bad(res, "Only today's entry can be added", 403);
    if (!["rest", "gh"].includes(b.from)) return bad(res, "Choose Restaurant or GH");
    if (!(amount > 0)) return bad(res, "Enter the amount");
    const dup = await CashHandover.findOne({ date: b.date, from: b.from, amount, cancelled: { $ne: true }, createdAt: { $gte: new Date(Date.now() - 15000) } }).lean();
    if (dup) return res.json({ success: true, data: dup, duplicate: true });
    const doc = await CashHandover.create({ date: b.date, from: b.from, amount, note: String(b.note || "").trim().slice(0, 200), enteredBy: who(req) });
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

router.put("/handover/:id([a-f0-9]{24})/cancel", async (req, res) => {
  try {
    const doc = await CashHandover.findById(req.params.id);
    if (!doc) return bad(res, "Not found", 404);
    if (!dateOk(req, doc.date)) return bad(res, "Only today's entry can be removed", 403);
    Object.assign(doc, { cancelled: true, cancelledBy: who(req), cancelledAt: new Date() });
    await doc.save();
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

/* ───────────── 3) GH ka Card (ek hi machine → Restaurant ka PP account) ───────────── */
// GET /gh-card/:date → us din GH counter par Card se kitna aaya (saved GH entry + booking advance + food/extra bill)
router.get("/gh-card/:date", async (req, res) => {
  try {
    const date = req.params.date;
    if (!validDate(date)) return bad(res, "Invalid date");
    const [docs, bookings, charges] = await Promise.all([
      Entry.find({ date }, { entry: 1 }).lean(),
      Booking.find({ "advances.date": date }, { advances: 1 }).lean(),
      RoomCharge.find({ isPaid: true, paidDate: date, $or: [{ paidMode: "Card" }, { "paidSplit.mode": "Card" }], paidAt: { $nin: ["rest", "office"] } }, { amount: 1, paidMode: 1, paidSplit: 1 }).lean(),
    ]);
    const rooms = docs.flatMap((d) => d.entry || []).flatMap((e) => payParts(e)).filter((p) => p.mode === "Card").reduce((t, p) => t + (Number(p.amount) || 0), 0);
    const adv = bookings.flatMap((b) => b.advances || []).filter((a) => a.date === date && a.mode === "Card").reduce((t, a) => t + (Number(a.amount) || 0), 0);
    const bills = charges.flatMap((c) => payParts(c, "amount", "paidMode", "paidSplit")).filter((p) => p.mode === "Card").reduce((t, p) => t + (Number(p.amount) || 0), 0);
    res.json({ success: true, data: { rooms, advance: adv, bills, total: rooms + adv + bills } });
  } catch (e) {
    fail(res, e);
  }
});

export default router;
