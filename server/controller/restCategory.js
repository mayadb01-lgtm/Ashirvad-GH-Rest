import { Router } from "express";
import RestCategory from "../model/restCategory.js";
import PurchaseBill from "../model/purchaseBill.js";
import { effectiveAccess, rasoiAllowed } from "../middleware/staffAccess.js";
const router = Router();

// ───── Vendor: aasaan tarika (entry screen se hi naya vendor, duplicate se bachav) ─────
const who = (req) => req.user?.name || req.user?.email || "";
const isOwner = (u) => u?.constructor?.modelName === "Admin" && u.viewOnly !== true;
const isAdminLike = (u) => !!u && (u.constructor?.modelName === "Admin" || u.role === "Admin" || u.isSuperUser === true);
const clean = (v, max = 60) => String(v ?? "").replace(/[<>\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const nk = (s) => String(s || "").toLowerCase().replace(/\b(m\/s|ms|shree|shri|sri|the|and|&|traders?|trading|enterprises?|agency|agencies|stores?|co|company|pvt|ltd)\b/g, "").replace(/[^a-z0-9\u0900-\u097f]+/g, "");
const lev = (a, b) => {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m || !n) return m + n;
  let p = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const c = [i];
    for (let j = 1; j <= n; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[n];
};
const SUPPLIES = ["Sabzi", "Dairy", "Kirana", "Oil & Ghee", "Atta & Rice", "Masala", "Packing", "Gas", "Cleaning", "Drinks", "Bakery", "Maintenance", "Other"];
const vendorOut = (c, x) => ({
  _id: String(x._id),
  expenseName: x.expenseName,
  categoryName: c.categoryName,
  categoryId: String(c._id),
  isVendor: !!x.isVendor,
  mobile: x.mobile || "",
  gstin: x.gstin || "",
  supplies: x.supplies || [],
  payTerms: x.payTerms || "",
  note: x.note || "",
  addedBy: x.addedBy || "",
  addedAt: x.addedAt || null,
});
// Milte-julte naam (duplicate na bane): same / ek doosre mein / 1-2 akshar ka farak
const similar = (cats, name, skipId) => {
  const k = nk(name);
  if (!k) return [];
  const out = [];
  for (const c of cats)
    for (const x of c.expense || []) {
      if (skipId && String(x._id) === String(skipId)) continue;
      const e = nk(x.expenseName);
      if (!e) continue;
      const d = lev(k, e);
      const close = e === k || (k.length >= 4 && (e.includes(k) || k.includes(e))) || d <= (k.length > 8 ? 2 : 1);
      if (close) out.push({ ...vendorOut(c, x), exact: e === k, dist: e === k ? 0 : d });
    }
  return out.sort((a, b) => a.dist - b.dist).slice(0, 5);
};

// GET /vendors → saare vendors (jaankari + aakhri bill) · staff bhi (entry screen ke liye)
router.get("/vendors", async (req, res) => {
  try {
    const cats = await RestCategory.find({}).lean();
    const list = cats.flatMap((c) => (c.expense || []).filter((x) => x.isVendor).map((x) => vendorOut(c, x)));
    // aakhri bill + 90 din ka maal (sirf owner ko)
    if (isAdminLike(req.user) && list.length) {
      const since = new Date(Date.now() - 90 * 864e5);
      const agg = await PurchaseBill.aggregate([
        { $match: { "vendor._id": { $in: list.map((v) => v._id) }, cancelled: { $ne: true } } },
        { $group: { _id: "$vendor._id", last: { $max: "$entryCreateDate" }, bills: { $sum: 1 }, amt90: { $sum: { $cond: [{ $gte: ["$entryCreateDate", since] }, "$amount", 0] } } } },
      ]).catch(() => []);
      const m = new Map(agg.map((a) => [String(a._id), a]));
      list.forEach((v) => {
        const a = m.get(v._id);
        if (a) Object.assign(v, { lastBill: a.last, bills: a.bills, amt90: Math.round(a.amt90 || 0) });
      });
    }
    res.set("Cache-Control", "no-store").json({ success: true, data: list, categories: cats.map((c) => ({ _id: String(c._id), categoryName: c.categoryName, vendors: (c.expense || []).filter((x) => x.isVendor).length })), supplies: SUPPLIES });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// GET /vendor-check?name= → milte-julte naam (type karte waqt chetavni)
router.get("/vendor-check", async (req, res) => {
  try {
    const cats = await RestCategory.find({}, { categoryName: 1, expense: 1 }).lean();
    res.json({ success: true, data: similar(cats, clean(req.query.name)) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

const vendorFields = (b) => {
  const f = {};
  if (b.mobile !== undefined) {
    const m = String(b.mobile || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
    if (m && !/^[6-9]\d{9}$/.test(m)) throw Object.assign(new Error("Mobile must be 10 digits"), { status: 400 });
    f.mobile = m;
  }
  if (b.gstin !== undefined) {
    const g = String(b.gstin || "").toUpperCase().replace(/\s+/g, "");
    if (g && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(g)) throw Object.assign(new Error("GSTIN looks wrong (15 characters, like 24ABCDE1234F1Z5)"), { status: 400 });
    f.gstin = g;
  }
  if (b.supplies !== undefined) f.supplies = (Array.isArray(b.supplies) ? b.supplies : []).map((x) => clean(x, 20)).filter((x) => SUPPLIES.includes(x)).slice(0, 6);
  if (b.payTerms !== undefined) f.payTerms = ["Cash", "Payable"].includes(b.payTerms) ? b.payTerms : "";
  if (b.note !== undefined) f.note = clean(b.note, 200);
  return f;
};

// POST /vendor { name, categoryName, mobile, gstin, supplies, payTerms, note, force } → naya vendor (staff bhi, entry screen se)
router.post("/vendor", async (req, res) => {
  try {
    // Naya vendor sirf Manager (jise Manager ka access hai) ya malik bana sakta hai
    if (!isAdminLike(req.user)) {
      const acc = await effectiveAccess(req.user).catch(() => null);
      if (!rasoiAllowed(req.user, acc)) return res.status(403).json({ success: false, message: "Only the manager or owner can add a new vendor. Ask the manager." });
    }
    const b = req.body || {};
    const name = clean(b.name, 60);
    if (name.length < 2) return res.status(400).json({ success: false, message: "Write the vendor name" });
    let extra;
    try {
      extra = vendorFields(b);
    } catch (e) {
      return res.status(e.status || 400).json({ success: false, message: e.message });
    }
    const cats = await RestCategory.find({}).lean();
    const sim = similar(cats, name);
    const exact = sim.find((s) => s.exact);
    if (exact) {
      if (exact.isVendor) return res.status(409).json({ success: false, code: "exists", message: `"${exact.expenseName}" is already a vendor (${exact.categoryName})`, matches: sim });
      // pehle se kharch item hai → wahi vendor bana do (naya duplicate nahi)
      if (!isAdminLike(req.user) && !b.force) return res.status(409).json({ success: false, code: "item", message: `"${exact.expenseName}" already exists as an expense item in ${exact.categoryName}. Use it as vendor?`, matches: sim });
      const set = { "expense.$.isVendor": true, "expense.$.addedBy": who(req), "expense.$.addedAt": new Date() };
      for (const [k, v] of Object.entries(extra)) set[`expense.$.${k}`] = v;
      await RestCategory.updateOne({ "expense._id": exact._id }, { $set: set });
      const c = await RestCategory.findOne({ "expense._id": exact._id }).lean();
      return res.json({ success: true, data: vendorOut(c, c.expense.find((x) => String(x._id) === exact._id)), converted: true });
    }
    if (sim.length && !b.force) return res.status(409).json({ success: false, code: "similar", message: "A vendor with a similar name exists. Is it the same?", matches: sim });
    const catName = clean(b.categoryName, 40) || "Vendors";
    let cat = await RestCategory.findOne({ categoryName: new RegExp(`^${catName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") });
    if (!cat) {
      if (!isAdminLike(req.user) && cats.length) cat = await RestCategory.findOne({ categoryName: /vendor/i });
      if (!cat) cat = await RestCategory.create({ categoryName: catName, categoryDescription: `${catName} (added from the entry screen)`, expense: [] });
    }
    cat.expense.push({ expenseName: name, expenseDescription: extra.supplies?.length ? extra.supplies.join(", ") : "Vendor", isVendor: true, ...extra, addedBy: who(req), addedAt: new Date() });
    await cat.save();
    const x = cat.expense[cat.expense.length - 1];
    res.json({ success: true, data: vendorOut(cat.toObject(), x.toObject ? x.toObject() : x) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// PUT /vendor/:id → jaankari badalna (sirf owner). Naam badla to purane bills/khate ka naam wahi rehta hai — isliye chetavni.
router.put("/vendor/:id([a-f0-9]{24})", async (req, res) => {
  try {
    if (!isOwner(req.user)) return res.status(403).json({ success: false, message: "Only the owner can change vendor details" });
    const b = req.body || {};
    let extra;
    try {
      extra = vendorFields(b);
    } catch (e) {
      return res.status(e.status || 400).json({ success: false, message: e.message });
    }
    const set = {};
    for (const [k, v] of Object.entries(extra)) set[`expense.$.${k}`] = v;
    if (b.isVendor !== undefined) set["expense.$.isVendor"] = !!b.isVendor;
    if (b.name !== undefined) {
      const name = clean(b.name, 60);
      if (name.length < 2) return res.status(400).json({ success: false, message: "Write the vendor name" });
      const cats = await RestCategory.find({}, { categoryName: 1, expense: 1 }).lean();
      const ex = similar(cats, name, req.params.id).find((s) => s.exact);
      if (ex) return res.status(409).json({ success: false, message: `"${ex.expenseName}" already exists (${ex.categoryName})` });
      set["expense.$.expenseName"] = name;
    }
    const r = await RestCategory.updateOne({ "expense._id": req.params.id }, { $set: set });
    if (!r.matchedCount) return res.status(404).json({ success: false, message: "Vendor not found" });
    const c = await RestCategory.findOne({ "expense._id": req.params.id }).lean();
    res.json({ success: true, data: vendorOut(c, c.expense.find((x) => String(x._id) === req.params.id)) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Create a new Category
router.post("/create-category", async (req, res) => {
  try {
    const reqBody = req.body;

    // Check if category name already exists
    const existingCategory = await RestCategory.findOne({
      categoryName: reqBody.categoryName,
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category name already exists",
      });
    }

    const category = await RestCategory.create({
      categoryName: reqBody.categoryName,
      categoryDescription: reqBody.categoryDescription,
      expense: reqBody.expense,
    });

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get all Categories
router.get("/get-categories", async (req, res) => {
  try {
    const categories = await RestCategory.find();

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get a Category - categoryName
router.get("/get-category-name", async (req, res) => {
  try {
    const categories = await RestCategory.find({}, { categoryName: 1 });

    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get All Expenses - Flattened Response
// router.get("/get-expenses", async (req, res) => {
//   try {
//     const categories = await RestCategory.find({}, { expense: 1 });
//     // const allExpenses = categories.flatMap((category) =>
//     //   category.expense.map((exp) => ({
//     //     _id: exp._id,
//     //     expenseName: exp.expenseName,
//     //     isVendor: exp.isVendor,
//     //   })),
//     // );

//     const allExpenses = categories.flatMap((category) => {
//       return category.expense.flatMap((exp) => {
//         if (exp.isVendor) {
//           return {
//             _id: exp._id,
//             expenseName: exp.expenseName,
//             isVendor: exp.isVendor,
//             categoryName: category.categoryName,
//           };
//         }
//         return [];
//       });
//     });

//     console.log("allExpenses", allExpenses);

//     res.status(200).json({
//       success: true,
//       data: allExpenses,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

// Get a categoryName by expenseName
router.get("/get-category-name/:id", async (req, res) => {
  try {
    const category = await RestCategory.findOne({
      "expense._id": req.params.id,
    });

    res.status(200).json({
      success: true,
      data: category?.categoryName || "",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update a Category
router.put("/update-category/:id", async (req, res) => {
  try {
    const reqBody = req.body;

    // Purane page se save: vendor ki jaankari (mobile, GST…) jo page nahi bhejta, wo bachi rahe
    const prev = await RestCategory.findById(req.params.id).lean();
    const keep = new Map((prev?.expense || []).map((x) => [String(x._id), x]));
    const KEEP = ["mobile", "gstin", "supplies", "payTerms", "note", "addedBy", "addedAt"];
    const expense = (Array.isArray(reqBody.expense) ? reqBody.expense : []).map((x) => {
      const o = x?._id && keep.get(String(x._id));
      if (!o) return x;
      const y = { ...x };
      for (const k of KEEP) if (y[k] === undefined && o[k] !== undefined) y[k] = o[k];
      return y;
    });
    const category = await RestCategory.findByIdAndUpdate(
      req.params.id,
      {
        categoryName: reqBody.categoryName,
        categoryDescription: reqBody.categoryDescription,
        expense,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete a Category
router.delete("/delete-category/:id", async (req, res) => {
  try {
    const category = await RestCategory.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
