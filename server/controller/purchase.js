// Restaurant purchase bills (scan / manual). ⚠️ Sirf naya "purchasebills" collection + uploads/purchase-bills photos.
import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import PurchaseBill from "../model/purchaseBill.js";
import { allowedStaffDates, isAdminLike } from "../middleware/staffAccess.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const PHOTO_DIR = path.resolve(process.cwd(), "uploads", "purchase-bills");
fs.mkdirSync(PHOTO_DIR, { recursive: true });
const clean = (v, max = 120) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const who = (req) => req.user?.name || req.user?.email || "";
const ok = (d) => dayjs(d, F, true).isValid();
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const dateOk = (req, d) => isAdminLike(req.user) || allowedStaffDates().includes(d);

const fields = (b) => ({
  billDate: clean(b.billDate, 20),
  billNo: clean(b.billNo, 40),
  vendor: {
    _id: clean(b.vendor?._id, 40),
    name: clean(b.vendor?.name, 100),
    expenseName: clean(b.vendor?.expenseName, 100),
    categoryName: clean(b.vendor?.categoryName, 100),
    isVendor: !!b.vendor?.isVendor,
  },
  amount: Math.round((Number(b.amount) || 0) * 100) / 100,
  mode: b.mode === "Payable" ? "Payable" : "Cash",
  items: (Array.isArray(b.items) ? b.items : []).slice(0, 60).map((x) => ({ name: clean(x.name, 80), qty: clean(x.qty, 20), amount: Number(x.amount) || 0 })),
  note: clean(b.note, 300),
  source: b.source === "scan" ? "scan" : "manual",
  ocrText: String(b.ocrText || "").slice(0, 5000),
  rowKey: clean(b.rowKey, 40),
});

// GET /day/:date → us din ke bills
router.get("/day/:date", async (req, res) => {
  try {
    if (!ok(req.params.date)) return bad(res, "Invalid date");
    const list = await PurchaseBill.find({ date: req.params.date }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST / → naya bill
router.post("/", async (req, res) => {
  try {
    const b = req.body || {};
    if (!ok(b.date)) return bad(res, "Invalid date");
    if (!dateOk(req, b.date)) return bad(res, "Only today's bills can be added", 403);
    const f = fields(b);
    if (!(f.amount > 0)) return bad(res, "Bill amount is required");
    if (!f.vendor.name && !f.vendor.expenseName) return bad(res, "Choose the vendor / expense item");
    if (f.mode === "Payable" && !f.vendor.isVendor) return bad(res, "For Payable, choose a listed vendor");
    const doc = await PurchaseBill.create({ ...f, date: b.date, entryCreateDate: dayjs(b.date, F).startOf("day").toDate(), enteredBy: who(req) });
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /:id → badlaav
router.put("/:id([a-f0-9]{24})", async (req, res) => {
  try {
    const doc = await PurchaseBill.findById(req.params.id);
    if (!doc) return bad(res, "Bill not found", 404);
    if (!dateOk(req, doc.date)) return bad(res, "Only today's bills can be changed", 403);
    const f = fields(req.body || {});
    if (!(f.amount > 0)) return bad(res, "Bill amount is required");
    if (f.mode === "Payable" && !f.vendor.isVendor) return bad(res, "For Payable, choose a listed vendor");
    Object.assign(doc, f, { updatedBy: who(req) });
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// DELETE /:id → hatao (aaj ka; owner koi bhi)
router.delete("/:id([a-f0-9]{24})", async (req, res) => {
  try {
    const doc = await PurchaseBill.findById(req.params.id);
    if (!doc) return bad(res, "Bill not found", 404);
    if (!dateOk(req, doc.date)) return bad(res, "Only today's bills can be removed", 403);
    await PurchaseBill.deleteOne({ _id: doc._id });
    res.json({ success: true, data: { rowKey: doc.rowKey } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// POST /:id/photo { image: "data:image/jpeg;base64,..." }
router.post("/:id([a-f0-9]{24})/photo", async (req, res) => {
  try {
    const doc = await PurchaseBill.findById(req.params.id);
    if (!doc) return bad(res, "Bill not found", 404);
    if (!dateOk(req, doc.date)) return bad(res, "Only today's bills can be changed", 403);
    const m = String(req.body?.image || "").match(/^data:image\/(jpeg|png|webp);base64,(.+)$/);
    if (!m) return bad(res, "Photo must be JPG/PNG");
    const buf = Buffer.from(m[2], "base64");
    if (buf.length > 3 * 1024 * 1024) return bad(res, "Photo is too large (3MB max)");
    if (doc.photos.length >= 6) return bad(res, "Maximum 6 photos per bill");
    const name = `${doc._id}-${crypto.randomBytes(4).toString("hex")}.${m[1] === "jpeg" ? "jpg" : m[1]}`;
    fs.writeFileSync(path.join(PHOTO_DIR, name), buf);
    doc.photos.push(name);
    await doc.save();
    res.json({ success: true, data: doc });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /photo/:name → bill ki photo (owner + staff dono dekh sakte hain)
router.get("/photo/:name", (req, res) => {
  const name = path.basename(req.params.name);
  const file = path.join(PHOTO_DIR, name);
  if (!fs.existsSync(file)) return bad(res, "Photo not found", 404);
  res.sendFile(file);
});

// GET /range/:from/:to → owner: register
router.get("/range/:from/:to", async (req, res) => {
  try {
    if (!isAdminLike(req.user)) return bad(res, "Only the owner can see the bill register", 403);
    const { from, to } = req.params;
    if (!ok(from) || !ok(to)) return bad(res, "Invalid date");
    const list = await PurchaseBill.find({ entryCreateDate: { $gte: dayjs(from, F).startOf("day").toDate(), $lte: dayjs(to, F).endOf("day").toDate() } })
      .sort({ entryCreateDate: -1, createdAt: -1 })
      .lean();
    res.json({ success: true, data: list });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
