// Continue stay + checkout + advance booking.
// ⚠️ Sirf naye collections ("roomstays", "bookings") likhta hai. GH entries ko nahi chhoota.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Stay from "../model/stay.js";
import Booking from "../model/booking.js";
import { InvoiceCounter } from "../model/invoice.js";
import Entry from "../model/entry.js";
import Room from "../model/room.js";
import { RoomBlock, RoomStatus } from "../model/roomBlock.js";
import RoomCharge from "../model/roomCharge.js";
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
// Checkout ka niyam: check-in ka din hamesha 1 gina jaata hai. Agle din 11:00 AM ke baad tak ruka → wo din bhi gina jaata hai.
const CUTOFF_MIN = 11 * 60;
const nowIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 19));
const minutesOf = (t) => {
  const m = dayjs(`2000-01-01 ${String(t || "").trim()}`, ["YYYY-MM-DD hh:mm A", "YYYY-MM-DD h:mm A", "YYYY-MM-DD HH:mm"], true);
  return m.isValid() ? m.hour() * 60 + m.minute() : null;
};
const afterCutoff = (t) => {
  const m = minutesOf(t);
  return m !== null && m >= CUTOFF_MIN;
};
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
    const continuing = []; // is din ka bhi charge (apne aap)
    const dueOut = []; // aaj 11:00 AM se pehle — abhi checkout ka time hai
    const started = [];
    const checkouts = [];
    const now = nowIst();
    const today = now.format(F);
    const pastCutoffNow = now.hour() * 60 + now.minute() >= CUTOFF_MIN;
    stays.forEach((s) => {
      const diff = d.diff(D(s.startDate), "day");
      if (s.checkoutDate === date) checkouts.push({ _id: s._id, roomNo: s.roomNo, period: s.checkoutPeriod || s.period, time: s.checkoutTime, guest: s.guest.fullname, startDate: s.startDate, billed: diff === 0 || afterCutoff(s.checkoutTime) });
      if (diff === 0) started.push({ _id: s._id, roomNo: s.roomNo, period: s.period, nights: s.nights, status: s.status, bookingId: s.bookingId, checkoutDate: s.checkoutDate });
      if (diff < 1) return;
      const item = { _id: s._id, roomNo: s.roomNo, dayNo: diff + 1, startDate: s.startDate, guest: s.guest, bookingId: s.bookingId, dueTime: "11:00 AM" };
      if (s.status === "active") {
        if (d.isBefore(D(today), "day") || (date === today && pastCutoffNow)) continuing.push(item);
        else if (date === today) dueOut.push(item);
      } else if (s.checkoutDate) {
        const c = D(s.checkoutDate);
        // checkout se pehle ke din, aur checkout wala din agar 11 baje ke baad gaye
        if (d.isBefore(c, "day") || (s.checkoutDate === date && afterCutoff(s.checkoutTime))) continuing.push({ ...item, checkedOut: true });
      }
    });
    const advances = [];
    advDocs.forEach((b) => (b.advances || []).filter((a) => a.date === date).forEach((a) => advances.push({ bookingNo: b.bookingNo, guestName: b.guestName, amount: a.amount, mode: a.mode, by: a.by })));
    res.json({ success: true, data: { continuing, dueOut, started, checkouts, bookings, advances } });
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
    // stayId diya ho to wahi stay (jaise subah 10 baje wala due-out guest)
    let doc = b.stayId && /^[a-f0-9]{24}$/.test(String(b.stayId)) ? await Stay.findOne({ _id: b.stayId, roomNo }) : null;
    if (!doc) doc = await Stay.findOne({ startDate: b.date, period: b.period, roomNo });
    if (!doc) {
      // kal se ruka hua (continue) guest
      const cands = await Stay.find({ roomNo, status: "active", startCreateDate: { $gte: d.subtract(60, "day").toDate(), $lt: d.startOf("day").toDate() } });
      doc = cands.find((s) => d.diff(D(s.startDate), "day") >= 1);
    }
    if (!doc) {
      doc = new Stay({ roomNo, startDate: b.date, startCreateDate: d.startOf("day").toDate(), period: b.period, nights: 1, guest: cleanGuest(b.guest), enteredBy: who(req) });
    }
    const diff = d.diff(D(doc.startDate), "day");
    // Bina payment checkout nahi (food bill / extra charges server pe pakka check; room rent app check karta hai)
    if (!isAdminLike(req.user)) {
      const dates = [];
      for (let x = D(doc.startDate); !x.isAfter(d, "day"); x = x.add(1, "day")) dates.push(x.format(F));
      const unpaidCh = await RoomCharge.find({ roomNo, date: { $in: dates }, isPaid: false }, { amount: 1 }).lean();
      const amt = unpaidCh.reduce((t, c) => t + (Number(c.amount) || 0), 0);
      if (amt > 0) return bad(res, `Payment pending: food/extra charges ₹${Math.round(amt)}. Mark them paid before check-out.`);
    }
    doc.status = "out";
    doc.checkoutDate = b.date;
    doc.checkoutPeriod = b.period;
    // Staff ke liye time server ka (India time); owner galti sudhaarne ke liye time de sakta hai
    doc.checkoutTime = (isAdminLike(req.user) && clean(b.time, 10)) || nowIst().format("hh:mm A");
    const billed = diff === 0 || afterCutoff(doc.checkoutTime);
    doc.nights = Math.max(1, diff + (diff >= 1 && billed ? 1 : 0)); // kitne din gine gaye
    doc.updatedBy = who(req);
    await doc.save();
    // checkout ke baad room safai ke liye "dirty"
    await RoomStatus.findOneAndUpdate({ roomNo }, { $set: { dirty: true, since: new Date(), by: who(req) } }, { upsert: true });
    res.json({ success: true, data: doc, billedToday: billed });
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
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can change the stay count" });
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

