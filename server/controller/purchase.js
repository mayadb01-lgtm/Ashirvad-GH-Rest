// Restaurant purchase bills (scan / manual). ⚠️ Sirf naya "purchasebills" collection + uploads/purchase-bills photos.
import { Router } from "express";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import PurchaseBill from "../model/purchaseBill.js";
import PurchaseItem from "../model/purchaseItem.js";
import { applyBillRates, catalogItems } from "./rasoi.js";
import { allowedStaffDates, isAdminLike, dateOk as staffDateOk } from "../middleware/staffAccess.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const PHOTO_DIR = path.resolve(process.cwd(), "uploads", "purchase-bills");
fs.mkdirSync(PHOTO_DIR, { recursive: true });
const clean = (v, max = 120) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const who = (req) => req.user?.name || req.user?.email || "";
const ok = (d) => dayjs(d, F, true).isValid();
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const dateOk = (req, d) => staffDateOk(req, d);

const CATKEYS = new Set(catalogItems().map((x) => x.key));
const fields = (b) => withTotals({
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
  book: b.book === "office" ? "office" : "rest",
  // Restaurant: sirf Cash / Payable. Office: Cash / PP / PPS / PPC / Payable
  mode: (b.book === "office" ? ["Cash", "PP", "PPS", "PPC", "Payable"] : ["Cash", "Payable"]).includes(b.mode) ? b.mode : "Cash",
  items: (Array.isArray(b.items) ? b.items : [])
    .slice(0, 80)
    .map((x) => ({ key: CATKEYS.has(clean(x.key, 30)) ? clean(x.key, 30) : "", name: clean(x.name, 80), qty: Number(x.qty) || 0, unit: clean(x.unit, 12), rate: Math.round((Number(x.rate) || 0) * 100) / 100, amount: Math.round((Number(x.amount) || 0) * 100) / 100 }))
    .filter((x) => x.name || x.amount),
  extra: Math.round((Number(b.extra) || 0) * 100) / 100,
  note: clean(b.note, 300),
  source: b.source === "scan" ? "scan" : "manual",
  ocrText: String(b.ocrText || "").slice(0, 5000),
  rowKey: clean(b.rowKey, 40),
});

// Items ka jod + extra = grand total (items hon to bill amount yahi)
function withTotals(f) {
  const itemsTotal = Math.round(f.items.reduce((t, x) => t + (Number(x.amount) || 0), 0) * 100) / 100;
  return { ...f, itemsTotal, ...(f.items.length ? { amount: Math.round((itemsTotal + f.extra) * 100) / 100 } : {}) };
}

