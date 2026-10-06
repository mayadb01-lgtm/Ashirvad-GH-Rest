// Continue stay + checkout + advance booking.
// ⚠️ Sirf naye collections ("roomstays", "bookings") likhta hai. GH entries ko nahi chhoota.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Stay from "../model/stay.js";
import Booking from "../model/booking.js";
import { InvoiceCounter } from "../model/invoice.js";
import { allowedStaffDates, isAdminLike } from "../middleware/staffAccess.js";

dayjs.extend(customParseFormat);
export const stayRouter = Router();
export const bookingRouter = Router();

const F = "DD-MM-YYYY";
const PERIODS = ["day", "night", "extraDay", "extraNight"];
const MODES = ["Cash", "Card", "PPS", "PPC"];
const IST_MS = 330 * 60 * 1000;
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10)).format(F);
const D = (s) => dayjs(s, F, true);
const ok = (s) => D(s).isValid();
const who = (req) => req.user?.name || req.user?.email || "";
const clean = (v, max = 120) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const n = (v) => Math.round((Number(v) || 0) * 100) / 100;
const bad = (res, message) => res.status(400).json({ success: false, message });
const fail = (res, e) => res.status(500).json({ success: false, message: e.message });
const staffDateOk = (req, d) => isAdminLike(req.user) || allowedStaffDates().includes(d);

const cleanGuest = (g = {}) => ({
  fullname: clean(g.fullname, 100),
  mobileNumber: String(g.mobileNumber ?? "").replace(/\D/g, "").slice(0, 10),
  type: clean(g.type, 20),
  noOfPeople: Math.max(0, Number(g.noOfPeople) || 0),
  rate: n(g.rate),
  discount: n(g.discount),
  checkInTime: clean(g.checkInTime, 10),
  checkOutTime: clean(g.checkOutTime, 10),
});

/* ======================= STAY ======================= */