/* ======================= ROOM CALENDAR (tape chart) ======================= */
const SOLD = ["day", "night", "extraDay", "extraNight"];
const normName = (v) => String(v || "").replace(/\s+/g, " ").trim().toLowerCase();

// GET /stay/calendar/:start/:days → rooms + bars (stays, bookings, purani entries, blocks) + dirty rooms
stayRouter.get("/calendar/:start/:days", async (req, res) => {
  try {
    const S = D(req.params.start);
    if (!S.isValid()) return bad(res, "Invalid date");
    const days = Math.min(31, Math.max(1, Number(req.params.days) || 14));
    const E = S.add(days - 1, "day");
    const today = D(todayIst());
    const admin = isAdminLike(req.user);
    // Staff: kal se aage hi (purane guest ki jaankari nahi)
    if (!admin && S.isBefore(today.subtract(1, "day"), "day")) return res.status(403).json({ success: false, message: "Staff can view the calendar from yesterday onwards only" });

    const [rooms, stays, bookings, entries, blocks, statuses] = await Promise.all([
      Room.find({}, { roomNumber: 1, roomType: 1, roomCost: 1 }).lean(),
      Stay.find({ startCreateDate: { $gte: S.subtract(90, "day").toDate(), $lte: E.endOf("day").toDate() } }).lean(),
      Booking.find({ status: "booked", checkInCreateDate: { $gte: S.subtract(60, "day").toDate(), $lte: E.endOf("day").toDate() } }).lean(),
      Entry.find({ entryCreateDate: { $gte: S.startOf("day").toDate(), $lte: E.endOf("day").toDate() } }, { entry: 1, date: 1 }).lean(),
      RoomBlock.find({ fromDate: { $lte: E.endOf("day").toDate() }, toDate: { $gte: S.startOf("day").toDate() } }).lean(),
      RoomStatus.find({ dirty: true }).lean(),
    ]);
    const now = nowIst();
    const pastCutoffNow = now.hour() * 60 + now.minute() >= CUTOFF_MIN;
    const bars = [];
    const covered = new Set(); // room|date jahan stay bar hai
    const fmtD = (x) => x.format(F);
    const mark = (roomNo, from, to) => {
      for (let x = from; !x.isAfter(to, "day"); x = x.add(1, "day")) covered.add(`${roomNo}|${fmtD(x)}`);
    };

    stays.forEach((st) => {
      const start = D(st.startDate);
      let last;
      if (st.status === "out" && st.checkoutDate) {
        const c = D(st.checkoutDate);
        last = afterCutoff(st.checkoutTime) ? c : c.subtract(1, "day");
        if (last.isBefore(start, "day")) last = start;
      } else {
        last = today.isAfter(start, "day") ? today : start;
      }
      if (last.isBefore(S, "day") || start.isAfter(E, "day")) return;
      const dueOut = st.status === "active" && today.isAfter(start, "day") && !pastCutoffNow;
      mark(st.roomNo, start, last);
      bars.push({
        type: "stay",
        id: st._id,
        roomNo: st.roomNo,
        from: st.startDate,
        to: fmtD(last),
        name: st.guest?.fullname || "Guest",
        mobile: admin ? st.guest?.mobileNumber || "" : "",
        people: st.guest?.noOfPeople || 0,
        rate: admin ? st.guest?.rate || 0 : undefined,
        period: st.period,
        status: st.status,
        checkoutDate: st.checkoutDate,
        checkoutTime: st.checkoutTime,
        days: Math.max(1, last.diff(start, "day") + (dueOut ? 0 : 1)), // due-out: aaj abhi gina nahi
        dueOut,
        nights: st.nights || 1,
        // andaaza: kab tak rukenge (calendar mein drag se) — bill apne aap din ke hisaab se hi banta hai
        expectedTo: st.status === "active" && start.add(Math.max(1, st.nights || 1) - 1, "day").isAfter(last, "day") ? fmtD(start.add(st.nights - 1, "day")) : null,
      });
    });

    bookings.forEach((b) => {
      const from = D(b.checkInDate);
      const to = from.add(Math.max(1, b.nights || 1) - 1, "day");
      if (to.isBefore(S, "day") || from.isAfter(E, "day")) return;
      const adv = (b.advances || []).reduce((t, a) => t + (Number(a.amount) || 0), 0);
      bars.push({ type: "booking", id: b._id, roomNo: b.roomNo || null, from: b.checkInDate, to: fmtD(to), name: b.guestName, mobile: b.mobile, people: b.people, nights: b.nights, bookingNo: b.bookingNo, advance: adv, rate: b.rate });
    });

    // Purani entries (stay record ke bina) → ek-ek din ke cells, lagataar same naam ho to jod do
    const cells = {};
    entries.forEach((doc) =>
      (doc.entry || []).forEach((e) => {
        if (!SOLD.includes(e.period) || !e.roomNo || covered.has(`${e.roomNo}|${doc.date}`)) return;
        const k = `${e.roomNo}|${doc.date}`;
        if (!cells[k]) cells[k] = { roomNo: e.roomNo, date: doc.date, name: e.fullname || "Guest", unpaid: e.modeOfPayment === "UnPaid" };
      })
    );
    const byRoom = {};
    Object.values(cells).forEach((c) => (byRoom[c.roomNo] ||= []).push(c));
    Object.values(byRoom).forEach((list) => {
      list.sort((a, b) => D(a.date) - D(b.date));
      let cur = null;
      list.forEach((c) => {
        if (cur && normName(cur.name) === normName(c.name) && D(cur.to).add(1, "day").isSame(D(c.date), "day")) cur.to = c.date;
        else {
          cur = { type: "entry", id: `${c.roomNo}-${c.date}`, roomNo: c.roomNo, from: c.date, to: c.date, name: admin || !D(c.date).isBefore(today.subtract(1, "day")) ? c.name : "Occupied" };
          bars.push(cur);
        }
      });
    });

    blocks.forEach((b) => bars.push({ type: "block", id: b._id, roomNo: b.roomNo, from: b.from, to: b.to, name: b.reason || "Blocked", by: b.by }));

    res.json({
      success: true,
      data: {
        start: fmtD(S),
        days,
        today: fmtD(today),
        rooms: rooms.sort((a, b) => a.roomNumber - b.roomNumber).map((r) => ({ roomNo: r.roomNumber, type: r.roomType, rate: r.roomCost })),
        bars,
        dirty: statuses.map((x) => x.roomNo),
      },
    });
  } catch (e) {
    fail(res, e);
  }
});

