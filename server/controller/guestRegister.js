// Govt / police guest register: details + document photo + CSV export.
// ⚠️ Sirf naya "guestregisters" collection. Purani GH entries ko ye file chhooti bhi nahi.
import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import GuestRegister from "../model/guestRegister.js";
import { isAdminLike } from "../middleware/staffAccess.js";
import Stay from "../model/stay.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const PERIODS = ["day", "night", "extraDay", "extraNight"];
const PHOTO_DIR = path.resolve(process.cwd(), "uploads", "guest-docs");
fs.mkdirSync(PHOTO_DIR, { recursive: true });

const FIELDS = [
  "firstName", "middleName", "lastName", "companyName", "houseNo", "address", "locality", "country", "state",
  "district", "city", "zipCode", "dob", "mobile", "phone", "email", "comingFrom", "goingTo", "documentType",
  "documentNumber", "checkinDate", "checkinTime", "checkoutDate", "checkoutTime", "children", "adults",
  "vehicleType", "vehicleNo",
];
const clean = (v, max = 200) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const who = (req) => req.user?.name || req.user?.email || "";

const keyOf = (req, res) => {
  const date = req.params.date;
  const period = req.params.period;
  const roomNo = Number(req.params.roomNo);
  if (!dayjs(date, F, true).isValid() || !PERIODS.includes(period) || !roomNo) {
    res.status(400).json({ success: false, message: "Invalid date / period / room" });
    return null;
  }
  return { date, period, roomNo };
};