// Items ki yaad update (bill save / badlaav par)
const rememberItems = async (bill) => {
  const vid = bill.vendor?._id || "";
  for (const it of bill.items || []) {
    const key = it.key ? `k:${it.key}` : String(it.name || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;
    const set = { name: String(it.name).trim(), ckey: it.key || "", unit: it.unit || "kg", lastRate: Number(it.rate) || 0, lastVendorId: vid, lastDate: bill.date };
    if (vid && Number(it.rate)) set[`vendorRates.${vid}`] = Number(it.rate);
    await PurchaseItem.updateOne({ key }, { $set: set, $inc: { uses: 1 } }, { upsert: true }).catch(() => {});
  }
};

// GET /items → yaad wale items (sabse zyada use pehle)
router.get("/items", async (req, res) => {
  try {
    const list = await PurchaseItem.find({}, { key: 0, __v: 0 }).sort({ uses: -1, updatedAt: -1 }).limit(1000).lean();
    res.json({ success: true, data: list, catalog: catalogItems() });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /last/:vendorId → us vendor ka aakhri bill (wahi items dobara)
router.get("/last/:vendorId", async (req, res) => {
  try {
    const vid = clean(req.params.vendorId, 40);
    const last = await PurchaseBill.findOne({ "vendor._id": vid, "items.0": { $exists: true } }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: last ? { date: last.date, items: last.items, amount: last.amount } : null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /day/:date → us din ke bills
router.get("/day/:date", async (req, res) => {
  try {
    if (!ok(req.params.date)) return bad(res, "Invalid date");
    const book = req.query.book === "office" ? "office" : "rest";
    const q = book === "office" ? { date: req.params.date, book: "office" } : { date: req.params.date, book: { $ne: "office" } };
    const list = await PurchaseBill.find(q).sort({ createdAt: 1 }).lean();
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
    if (!f.items.length) return bad(res, "Add the bill items (item, qty, rate)");
    if (!(f.amount > 0)) return bad(res, "Bill amount is required");
    if (!f.vendor.name && !f.vendor.expenseName) return bad(res, "Choose the vendor / expense item");
    if (f.mode === "Payable" && !f.vendor.isVendor) return bad(res, "For Payable, choose a listed vendor");
    const doc = await PurchaseBill.create({ ...f, date: b.date, entryCreateDate: dayjs(b.date, F).startOf("day").toDate(), enteredBy: who(req) });
    await rememberItems(doc);
    await applyBillRates(doc, req.user);
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
    if (!f.items.length) return bad(res, "Add the bill items (item, qty, rate)");
    if (!(f.amount > 0)) return bad(res, "Bill amount is required");
    if (f.mode === "Payable" && !f.vendor.isVendor) return bad(res, "For Payable, choose a listed vendor");
    Object.assign(doc, f, { book: doc.book, updatedBy: who(req) });
    await doc.save();
    await rememberItems(doc);
    await applyBillRates(doc, req.user);
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

// GET /analytics/:from/:to (DD-MM-YYYY) → owner: kharid ka hisaab — mahina, vendor, item, mode
router.get("/analytics/:from/:to", async (req, res) => {
  try {
    if (!isAdminLike(req.user) && req.reportOk !== "purchase-analytics") return bad(res, "Only the owner can see purchase analytics", 403);
    const { from, to } = req.params;
    if (!ok(from) || !ok(to)) return bad(res, "Invalid date");
    const q = { entryCreateDate: { $gte: dayjs(from, F).startOf("day").toDate(), $lte: dayjs(to, F).endOf("day").toDate() } };
    if (req.query.book === "rest") q.book = { $ne: "office" };
    if (req.query.book === "office") q.book = "office";
    const bills = await PurchaseBill.find(q).lean();
    const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
    const total = { amount: 0, bills: bills.length, paid: 0, payable: 0 };
    const byMonth = {};
    const byVendor = {};
    const byMode = {};
    const byBook = { rest: 0, office: 0 };
    const items = {};
    bills.forEach((b) => {
      const amt = Number(b.amount) || 0;
      total.amount += amt;
      if (b.mode === "Payable") total.payable += amt;
      else total.paid += amt;
      const mk = dayjs(b.entryCreateDate).format("YYYY-MM");
      byMonth[mk] = byMonth[mk] || { month: mk, label: dayjs(mk + "-01").format("MMM YY"), amount: 0, bills: 0, payable: 0 };
      byMonth[mk].amount += amt;
      byMonth[mk].bills += 1;
      if (b.mode === "Payable") byMonth[mk].payable += amt;
      const vk = b.vendor?.name || b.vendor?.expenseName || "—";
      byVendor[vk] = byVendor[vk] || { vendor: vk, category: b.vendor?.categoryName || "", amount: 0, bills: 0, payable: 0, lastDate: "" };
      byVendor[vk].amount += amt;
      byVendor[vk].bills += 1;
      if (b.mode === "Payable") byVendor[vk].payable += amt;
      if (!byVendor[vk].lastDate || dayjs(b.date, F).isAfter(dayjs(byVendor[vk].lastDate, F))) byVendor[vk].lastDate = b.date;
      byMode[b.mode] = (byMode[b.mode] || 0) + amt;
      byBook[b.book === "office" ? "office" : "rest"] += amt;
      (b.items || []).forEach((it) => {
        const ik = `${String(it.name || "").trim().toLowerCase()}|${it.unit || ""}`;
        if (!it.name) return;
        const x = (items[ik] = items[ik] || { item: String(it.name).trim(), unit: it.unit || "", qty: 0, amount: 0, bills: 0, minRate: null, maxRate: null, lastRate: 0, lastDate: "" });
        x.qty += Number(it.qty) || 0;
        x.amount += Number(it.amount) || 0;
        x.bills += 1;
        const rt = Number(it.rate) || 0;
        if (rt) {
          x.minRate = x.minRate === null ? rt : Math.min(x.minRate, rt);
          x.maxRate = x.maxRate === null ? rt : Math.max(x.maxRate, rt);
          if (!x.lastDate || !dayjs(b.date, F).isBefore(dayjs(x.lastDate, F))) {
            x.lastRate = rt;
            x.lastDate = b.date;
          }
        }
      });
    });
    const itemList = Object.values(items)
      .map((x) => ({ ...x, qty: r2(x.qty), amount: r2(x.amount), avgRate: x.qty ? r2(x.amount / x.qty) : 0, minRate: r2(x.minRate), maxRate: r2(x.maxRate) }))
      .sort((a, b) => b.amount - a.amount);
    res.json({
      success: true,
      data: {
        total: { ...total, amount: r2(total.amount), paid: r2(total.paid), payable: r2(total.payable) },
        months: Object.values(byMonth).sort((a, b) => a.month.localeCompare(b.month)).map((m) => ({ ...m, amount: r2(m.amount), payable: r2(m.payable) })),
        vendors: Object.values(byVendor).sort((a, b) => b.amount - a.amount).map((v) => ({ ...v, amount: r2(v.amount), payable: r2(v.payable) })),
        modes: Object.entries(byMode).map(([mode, amount]) => ({ mode, amount: r2(amount) })).sort((a, b) => b.amount - a.amount),
        books: { rest: r2(byBook.rest), office: r2(byBook.office) },
        items: itemList,
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