// POST /stay/block  { roomNo, from, to, reason } → sirf owner
stayRouter.post("/block", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can block rooms" });
    const b = req.body || {};
    const roomNo = Number(b.roomNo) || 0;
    if (!roomNo || !ok(b.from) || !ok(b.to) || D(b.to).isBefore(D(b.from))) return bad(res, "Room and a valid date range are required");
    const doc = await RoomBlock.create({ roomNo, from: b.from, to: b.to, fromDate: D(b.from).startOf("day").toDate(), toDate: D(b.to).endOf("day").toDate(), reason: clean(b.reason, 60) || "Maintenance", by: who(req) });
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// DELETE /stay/block/:id → sirf owner
stayRouter.delete("/block/:id", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can unblock rooms" });
    await RoomBlock.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /stay/clean/:roomNo  { dirty } → safai ho gayi (staff bhi)
stayRouter.put("/clean/:roomNo", async (req, res) => {
  try {
    const roomNo = Number(req.params.roomNo) || 0;
    if (!roomNo) return bad(res, "Invalid room");
    const dirty = !!req.body?.dirty;
    await RoomStatus.findOneAndUpdate({ roomNo }, { $set: { dirty, since: new Date(), by: who(req) } }, { upsert: true });
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /stay/expected/:id  { nights } → ruke hue guest ka andaaza (kab tak rukega). Bill par asar nahi.
stayRouter.put("/expected/:id", async (req, res) => {
  try {
    const doc = await Stay.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    if (doc.status !== "active") return bad(res, "Only in-house guests can be extended");
    const nights = Math.min(60, Math.max(1, Math.round(Number(req.body?.nights) || 0)));
    if (!nights) return bad(res, "Invalid number of nights");
    doc.nights = nights;
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /stay/block/:id  { to } → block badhao / ghatao (sirf owner)
stayRouter.put("/block/:id", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can change room blocks" });
    const doc = await RoomBlock.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    const to = String(req.body?.to || "");
    if (!ok(to) || D(to).isBefore(D(doc.from))) return bad(res, "Invalid end date");
    doc.to = to;
    doc.toDate = D(to).endOf("day").toDate();
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// GET /stay/dues/:roomNo/:from/:to → checkout se pehle: is room ke baaki food/extra charges + booking advance
stayRouter.get("/dues/:roomNo/:from/:to", async (req, res) => {
  try {
    const roomNo = Number(req.params.roomNo) || 0;
    const from = D(req.params.from);
    const to = D(req.params.to);
    if (!roomNo || !from.isValid() || !to.isValid() || to.isBefore(from) || to.diff(from, "day") > 90) return bad(res, "Invalid room / dates");
    const dates = [];
    for (let x = from; !x.isAfter(to, "day"); x = x.add(1, "day")) dates.push(x.format(F));
    const [charges, bookings] = await Promise.all([
      RoomCharge.find({ roomNo, date: { $in: dates }, isPaid: false }).lean(),
      Booking.find({ status: "checkedin", "checkedIn.roomNo": roomNo, "checkedIn.date": { $in: dates } }, { advances: 1 }).lean(),
    ]);
    const advance = bookings.reduce((t, b) => t + (b.advances || []).reduce((u, a) => u + (Number(a.amount) || 0), 0), 0);
    res.json({ success: true, data: { charges: charges.map((c) => ({ _id: c._id, date: c.date, label: c.label, kind: c.kind, amount: c.amount })), advance } });
  } catch (e) {
    fail(res, e);
  }
});

