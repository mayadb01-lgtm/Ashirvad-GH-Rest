// Tax Invoice (GST) + Bill (Non-GST). Numbering server pe (atomic), do alag series.
// ⚠️ Sirf "invoices" / "invoicecounters" likhta hai. Entry / RoomCharge / GuestRegister sirf PADHE jaate hain.
// Invoice ek baar bana to badla nahi jaata (GST niyam) — galat ho to Cancel karke naya banao.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { Invoice, InvoiceCounter } from "../model/invoice.js";
import Entry from "../model/entry.js";
import Room from "../model/room.js";
import RoomCharge from "../model/roomCharge.js";
import GuestRegister from "../model/guestRegister.js";
import { RoomGroup } from "../model/roomMove.js";
import { allowedStaffDates, isAdminLike, dateOk as staffDateOk } from "../middleware/staffAccess.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const SERIES = { GST: "GST", NON: "INV" };
const BUSINESSES = ["Guest House", "Restaurant", "Banquet Hall", "Other"];
const TAX_RATES = [0, 5, 12, 18, 28];
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const SAC = { room: "996311", food: "996331", banquet: "997212", other: "996311" };

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const clean = (v, max = 200) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const who = (req) => req.user?.name || req.user?.email || "";
const bad = (res, message) => res.status(400).json({ success: false, message });
const fail = (res, e) => res.status(500).json({ success: false, message: e.message });
const fyOf = (d) => {
  const y = d.month() >= 3 ? d.year() : d.year() - 1; // April se naya saal
  return `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
};
const canSee = (req, inv) => staffDateOk(req, inv.invoiceDate);

// Ek line ka hisaab
const calcItem = (it, inclusive, gst) => {
  const qty = Math.max(0, Number(it.qty) || 0);
  const rate = Math.max(0, Number(it.rate) || 0);
  const taxRate = gst && TAX_RATES.includes(Number(it.taxRate)) ? Number(it.taxRate) : 0;
  const gross = qty * rate;
  const taxable = inclusive && taxRate ? gross / (1 + taxRate / 100) : gross;
  const tax = (taxable * taxRate) / 100;
  return {
    desc: clean(it.desc, 120),
    sac: clean(it.sac, 10).replace(/\D/g, ""),
    qty: r2(qty),
    rate: r2(inclusive && taxRate ? rate / (1 + taxRate / 100) : rate),
    taxRate,
    taxable: r2(taxable),
    cgst: r2(tax / 2),
    sgst: r2(tax / 2),
    total: r2(taxable + tax),
  };
};

// GET /room-prefill/:date/:period/:roomNo → room entry + food bill + extra charges + govt details se bhara draft
router.get("/room-prefill/:date/:period/:roomNo", async (req, res) => {
  try {
    const { date, period } = req.params;
    const roomNo = Number(req.params.roomNo);
    if (!dayjs(date, F, true).isValid() || !roomNo) return bad(res, "Invalid date / room");
    const [doc, room, charges, reg, existing] = await Promise.all([
      Entry.findOne({ date }, { entry: 1 }).lean(),
      Room.findOne({ roomNumber: roomNo }).lean(),
      RoomCharge.find({ date, roomNo }).lean(),
      GuestRegister.findOne({ date, period, roomNo }).lean(),
      Invoice.find({ "source.date": date, "source.roomNo": roomNo }, { invoiceNo: 1, series: 1, status: 1, grandTotal: 1 }).lean(),
    ]);
    const e = (doc?.entry || []).find((x) => x.roomNo === roomNo && x.period === period) || null;
    const ch = charges.filter((c) => !c.period || c.period === period);
    const items = [];
    if (e) {
      const rate = Math.max(0, Number(e.rate) || 0); // Rate = discount ke baad ki final rakam
      items.push({ desc: `Room rent — Room ${roomNo}${room?.roomType ? ` (${room.roomType})` : ""}`, sac: SAC.room, qty: 1, rate, taxRate: 5 });
    }
    const food = ch.filter((c) => c.kind === "food").reduce((s, c) => s + (Number(c.amount) || 0), 0);
    if (food > 0) items.push({ desc: "Restaurant food & beverages", sac: SAC.food, qty: 1, rate: food, taxRate: 5 });
    ch.filter((c) => c.kind === "extra").forEach((c) => items.push({ desc: c.label, sac: SAC.room, qty: 1, rate: Number(c.amount) || 0, taxRate: 5 }));

    // Bill merge: is room ka group ho to baaki rooms ka rent + food + extra bhi isi invoice mein
    const group = await RoomGroup.findOne({ status: "active", mainRoom: roomNo }).lean();
    const roomList = [roomNo];
    if (group) {
      const [rooms2, charges2] = await Promise.all([Room.find({ roomNumber: { $in: group.rooms } }).lean(), RoomCharge.find({ date, roomNo: { $in: group.rooms } }).lean()]);
      for (const rn of group.rooms) {
        roomList.push(rn);
        const rm = rooms2.find((x) => x.roomNumber === rn);
        const er = (doc?.entry || []).find((x) => x.roomNo === rn && ["day", "night", "extraDay", "extraNight"].includes(x.period));
        if (er) items.push({ desc: `Room rent — Room ${rn}${rm?.roomType ? ` (${rm.roomType})` : ""}`, sac: SAC.room, qty: 1, rate: Math.max(0, Number(er.rate) || 0), taxRate: 5 });
        const c2 = charges2.filter((c) => c.roomNo === rn);
        const f2 = c2.filter((c) => c.kind === "food").reduce((t, c) => t + (Number(c.amount) || 0), 0);
        if (f2 > 0) items.push({ desc: `Restaurant food & beverages — Room ${rn}`, sac: SAC.food, qty: 1, rate: f2, taxRate: 5 });
        c2.filter((c) => c.kind === "extra").forEach((c) => items.push({ desc: `${c.label} — Room ${rn}`, sac: SAC.room, qty: 1, rate: Number(c.amount) || 0, taxRate: 5 }));
      }
    }

    // Discount poore bill par: sab items mein barabar hisse se ghatao (GST sahi rahe)
    let disc = Math.max(0, Number(e?.discount) || 0);
    if (group) for (const rn of group.rooms) disc += Math.max(0, Number((doc?.entry || []).find((x) => x.roomNo === rn && ["day", "night", "extraDay", "extraNight"].includes(x.period))?.discount) || 0);
    const gross = items.reduce((t, it) => t + (Number(it.rate) || 0) * (Number(it.qty) || 1), 0);
    if (disc > 0 && gross > 0) {
      const d = Math.min(disc, gross);
      let left = d;
      items.forEach((it, i) => {
        const share = i === items.length - 1 ? left : Math.round((d * (Number(it.rate) || 0)) / gross * 100) / 100;
        it.rate = Math.max(0, Math.round(((Number(it.rate) || 0) - share) * 100) / 100);
        left = Math.round((left - share) * 100) / 100;
      });
    }
    const name = reg ? [reg.firstName, reg.middleName, reg.lastName].filter(Boolean).join(" ") : "";
    const address = reg ? [reg.houseNo, reg.address, reg.locality, reg.city, reg.district, reg.zipCode].filter(Boolean).join(", ") : "";
    const mobile = e?.mobileNumber && String(e.mobileNumber) !== "0" ? String(e.mobileNumber) : reg?.mobile || "";
    res.json({
      success: true,
      data: {
        draft: {
          ...(disc > 0 ? { notes: `Discount ₹${Math.round(disc)} on total bill (already less in the amounts above).` } : {}),
          business: "Guest House",
          invoiceDate: date,
          customer: { name: e?.fullname || name || "", company: reg?.companyName || "", gstin: "", address, mobile, state: reg?.state || "Gujarat" },
          stay: {
            roomNo: roomList.join(", "),
            checkIn: reg?.checkinDate ? `${dayjs(reg.checkinDate).format(F)} ${reg.checkinTime || ""}`.trim() : `${date} ${e?.checkInTime || ""}`.trim(),
            checkOut: reg?.checkoutDate ? `${dayjs(reg.checkoutDate).format(F)} ${reg.checkoutTime || ""}`.trim() : e?.checkOutTime ? `${dayjs(date, F).add(1, "day").format(F)} ${e.checkOutTime}` : "",
            guests: Number(e?.noOfPeople) || 0,
          },
          items,
          paymentMode: e?.modeOfPayment && e.modeOfPayment !== "UnPaid" ? e.modeOfPayment : "",
          source: { type: "room", date, period, roomNo },
        },
        existing,
        found: !!e,
      },
    });
  } catch (e) {
    fail(res, e);
  }
});

// POST / → naya invoice (number server deta hai)
router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    const series = b.series === "NON" ? "NON" : "GST";
    const d = dayjs(b.invoiceDate, F, true);
    if (!d.isValid()) return bad(res, "Invalid invoice date");
    const gst = series === "GST";
    const inclusive = !!b.taxInclusive;
    const items = (Array.isArray(b.items) ? b.items : [])
      .map((it) => calcItem(it, inclusive, gst))
      .filter((it) => it.desc && it.qty > 0 && it.total > 0)
      .slice(0, 40);
    if (!items.length) return bad(res, "Add at least one item (name + amount)");
    const c = b.customer || {};
    const customer = {
      name: clean(c.name, 100),
      company: clean(c.company, 120),
      gstin: gst ? clean(c.gstin, 15).toUpperCase().replace(/\s/g, "") : "",
      address: clean(c.address, 250),
      mobile: clean(c.mobile, 15).replace(/[^\d+]/g, ""),
      state: clean(c.state, 40) || "Gujarat",
    };
    if (!customer.name && !customer.company) return bad(res, "Enter a guest or company name");
    if (customer.gstin && !GSTIN_RE.test(customer.gstin)) return bad(res, "Company GSTIN looks invalid (15 characters, e.g. 24ABCDE1234F1Z5)");

    const taxable = r2(items.reduce((s, x) => s + x.taxable, 0));
    const cgst = r2(items.reduce((s, x) => s + x.cgst, 0));
    const sgst = r2(items.reduce((s, x) => s + x.sgst, 0));
    const exact = taxable + cgst + sgst;
    const grandTotal = Math.round(exact);
    const fy = fyOf(d);

    const counter = await InvoiceCounter.findOneAndUpdate({ _id: `${series}-${fy}` }, { $inc: { seq: 1 } }, { upsert: true, new: true });
    const seq = counter.seq;
    const invoiceNo = `${SERIES[series]}/${fy.slice(2)}/${String(seq).padStart(4, "0")}`;
    const s = b.stay || {};
    const src = b.source || {};
    const inv = await Invoice.create({
      series,
      fy,
      seq,
      invoiceNo,
      invoiceDate: d.format(F),
      entryCreateDate: d.startOf("day").toDate(),
      business: BUSINESSES.includes(b.business) ? b.business : "Guest House",
      customer,
      stay: { roomNo: clean(s.roomNo, 20), checkIn: clean(s.checkIn, 30), checkOut: clean(s.checkOut, 30), guests: Number(s.guests) || 0 },
      items,
      taxInclusive: inclusive,
      taxable,
      cgst,
      sgst,
      roundOff: r2(grandTotal - exact),
      grandTotal,
      paymentMode: clean(b.paymentMode, 20),
      notes: clean(b.notes, 300),
      source: { type: src.type === "room" ? "room" : "manual", date: clean(src.date, 10), period: clean(src.period, 12), roomNo: Number(src.roomNo) || undefined },
      createdBy: who(req),
    });
    res.json({ success: true, data: inv });
  } catch (e) {
    fail(res, e);
  }
});

// GET /one/:id
router.get("/one/:id", async (req, res) => {
  try {
    const inv = await Invoice.findById(req.params.id).lean();
    if (!inv) return res.status(404).json({ success: false, message: "Invoice not found" });
    if (!canSee(req, inv)) return res.status(403).json({ success: false, message: "Staff can only view today's invoices." });
    res.json({ success: true, data: inv });
  } catch (e) {
    fail(res, e);
  }
});

// GET /by-room/:date/:roomNo → is room ke bane invoice
router.get("/by-room/:date/:roomNo", async (req, res) => {
  try {
    const list = await Invoice.find({ "source.date": req.params.date, "source.roomNo": Number(req.params.roomNo) }, { invoiceNo: 1, series: 1, status: 1, grandTotal: 1, createdAt: 1 }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /cancel/:id (sirf owner)
router.put("/cancel/:id", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can cancel an invoice" });
    const reason = clean(req.body?.reason, 200);
    if (!reason) return bad(res, "Enter a reason for cancelling");
    const inv = await Invoice.findById(req.params.id);
    if (!inv) return res.status(404).json({ success: false, message: "Not found" });
    if (inv.status === "cancelled") return bad(res, "Already cancelled");
    Object.assign(inv, { status: "cancelled", cancelReason: reason, cancelledBy: who(req), cancelledAt: new Date() });
    await inv.save();
    res.json({ success: true, data: inv });
  } catch (e) {
    fail(res, e);
  }
});

// GET /list/:start/:end → owner register (dono series)
router.get("/list/:start/:end", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can do this" });
    const s = dayjs(req.params.start, F, true);
    const e = dayjs(req.params.end, F, true);
    if (!s.isValid() || !e.isValid() || e.isBefore(s)) return bad(res, "Invalid date range");
    const list = await Invoice.find({ entryCreateDate: { $gte: s.startOf("day").toDate(), $lte: e.endOf("day").toDate() } })
      .sort({ series: 1, fy: 1, seq: 1 })
      .lean();
    res.json({ success: true, data: list });
  } catch (e) {
    fail(res, e);
  }
});

export default router;
