// Room charges: restaurant food bill (Levana baaki → room) + GH extra charges + vasooli.
// ⚠️ Sirf naya "roomcharges" collection likhta hai. Entry / RestEntry sirf PADHE jaate hain.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import RoomCharge from "../model/roomCharge.js";
import EntryLock from "../model/entryLock.js";
import Entry from "../model/entry.js";
import Room from "../model/room.js";
import Stay from "../model/stay.js";
import { allowedStaffDates, isAdminLike } from "../middleware/staffAccess.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const SOLD = ["day", "night", "extraDay", "extraNight"];
const PAID_MODES = ["Cash", "Card", "PPS", "PPC"];
const PERIOD_ORDER = { day: 1, extraDay: 2, night: 3, extraNight: 4 };

const who = (req) => req.user?.name || req.user?.email || "";
const n = (v) => Math.round((Number(v) || 0) * 100) / 100;
const clean = (v, max = 120) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const validDate = (d) => dayjs(d, F, true).isValid();
const dayStart = (d) => dayjs(d, F, true).startOf("day").toDate();
const fail = (res, e) => res.status(500).json({ success: false, message: e.message });
const bad = (res, message) => res.status(400).json({ success: false, message });
// Staff sirf aaj (aur grace time mein kal) ke charges badal sakta hai
const canTouch = (req, doc) => isAdminLike(req.user) || allowedStaffDates().includes(doc.date);