// Ek din ke saare records (Nayi Entry mein room card pe 📄 dikhane ke liye)
router.get("/day/:date", async (req, res) => {
  try {
    if (!dayjs(req.params.date, F, true).isValid()) return res.status(400).json({ success: false, message: "Invalid date" });
    const list = await GuestRegister.find({ date: req.params.date }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Ek room ka record
router.get("/one/:date/:period/:roomNo", async (req, res) => {
  try {
    const k = keyOf(req, res);
    if (!k) return;
    const doc = await GuestRegister.findOne(k).lean();
    res.json({ success: true, data: doc || null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Save / update (koi bhi field compulsory nahi)
router.put("/one/:date/:period/:roomNo", async (req, res) => {
  try {
    const k = keyOf(req, res);
    if (!k) return;
    const b = req.body || {};
    const set = {};
    FIELDS.forEach((f) => {
      if (b[f] === undefined) return;
      set[f] = f === "children" || f === "adults" ? Math.max(0, Math.min(50, Number(b[f]) || 0)) : clean(b[f], f === "address" ? 500 : 200);
    });
    if (Array.isArray(b.otherGuests)) {
      set.otherGuests = b.otherGuests.slice(0, 10).map((g) => ({
        fullName: clean(g?.fullName),
        mobile: clean(g?.mobile, 15),
        documentType: clean(g?.documentType, 50),
        documentNumber: clean(g?.documentNumber, 50),
      }));
    }
    set.updatedBy = who(req);
    const doc = await GuestRegister.findOneAndUpdate(
      k,
      { $set: set, $setOnInsert: { ...k, entryCreateDate: dayjs(k.date, F).toDate(), enteredBy: who(req) } },
      { new: true, upsert: true }
    ).lean();
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Document photo upload: body { image: "data:image/jpeg;base64,..." } (app khud chhota karke bhejta hai)
router.post("/one/:date/:period/:roomNo/photo", async (req, res) => {
  try {
    const k = keyOf(req, res);
    if (!k) return;
    const m = String(req.body?.image || "").match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!m) return res.status(400).json({ success: false, message: "Photo must be JPG/PNG" });
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 3 * 1024 * 1024) return res.status(400).json({ success: false, message: "Photo is too large (3MB max)" });
    const doc = await GuestRegister.findOneAndUpdate(
      k,
      { $setOnInsert: { ...k, entryCreateDate: dayjs(k.date, F).toDate(), enteredBy: who(req) } },
      { new: true, upsert: true }
    );
    if (doc.documentImages.length >= 4) return res.status(400).json({ success: false, message: "Maximum 4 photos per guest" });
    const name = `${doc._id}-${crypto.randomBytes(4).toString("hex")}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
    fs.writeFileSync(path.join(PHOTO_DIR, name), buf);
    doc.documentImages.push(name);
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: doc.toObject() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Photo dekhna: sirf owner/admin (staff sirf upload kar sakta hai)
router.get("/photo/:name", (req, res) => {
  if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can view photos" });
  const name = path.basename(req.params.name);
  const file = path.join(PHOTO_DIR, name);
  if (!fs.existsSync(file)) return res.status(404).json({ success: false, message: "Photo not found" });
  res.sendFile(file);
});

// Photo hatana: sirf owner/admin
router.delete("/one/:date/:period/:roomNo/photo/:name", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can do this" });
    const k = keyOf(req, res);
    if (!k) return;
    const name = path.basename(req.params.name);
    const doc = await GuestRegister.findOneAndUpdate(k, { $pull: { documentImages: name } }, { new: true }).lean();
    fs.rmSync(path.join(PHOTO_DIR, name), { force: true });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Date range list + CSV (sirf owner/admin)
const COLS = [
  ["First Name", "firstName"], ["Middle Name", "middleName"], ["Last Name", "lastName"], ["Company Name", "companyName"],
  ["House/Flat No.", "houseNo"], ["Address", "address"], ["Locality", "locality"], ["Country", "country"], ["State", "state"],
  ["District", "district"], ["City", "city"], ["Zip Code", "zipCode"], ["Date of birth", "dob"], ["Mobile No.", "mobile"],
  ["Phone No.", "phone"], ["Email Address", "email"], ["Coming From", "comingFrom"], ["Going To", "goingTo"],
  ["Document Type", "documentType"], ["Document Number", "documentNumber"], ["Room Number", "roomNo"],
  ["Checkin Date", "checkinDate"], ["Checkin Time", "checkinTime"], ["Checkout Date", "checkoutDate"],
  ["Checkout Time", "checkoutTime"], ["No. of Child", "children"], ["No. of Adult", "adults"], ["Vehicle Type", "vehicleType"],
  ["Vehicle Registration No.", "vehicleNo"],
];
const rangeQuery = (req, res) => {
  const s = dayjs(req.params.start, F, true);
  const e = dayjs(req.params.end, F, true);
  if (!s.isValid() || !e.isValid() || e.isBefore(s)) {
    res.status(400).json({ success: false, message: "Invalid date range" });
    return null;
  }
  return { entryCreateDate: { $gte: s.startOf("day").toDate(), $lte: e.endOf("day").toDate() } };
};

router.get("/range/:start/:end", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can do this" });
    const q = rangeQuery(req, res);
    if (!q) return;
    const list = await GuestRegister.find(q).sort({ entryCreateDate: 1, roomNo: 1 }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.get("/csv/:start/:end", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Only the owner can do this" });
    const q = rangeQuery(req, res);
    if (!q) return;
    const list = await GuestRegister.find(q).sort({ entryCreateDate: 1, roomNo: 1 }).lean();
    const esc = (v) => {
      const s = String(v ?? "");
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const head = [...COLS.map((c) => c[0])];
    for (let i = 1; i <= 3; i++) head.push(`Other Guest ${i} Full Name`, `Other Guest ${i} Mobile Number`, `Other Guest ${i} Document Type`, `Other Guest ${i} Document Number`);
    const lines = [head.map(esc).join(",")];
    list.forEach((d) => {
      const row = COLS.map(([, k]) => d[k]);
      for (let i = 0; i < 3; i++) {
        const g = d.otherGuests?.[i] || {};
        row.push(g.fullName, g.mobile, g.documentType, g.documentNumber);
      }
      lines.push(row.map(esc).join(","));
    });
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="guest-register_${req.params.start}_to_${req.params.end}.csv"`);
    res.send("﻿" + lines.join("\r\n"));
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /pending/:date → registration baaki: kal check-in hue guests (aaj ke settlement se pehle zaroori) + aaj ke
// Sirf naye system se check-in hue guest (roomstays mein us din shuru hua stay) — purane din / ruke hue guest nahi.
export const REQUIRED = [
  ["firstName", "First name"],
  ["mobile", "Mobile"],
  ["address", "Address"],
  ["city", "City"],
  ["state", "State"],
  ["documentType", "Document type"],
  ["documentNumber", "Document number"],
];
router.get("/pending/:date", async (req, res) => {
  try {
    const d = dayjs(req.params.date, F, true);
    if (!d.isValid()) return res.status(400).json({ success: false, message: "Invalid date" });
    const dates = [d.subtract(1, "day").format(F), d.format(F)];
    const [stays, regs] = await Promise.all([Stay.find({ startDate: { $in: dates } }).lean(), GuestRegister.find({ date: { $in: dates } }).lean()]);
    const out = { yesterday: [], today: [] };
    stays.forEach((s) => {
      const r = regs.find((x) => x.date === s.startDate && x.period === s.period && x.roomNo === s.roomNo);
      const missing = REQUIRED.filter(([k]) => !String(r?.[k] || "").trim()).map(([, l]) => l);
      if (!missing.length) return;
      const item = { date: s.startDate, period: s.period, roomNo: s.roomNo, guest: s.guest, missing };
      (s.startDate === dates[0] ? out.yesterday : out.today).push(item);
    });
    out.yesterday.sort((a, b) => a.roomNo - b.roomNo);
    out.today.sort((a, b) => a.roomNo - b.roomNo);
    res.json({ success: true, data: out });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
