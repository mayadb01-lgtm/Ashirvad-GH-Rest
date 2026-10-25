// Restaurant: purana udhaar (Receivables) wasool karna — "Collect old dues".
// ⚠️ Sirf naya collection "restduereceipts" likhta hai. Restaurant / Office ke purane records nahi chhedta.
// Yeh SALE nahi: din ke Grand total / Sales mein nahi judta. Reports mein "old dues received" (Cash / PP) ki tarah aata hai.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import RestDueReceipt from "../model/restDueReceipt.js";
import RoomCharge from "../model/roomCharge.js";
import RestDueAdjust from "../model/restDueAdjust.js";
import { allowedStaffDates, isAdminLike, dateOk as staffDateOk } from "../middleware/staffAccess.js";
import { computeRestReceivables, isRoomBill } from "../utils/restReceivables.js";
import { nk } from "../utils/officeTypes.js";
import { normSplit, payParts } from "../utils/payParts.js";
// Room bill ka Cash hissa (split ho to sirf Cash wala)
const cashPart = (c) => payParts(c, "amount", "paidMode", "paidSplit").filter((p) => p.mode === "Cash").reduce((t, p) => t + p.amount, 0);
const HAS_CASH = { $or: [{ paidMode: "Cash" }, { "paidSplit.mode": "Cash" }] };

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const fail = (res, e) => res.status(500).json({ success: false, message: e.message });
const validDate = (d) => dayjs(d, F, true).isValid();
const dateOk = (req, d) => staffDateOk(req, d);
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
    // ?at=office → Office mein wasool; warna Restaurant counter wale (Office wale Restaurant ke galle mein nahi)
    const at = req.query.at === "office" ? "office" : { $ne: "office" };
    const data = await RestDueReceipt.find({ date: req.params.date, at }).sort({ createdAt: 1 }).lean();
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
    const at = b.at === "office" ? "office" : "rest";
    const modes = at === "office" ? ["Cash", "PP", "PPS", "PPC"] : ["Cash", "Card", "PP"];
    // Split: ek hi wasooli do mode mein (jaise Cash 300 + PP 500) → do receipt
    let parts = null;
    if (Array.isArray(b.split) && b.split.length) {
      const sp = normSplit(b.split, amount, modes);
      if (sp.error) return bad(res, sp.error);
      if (sp.split.length) parts = sp.split;
      else if (sp.mode) b.mode = sp.mode;
    }
    if (!parts && !modes.includes(b.mode)) return bad(res, `Choose ${modes.join(" / ")}`);
    // Do baar tap ho gaya to dobara na bane
    const dup = parts ? null : await RestDueReceipt.findOne({ date: b.date, nameKey: nk(name), amount, mode: b.mode, cancelled: { $ne: true }, createdAt: { $gte: new Date(Date.now() - 15000) } }).lean();
    if (dup) return res.json({ success: true, data: dup, duplicate: true });
    // Baaki se zyada nahi (do counter par ek hi paisa do baar na ho). Owner ko chhoot.
    if (!isAdminLike(req.user)) {
      const r = await computeRestReceivables({ upto: dayjs(b.date, F, true) });
      const bal = r.rows.find((x) => x.key === nk(name))?.balance || 0;
      if (amount > bal) return bad(res, bal > 0 ? `Only ${"₹" + bal} is due from ${name}. It may already be received at another counter.` : `Nothing is due from ${name}. It may already be received at another counter.`);
    }
    const note = String(b.note || "").trim().slice(0, 200);
    if (parts) {
      const docs = await RestDueReceipt.insertMany(parts.map((p) => ({ date: b.date, entryCreateDate: dayjs(b.date, F, true).startOf("day").toDate(), name, nameKey: nk(name), amount: Math.round(p.amount), mode: p.mode, at, note: (note ? note + " · " : "") + "split payment", enteredBy: who(req) })));
      return res.json({ success: true, data: docs[0], split: docs });
    }
    const doc = await RestDueReceipt.create({ date: b.date, name, nameKey: nk(name), amount, mode: b.mode, at, note, enteredBy: who(req) });
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// ───── Owner: purana baaki (opening) / maafi (writeoff) — paisa nahi, sirf baaki sudharna ─────
router.get("/adjust", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return bad(res, "Only the owner can do this", 403);
    res.json({ success: true, data: await RestDueAdjust.find({}).sort({ createdAt: -1 }).lean() });
  } catch (e) {
    fail(res, e);
  }
});
router.post("/adjust", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return bad(res, "Only the owner can do this", 403);
    const b = req.body || {};
    const name = String(b.name || "").trim();
    const amount = Math.round(Number(b.amount) || 0);
    if (!validDate(b.date)) return bad(res, "Invalid date");
    if (!name) return bad(res, "Enter the name");
    if (isRoomBill(name)) return bad(res, "Room bills are settled with the guest's room bill");
    if (!["opening", "writeoff"].includes(b.kind)) return bad(res, "Choose opening balance or write-off");
    if (!(amount > 0)) return bad(res, "Enter the amount");
    const doc = await RestDueAdjust.create({ date: b.date, name, nameKey: nk(name), kind: b.kind, amount, note: String(b.note || "").trim().slice(0, 200), enteredBy: who(req) });
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});
router.put("/adjust/:id([a-f0-9]{24})/cancel", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return bad(res, "Only the owner can do this", 403);
    await RestDueAdjust.updateOne({ _id: req.params.id }, { $set: { cancelled: true, cancelledBy: who(req) } });
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

// ───── GH → Restaurant cash handover ─────
// GH cashier ne room ka food bill Cash mein liya → woh paisa Restaurant cashier ko deta hai.
// GET /gh-cash/:date → pichhle 30 din mein GH par Cash mein wasool hue food bill jo abhi Restaurant ko nahi mile
router.get("/gh-cash/:date", async (req, res) => {
  try {
    if (!validDate(req.params.date)) return bad(res, "Invalid date");
    const d = dayjs(req.params.date, F, true);
    const days = [];
    for (let i = 0; i <= 30; i++) days.push(d.subtract(i, "day").format(F));
    const [paid, handed] = await Promise.all([
      RoomCharge.find({ kind: "food", source: "rest", isPaid: true, ...HAS_CASH, paidAt: { $nin: ["rest", "office"] }, paidDate: { $in: days } }).lean(),
      RestDueReceipt.find({ source: "gh", cancelled: { $ne: true } }, { chargeId: 1 }).lean(),
    ]);
    const done = new Set(handed.map((h) => h.chargeId));
    const data = paid
      .filter((c) => !done.has(String(c._id)))
      .map((c) => ({ _id: c._id, roomNo: c.roomNo, guestName: c.guestName, date: c.date, paidDate: c.paidDate, paidBy: c.paidBy, amount: cashPart(c), label: c.label }))
      .filter((c) => c.amount > 0);
    res.json({ success: true, data });
  } catch (e) {
    fail(res, e);
  }
});

// POST /gh-handover { date, chargeIds: [] } → Restaurant cashier: "GH se cash mil gaya"
router.post("/gh-handover", async (req, res) => {
  try {
    const b = req.body || {};
    if (!validDate(b.date)) return bad(res, "Invalid date");
    if (!dateOk(req, b.date)) return bad(res, "Only today's entry can be added", 403);
    const ids = (Array.isArray(b.chargeIds) ? b.chargeIds : []).filter((x) => /^[a-f0-9]{24}$/.test(String(x)));
    if (!ids.length) return bad(res, "Choose the bills received");
    const [charges, handed] = await Promise.all([
      RoomCharge.find({ _id: { $in: ids }, kind: "food", isPaid: true, ...HAS_CASH }).lean(),
      RestDueReceipt.find({ source: "gh", chargeId: { $in: ids }, cancelled: { $ne: true } }, { chargeId: 1 }).lean(),
    ]);
    const done = new Set(handed.map((h) => h.chargeId));
    const todo = charges.filter((c) => !done.has(String(c._id)));
    if (!todo.length) return bad(res, "Already received");
    const docs = await RestDueReceipt.insertMany(
      todo.map((c) => ({
        date: b.date,
        entryCreateDate: dayjs(b.date, F, true).startOf("day").toDate(),
        name: `Room ${c.roomNo} food bill${c.guestName ? ` · ${c.guestName}` : ""}`,
        nameKey: nk(`room ${c.roomNo} food bill`),
        amount: Math.round(cashPart(c)),
        mode: "Cash",
        note: `From GH cashier · bill of ${c.date}${c.paidBy ? ` · collected by ${c.paidBy}` : ""}`,
        source: "gh",
        chargeId: String(c._id),
        enteredBy: who(req),
      }))
    );
    res.json({ success: true, data: docs });
  } catch (e) {
    fail(res, e);
  }
});

// ───── Room ka food bill Restaurant counter par bhi wasool ho sakta hai ─────
// GET /room-bills/:date → baaki room food bill (pichhle 60 din) + aaj Restaurant par wasool hue
router.get("/room-bills/:date", async (req, res) => {
  try {
    if (!validDate(req.params.date)) return bad(res, "Invalid date");
    const d = dayjs(req.params.date, F, true);
    const days = [];
    for (let i = 0; i <= 60; i++) days.push(d.subtract(i, "day").format(F));
    const [due, paidToday] = await Promise.all([
      RoomCharge.find({ kind: "food", source: "rest", isPaid: false, date: { $in: days } }).lean(),
      RoomCharge.find({ kind: "food", isPaid: true, paidAt: req.query.at === "office" ? "office" : "rest", paidDate: req.params.date }).lean(),
    ]);
    const pick = (c) => ({ _id: c._id, roomNo: c.roomNo, guestName: c.guestName, date: c.date, amount: c.amount, paidMode: c.paidMode, paidSplit: c.paidSplit, paidBy: c.paidBy });
    const dv = (s) => String(s).split("-").reverse().join("");
    res.json({ success: true, data: { due: due.sort((a, b) => dv(a.date).localeCompare(dv(b.date))).map(pick), paidToday: paidToday.map(pick) } });
  } catch (e) {
    fail(res, e);
  }
});

// POST /room-bills/:id/receive { date, mode, at: "rest" | "office" } → GH / Restaurant dono jagah "paid" dikhega
//   Restaurant: Cash / Card / PP · Office: Cash / PP / PPS / PPC
router.post("/room-bills/:id([a-f0-9]{24})/receive", async (req, res) => {
  try {
    const b = req.body || {};
    if (!validDate(b.date)) return bad(res, "Invalid date");
    if (!dateOk(req, b.date)) return bad(res, "Only today's collection can be added", 403);
    const at = b.at === "office" ? "office" : "rest";
    const modes = at === "office" ? ["Cash", "PP", "PPS", "PPC"] : ["Cash", "Card", "PP"];
    const doc = await RoomCharge.findById(req.params.id);
    if (!doc || doc.kind !== "food") return bad(res, "Bill not found", 404);
    if (doc.isPaid) return bad(res, "This room bill is already paid");
    let split = [];
    if (Array.isArray(b.split) && b.split.length) {
      const sp = normSplit(b.split, doc.amount, modes);
      if (sp.error) return bad(res, sp.error);
      split = sp.split;
      if (sp.mode) b.mode = sp.mode;
    }
    if (!modes.includes(b.mode)) return bad(res, `Choose ${modes.join(" / ")}`);
    doc.isPaid = true;
    doc.paidMode = b.mode;
    doc.paidSplit = split.length ? split : undefined;
    doc.paidDate = b.date;
    doc.paidBy = who(req);
    doc.paidAt = at;
    doc.updatedBy = who(req);
    await doc.save();
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