// GET /occupied/:date → Restaurant ke liye: aaj kaun se room mein kaun ruka hai
//   aaj ki GH entry + kal raat wale guest (jo aaj subah naashta karte hain) + saare rooms
router.get("/occupied/:date", async (req, res) => {
  try {
    const date = req.params.date;
    if (!validDate(date)) return bad(res, "Invalid date");
    const prev = dayjs(date, F).subtract(1, "day").format(F);
    const [today, yday, rooms] = await Promise.all([
      Entry.find({ date }, { entry: 1 }).lean(),
      Entry.find({ date: prev }, { entry: 1 }).lean(),
      Room.find({}, { roomNumber: 1, roomType: 1 }).lean(),
    ]);
    const out = [];
    const seen = new Set();
    const add = (e, from) => {
      if (!SOLD.includes(e.period) || !e.roomNo) return;
      const key = `${e.roomNo}|${String(e.fullname || "").trim().toLowerCase()}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push({
        roomNo: e.roomNo,
        period: from === "today" ? e.period : "",
        guestName: clean(e.fullname),
        mobile: e.mobileNumber && String(e.mobileNumber) !== "0" ? String(e.mobileNumber) : "",
        from, // today | yesterday
        fromPeriod: e.period,
      });
    };
    today.forEach((d) => (d.entry || []).sort((a, b) => (PERIOD_ORDER[a.period] || 9) - (PERIOD_ORDER[b.period] || 9)).forEach((e) => add(e, "today")));
    yday.forEach((d) => (d.entry || []).filter((e) => /night/i.test(e.period)).forEach((e) => add(e, "yesterday")));
    out.sort((a, b) => a.roomNo - b.roomNo);
    res.json({
      success: true,
      data: {
        guests: out,
        rooms: rooms.map((r) => r.roomNumber).filter(Boolean).sort((a, b) => a - b),
      },
    });
  } catch (e) {
    fail(res, e);
  }
});

// GET /rest/:restDate → restaurant ki Levana rows ka room link (reload pe dikhane ke liye)
router.get("/rest/:restDate", async (req, res) => {
  try {
    if (!validDate(req.params.restDate)) return bad(res, "Invalid date");
    const list = await RoomCharge.find({ source: "rest", restDate: req.params.restDate }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /rest-sync/:restDate  body { rows: [{ rowId, roomNo, period, guestName, mobile, amount }] }
// Restaurant entry save hone ke baad: us din ki "room" wali Levana rows ko room charges mein utaaro.
// Jo row hata di, uska charge bhi hat jaata hai. Paid status bachaa rehta hai.
router.put("/rest-sync/:restDate", async (req, res) => {
  let lockId = "";
  let locked = false;
  try {
    const restDate = req.params.restDate;
    if (!validDate(restDate)) return bad(res, "Invalid date");
    const rows = (Array.isArray(req.body?.rows) ? req.body.rows : [])
      .map((r) => ({
        rowId: Number(r.rowId) || 0,
        roomNo: Number(r.roomNo) || 0,
        period: SOLD.includes(r.period) ? r.period : "",
        guestName: clean(r.guestName),
        mobile: clean(r.mobile, 15).replace(/\D/g, ""),
        amount: n(r.amount),
      }))
      .filter((r) => r.roomNo > 0 && r.amount > 0)
      .slice(0, 100);

    // ek hi din ka sync ek waqt mein ek hi baar (do submit ek saath → double food bill nahi)
    lockId = `rest-sync:${restDate}`;
    for (let i = 0; i < 20 && !locked; i++) {
      try {
        await EntryLock.create({ _id: lockId });
        locked = true;
      } catch (e) {
        if (e?.code !== 11000) throw e;
        // purana atka taala (2 min se zyada) hata do
        await EntryLock.deleteOne({ _id: lockId, at: { $lt: new Date(Date.now() - 120000) } });
        await new Promise((ok) => setTimeout(ok, 300));
      }
    }
    if (!locked) return res.status(409).json({ success: false, message: "Room bills are being updated, please try again" });
    const old = await RoomCharge.find({ source: "rest", restDate });
    const used = new Set();
    const sameKey = (o, r) => o.roomNo === r.roomNo && n(o.amount) === r.amount && (o.period || "") === r.period;
    const by = who(req);
    for (const r of rows) {
      // pehle wahi charge dhoondo (room + amount same) taaki "Paid" na kho jaaye
      let doc = old.find((o) => !used.has(String(o._id)) && sameKey(o, r)) || old.find((o) => !used.has(String(o._id)) && o.restRowId === r.rowId);
      if (doc && doc.isPaid && !sameKey(doc, r)) {
        // paid charge waisa hi rahe (paisa mil chuka). Bill badha → sirf farak ka naya unpaid charge; ghata → kuch nahi
        used.add(String(doc._id));
        const extra = doc.roomNo === r.roomNo ? n(r.amount - n(doc.amount)) : r.amount;
        if (extra > 0)
          await RoomCharge.create({
            date: restDate,
            entryCreateDate: dayStart(restDate),
            roomNo: r.roomNo,
            period: r.period,
            guestName: r.guestName,
            mobile: r.mobile,
            kind: "food",
            label: doc.roomNo === r.roomNo ? "Restaurant food bill (added later)" : "Restaurant food bill",
            amount: extra,
            source: "rest",
            restDate,
            restRowId: r.rowId,
            enteredBy: by,
          });
        continue;
      }
      if (doc) {
        used.add(String(doc._id));
        Object.assign(doc, { roomNo: r.roomNo, period: r.period, guestName: r.guestName, mobile: r.mobile, amount: r.amount, restRowId: r.rowId, updatedBy: by });
        await doc.save();
      } else {
        await RoomCharge.create({
          date: restDate,
          entryCreateDate: dayStart(restDate),
          roomNo: r.roomNo,
          period: r.period,
          guestName: r.guestName,
          mobile: r.mobile,
          kind: "food",
          label: "Restaurant food bill",
          amount: r.amount,
          source: "rest",
          restDate,
          restRowId: r.rowId,
          enteredBy: by,
        });
      }
    }
    const remove = old.filter((o) => !used.has(String(o._id))).map((o) => o._id);
    if (remove.length) await RoomCharge.deleteMany({ _id: { $in: remove } });
    const list = await RoomCharge.find({ source: "rest", restDate }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    fail(res, e);
  } finally {
    if (locked) await EntryLock.deleteOne({ _id: lockId }).catch(() => {});
  }
});

// GET /day/:date → us din ke saare room charges (GH room card + editor)
router.get("/day/:date", async (req, res) => {
  try {
    const date = req.params.date;
    if (!validDate(date)) return bad(res, "Invalid date");
    const d = dayjs(date, F, true);
    const [list, stays] = await Promise.all([
      RoomCharge.find({ date }).sort({ roomNo: 1, createdAt: 1 }).lean(),
      // Room mein abhi ruka guest (ya aaj check-out hua): uske pichhle dinon ke food / extra bill bhi isi room screen par dikhen
      Stay.find(
        { startCreateDate: { $gte: d.subtract(60, "day").startOf("day").toDate(), $lt: d.startOf("day").toDate() }, $or: [{ status: "active" }, { checkoutDate: date }] },
        { roomNo: 1, startDate: 1 }
      ).lean(),
    ]);
    const earlier = [];
    const seenIds = new Set();
    // Kal raat ruka guest (night) aaj check-out karta hai — Stay record check-out par banta hai, isliye kal ki GH entry se bhi dekho
    const prev = d.subtract(1, "day").format(F);
    const yday = await Entry.find({ date: prev }, { entry: 1 }).lean();
    const nightRooms = [...new Set(yday.flatMap((x) => (x.entry || []).filter((e) => /night/i.test(e.period || "") && e.roomNo).map((e) => Number(e.roomNo))))];
    if (nightRooms.length) {
      const rows = await RoomCharge.find({ roomNo: { $in: nightRooms }, date: prev, $or: [{ isPaid: false }, { paidDate: date }] }).lean();
      rows.forEach((c) => {
        seenIds.add(String(c._id));
        earlier.push({ ...c, period: "", earlier: true });
      });
    }
    for (const st of stays) {
      const dates = [];
      for (let x = dayjs(st.startDate, F, true); x.isBefore(d, "day"); x = x.add(1, "day")) dates.push(x.format(F));
      if (!dates.length) continue;
      // Baaki wale + jo aaj hi wasool hue (taaki "✓ Paid" dikhe)
      const rows = await RoomCharge.find({ roomNo: st.roomNo, date: { $in: dates }, $or: [{ isPaid: false }, { paidDate: date }] }).lean();
      rows.forEach((c) => {
        if (seenIds.has(String(c._id))) return;
        seenIds.add(String(c._id));
        earlier.push({ ...c, period: "", earlier: true });
      });
    }
    res.json({ success: true, data: [...list, ...earlier] });
  } catch (e) {
    fail(res, e);
  }
});

// GET /paid-on/:date → aaj GH counter par kaun se food / extra bill wasool hue (kisi bhi din ke)
router.get("/paid-on/:date", async (req, res) => {
  try {
    if (!validDate(req.params.date)) return bad(res, "Invalid date");
    const list = await RoomCharge.find({ isPaid: true, paidDate: req.params.date }).sort({ updatedAt: 1 }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    fail(res, e);
  }
});

// POST /extra  body { date, period, roomNo, label, amount, guestName, mobile }
router.post("/extra", async (req, res) => {
  try {
    const b = req.body || {};
    if (!validDate(b.date)) return bad(res, "Invalid date");
    const roomNo = Number(b.roomNo) || 0;
    const amount = n(b.amount);
    const label = clean(b.label, 60);
    if (!roomNo || amount <= 0 || !label) return bad(res, "Fill in: room, item and amount");
    const doc = await RoomCharge.create({
      date: b.date,
      entryCreateDate: dayStart(b.date),
      roomNo,
      period: SOLD.includes(b.period) ? b.period : "",
      guestName: clean(b.guestName),
      mobile: clean(b.mobile, 15).replace(/\D/g, ""),
      kind: "extra",
      label,
      amount,
      source: "gh",
      enteredBy: who(req),
    });
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// DELETE /extra/:id → sirf GH wala extra charge (food bill restaurant se hi hatta hai)
router.delete("/extra/:id", async (req, res) => {
  try {
    const doc = await RoomCharge.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    if (doc.source !== "gh") return bad(res, "Remove the food bill from the restaurant entry");
    if (!canTouch(req, doc)) return res.status(403).json({ success: false, message: "Staff can only edit today's entries." });
    if (doc.isPaid && !isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can remove a paid charge" });
    await doc.deleteOne();
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

// PUT /paid/:id  body { isPaid, paidMode }
router.put("/paid/:id", async (req, res) => {
  try {
    const doc = await RoomCharge.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: "Not found" });
    const isPaid = !!req.body?.isPaid;
    // Wasooli (paid mark karna) pichhle dinon ke bill ki bhi ho sakti hai — guest agle din check-out karta hai. Wapas unpaid sirf owner.
    const recent = dayjs(doc.date, F, true).isAfter(dayjs().subtract(61, "day"));
    if (!canTouch(req, doc) && !(isPaid && !doc.isPaid && recent)) return res.status(403).json({ success: false, message: "Staff can only edit today's entries." });
    if (!isPaid && doc.isPaid && !isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can undo a paid charge" });
    if (isPaid && !PAID_MODES.includes(req.body?.paidMode)) return bad(res, "Select a payment mode");
    doc.isPaid = isPaid;
    doc.paidMode = isPaid ? req.body.paidMode : "";
    doc.paidDate = isPaid ? dayjs(new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)).format(F) : "";
    doc.paidBy = isPaid ? who(req) : "";
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

// GET /range/:start/:end → owner list (baaki food bills, extra charges)
router.get("/range/:start/:end", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can do this" });
    const s = dayjs(req.params.start, F, true);
    const e = dayjs(req.params.end, F, true);
    if (!s.isValid() || !e.isValid() || e.isBefore(s)) return bad(res, "Invalid date range");
    const list = await RoomCharge.find({ entryCreateDate: { $gte: s.startOf("day").toDate(), $lte: e.endOf("day").toDate() } })
      .sort({ entryCreateDate: 1, roomNo: 1 })
      .lean();
    res.json({ success: true, data: list });
  } catch (e) {
    fail(res, e);
  }
});

export default router;
