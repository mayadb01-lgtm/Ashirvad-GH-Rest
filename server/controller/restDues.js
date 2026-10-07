// Restaurant: purana udhaar (Receivables) wasool karna — "Collect old dues".
// ⚠️ Sirf naya collection "restduereceipts" likhta hai. Restaurant / Office ke purane records nahi chhedta.
// Yeh SALE nahi: din ke Grand total / Sales mein nahi judta. Reports mein "old dues received" (Cash / PP) ki tarah aata hai.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import RestDueReceipt from "../model/restDueReceipt.js";
import { allowedStaffDates, isAdminLike } from "../middleware/staffAccess.js";
import { computeRestReceivables, isRoomBill } from "../utils/restReceivables.js";
import { nk } from "../utils/officeTypes.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const fail = (res, e) => res.status(500).json({ success: false, message: e.message });
const validDate = (d) => dayjs(d, F, true).isValid();
const dateOk = (req, d) => isAdminLike(req.user) || allowedStaffDates().includes(d);
const who = (req) => req.user?.name || req.user?.fullname || req.user?.email || "";

// Kiska kitna baaki (us din tak)
router.get("/balances/:date", async (req, res) => {
  try {
    if (!validDate(req.params.date)) return bad(res, "Invalid date");
    const r = await computeRestReceivables({ upto: dayjs(req.params.date, F, true) });
    const due = r.rows.filter((x) => x.balance > 0).map((x) => ({ name: x.name, mobile: x.mobile, balance: x.balance, lastGiven: x.lastGiven, days: x.days }));
    res.json({ success: true, data: { due, total: r.totals.due } });
  } catch (e) {
    fail(res, e);
  }
});

router.get("/day/:date", async (req, res) => {
  try {
    if (!validDate(req.params.date)) return bad(res, "Invalid date");
    const data = await RestDueReceipt.find({ date: req.params.date }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data });
  } catch (e) {
    fail(res, e);
  }
});

router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const name = String(b.name || "").trim();
    const amount = Math.round(Number(b.amount) || 0);
    if (!validDate(b.date)) return bad(res, "Invalid date");
    if (!dateOk(req, b.date)) return bad(res, "Only today's collection can be added", 403);
    if (!name) return bad(res, "Choose who paid");
    if (isRoomBill(name)) return bad(res, "Room bills are collected with the guest's room bill");
    if (!(amount > 0)) return bad(res, "Enter the amount received");
    if (!["Cash", "Card", "PP"].includes(b.mode)) return bad(res, "Choose Cash, Card or PP (UPI)");
    // Do baar tap ho gaya to dobara na bane
    const dup = await RestDueReceipt.findOne({ date: b.date, nameKey: nk(name), amount, mode: b.mode, cancelled: { $ne: true }, createdAt: { $gte: new Date(Date.now() - 15000) } }).lean();
    if (dup) return res.json({ success: true, data: dup, duplicate: true });
    const doc = await RestDueReceipt.create({ date: b.date, name, nameKey: nk(name), amount, mode: b.mode, note: String(b.note || "").trim().slice(0, 200), enteredBy: who(req) });
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// Galti hui to hatao (cancel — record rehta hai, hisaab se nikal jaata hai)
router.put("/:id([a-f0-9]{24})/cancel", async (req, res) => {
  try {
    const doc = await RestDueReceipt.findById(req.params.id);
    if (!doc) return bad(res, "Not found", 404);
    if (!dateOk(req, doc.date)) return bad(res, "Only today's collection can be removed", 403);
    doc.cancelled = true;
    doc.cancelledBy = who(req);
    doc.cancelledAt = new Date();
    await doc.save();
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

export default router;