// GET /stay/day/:date → aaj ke liye: continue wale guest, checkout, aaj shuru hue stay, aaj ki bookings, aaj mila advance
stayRouter.get("/day/:date", async (req, res) => {
  try {
    const date = req.params.date;
    if (!ok(date)) return bad(res, "Invalid date");
    const d = D(date);
    const [stays, bookings, advDocs] = await Promise.all([
      Stay.find({ startCreateDate: { $gte: d.subtract(60, "day").toDate(), $lte: d.endOf("day").toDate() } }).lean(),
      Booking.find({ checkInDate: date, status: { $ne: "cancelled" } }).lean(),
      Booking.find({ "advances.date": date }, { bookingNo: 1, guestName: 1, advances: 1, status: 1 }).lean(),
    ]);
    const continuing = [];
    const started = [];
    const checkouts = [];
    stays.forEach((s) => {
      const diff = d.diff(D(s.startDate), "day");
      if (s.checkoutDate === date) checkouts.push({ _id: s._id, roomNo: s.roomNo, period: s.checkoutPeriod || s.period, time: s.checkoutTime, guest: s.guest.fullname });
      if (diff === 0) started.push({ _id: s._id, roomNo: s.roomNo, period: s.period, nights: s.nights, status: s.status, bookingId: s.bookingId, checkoutDate: s.checkoutDate });
      if (diff >= 1 && diff < s.nights && s.status === "active") {
        continuing.push({ _id: s._id, roomNo: s.roomNo, dayNo: diff + 1, nights: s.nights, startDate: s.startDate, guest: s.guest, bookingId: s.bookingId });
      }
    });
    const advances = [];
    advDocs.forEach((b) => (b.advances || []).filter((a) => a.date === date).forEach((a) => advances.push({ bookingNo: b.bookingNo, guestName: b.guestName, amount: a.amount, mode: a.mode, by: a.by })));
    res.json({ success: true, data: { continuing, started, checkouts, bookings, advances } });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /stay/plan  { startDate, period, roomNo, nights, guest, bookingId }
stayRouter.put("/plan", async (req, res) => {
  try {
    const b = req.body || {};
    const roomNo = Number(b.roomNo) || 0;
    if (!ok(b.startDate) || !PERIODS.includes(b.period) || !roomNo) return bad(res, "Invalid date / period / room");
    const nights = Math.min(60, Math.max(1, Math.round(Number(b.nights) || 1)));
    const doc = await Stay.findOneAndUpdate(
      { startDate: b.startDate, period: b.period, roomNo },
      {
        $set: { nights, guest: cleanGuest(b.guest), updatedBy: who(req), ...(b.bookingId ? { bookingId: clean(b.bookingId, 40) } : {}) },
        $setOnInsert: { startCreateDate: D(b.startDate).startOf("day").toDate(), enteredBy: who(req), status: "active" },
      },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// POST /stay/checkout  { date, period, roomNo, time, guest }
// Aaj ka guest gaya → room khaali (usi din naya guest Extra Day / Extra Night mein)
stayRouter.post("/checkout", async (req, res) => {
  try {
    const b = req.body || {};
    const roomNo = Number(b.roomNo) || 0;
    if (!ok(b.date) || !PERIODS.includes(b.period) || !roomNo) return bad(res, "Invalid date / period / room");
    const d = D(b.date);
    let doc = await Stay.findOne({ startDate: b.date, period: b.period, roomNo });
    if (!doc) {
      // kal se ruka hua (continue) guest
      const cands = await Stay.find({ roomNo, status: "active", startCreateDate: { $gte: d.subtract(60, "day").toDate(), $lt: d.startOf("day").toDate() } });
      doc = cands.find((s) => {
        const diff = d.diff(D(s.startDate), "day");
        return diff >= 1 && diff <= s.nights;
      });
    }
    if (!doc) {
      doc = new Stay({ roomNo, startDate: b.date, startCreateDate: d.startOf("day").toDate(), period: b.period, nights: 1, guest: cleanGuest(b.guest), enteredBy: who(req) });
    }
    const diff = d.diff(D(doc.startDate), "day");
    doc.status = "out";
    doc.checkoutDate = b.date;
    doc.checkoutPeriod = b.period;
    doc.checkoutTime = clean(b.time, 10) || dayjs(new Date(Date.now() + IST_MS)).format("hh:mm A");
    doc.nights = Math.max(1, diff || doc.nights);
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /stay/undo-checkout/:id → galti se checkout hua to wapas
stayRouter.put("/undo-checkout/:id", async (req, res) => {
  try {
    const doc = await Stay.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    if (!staffDateOk(req, doc.checkoutDate)) return res.status(403).json({ success: false, message: "Only today's checkout can be undone" });
    Object.assign(doc, { status: "active", checkoutDate: "", checkoutPeriod: "", checkoutTime: "", updatedBy: who(req) });
    if (req.body?.nights) doc.nights = Math.min(60, Math.max(1, Number(req.body.nights) || 1));
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /stay/extend/:id  { nights } → aur din rukenge
stayRouter.put("/extend/:id", async (req, res) => {
  try {
    const doc = await Stay.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    const nights = Math.min(60, Math.max(1, Math.round(Number(req.body?.nights) || 0)));
    if (!nights) return bad(res, "How many nights?");
    doc.nights = nights;
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

/* ======================= BOOKING ======================= */

const nextBookingNo = async () => {
  const c = await InvoiceCounter.findOneAndUpdate({ _id: "BOOKING" }, { $inc: { seq: 1 } }, { upsert: true, new: true });
  return `BK-${String(c.seq).padStart(4, "0")}`;
};
const bookingFields = (b) => {
  const out = {};
  if (b.guestName !== undefined) out.guestName = clean(b.guestName, 100);
  if (b.mobile !== undefined) out.mobile = String(b.mobile).replace(/\D/g, "").slice(0, 10);
  if (b.company !== undefined) out.company = clean(b.company, 120);
  if (b.people !== undefined) out.people = Math.max(1, Number(b.people) || 1);
  if (b.roomNo !== undefined) out.roomNo = Number(b.roomNo) || undefined;
  if (b.roomType !== undefined) out.roomType = clean(b.roomType, 40);
  if (b.checkInDate !== undefined) {
    out.checkInDate = b.checkInDate;
    out.checkInCreateDate = D(b.checkInDate).startOf("day").toDate();
  }
  if (b.checkInTime !== undefined) out.checkInTime = clean(b.checkInTime, 10);
  if (b.nights !== undefined) out.nights = Math.min(60, Math.max(1, Number(b.nights) || 1));
  if (b.rate !== undefined) out.rate = n(b.rate);
  if (b.notes !== undefined) out.notes = clean(b.notes, 300);
  return out;
};

// GET /booking/upcoming → aaj aur aage ki bookings (+ pichhle 2 din ki jo abhi aayi nahi)
bookingRouter.get("/upcoming", async (req, res) => {
  try {
    const from = D(todayIst()).subtract(2, "day").startOf("day").toDate();
    const list = await Booking.find({ status: "booked", checkInCreateDate: { $gte: from } }).sort({ checkInCreateDate: 1 }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    fail(res, e);
  }
});

// POST /booking  { guestName, mobile, ..., advance: { amount, mode } }
bookingRouter.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    if (!ok(b.checkInDate)) return bad(res, "Invalid check-in date");
    if (!clean(b.guestName)) return bad(res, "Enter the guest name");
    if (D(b.checkInDate).isBefore(D(todayIst()))) return bad(res, "Check-in date must be today or later");
    const doc = new Booking({ ...bookingFields(b), bookingNo: await nextBookingNo(), enteredBy: who(req) });
    const amt = n(b.advance?.amount);
    if (amt > 0) {
      if (!MODES.includes(b.advance?.mode)) return bad(res, "Select the payment mode for the advance");
      doc.advances.push({ amount: amt, mode: b.advance.mode, date: todayIst(), by: who(req) });
    }
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /booking/:id → badlaav (sirf "booked" wali)
bookingRouter.put("/:id([a-f0-9]{24})", async (req, res) => {
  try {
    const doc = await Booking.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Booking not found" });
    if (doc.status !== "booked") return bad(res, "This booking can no longer be edited");
    if (req.body?.checkInDate !== undefined && !ok(req.body.checkInDate)) return bad(res, "Invalid check-in date");
    Object.assign(doc, bookingFields(req.body || {}), { updatedBy: who(req) });
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// POST /booking/:id/advance  { amount, mode, note } → aaj ki date se
bookingRouter.post("/:id([a-f0-9]{24})/advance", async (req, res) => {
  try {
    const doc = await Booking.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Booking not found" });
    if (doc.status === "cancelled") return bad(res, "Cannot add an advance to a cancelled booking");
    const amount = n(req.body?.amount);
    if (!(amount > 0) || !MODES.includes(req.body?.mode)) return bad(res, "Fill in: amount, payment mode");
    doc.advances.push({ amount, mode: req.body.mode, date: todayIst(), by: who(req), note: clean(req.body?.note, 100) });
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /booking/:id/checkin  { date, period, roomNo } → guest aa gaya (room editor se)
bookingRouter.put("/:id([a-f0-9]{24})/checkin", async (req, res) => {
  try {
    const b = req.body || {};
    if (!ok(b.date) || !PERIODS.includes(b.period) || !Number(b.roomNo)) return bad(res, "Invalid date / period / room");
    const doc = await Booking.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Booking not found" });
    if (doc.status === "cancelled") return bad(res, "Booking is cancelled");
    doc.status = "checkedin";
    doc.checkedIn = { date: b.date, period: b.period, roomNo: Number(b.roomNo) };
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// GET /booking/for-room/:date/:roomNo → is room me aaj check-in hui booking (advance ghatane ke liye)
bookingRouter.get("/for-room/:date/:roomNo", async (req, res) => {
  try {
    const list = await Booking.find({ "checkedIn.date": req.params.date, "checkedIn.roomNo": Number(req.params.roomNo), status: "checkedin" }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /booking/:id/cancel  { reason } → sirf owner
bookingRouter.put("/:id([a-f0-9]{24})/cancel", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can cancel a booking" });
    const reason = clean(req.body?.reason, 200);
    if (!reason) return bad(res, "Enter a reason (also note whether the advance was refunded)");
    const doc = await Booking.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Booking not found" });
    Object.assign(doc, { status: "cancelled", cancelReason: reason, updatedBy: who(req) });
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// GET /booking/range/:start/:end → owner (check-in date ke hisaab se)
bookingRouter.get("/range/:start/:end", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can do this" });
    const s = D(req.params.start);
    const e = D(req.params.end);
    if (!s.isValid() || !e.isValid()) return bad(res, "Invalid date");
    const list = await Booking.find({ checkInCreateDate: { $gte: s.startOf("day").toDate(), $lte: e.endOf("day").toDate() } }).sort({ checkInCreateDate: 1 }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    fail(res, e);
  }
});
