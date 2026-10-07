// Office category types: owner batata hai kaunsi Office Book line Business / Personal / Loan / EMI / Transfer / Udhaar-wapas hai.
// ⚠️ Office Book (officebooks) sirf PADHA jaata hai. Save sirf naye collection "officecategorytypes" mein.
import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
import { isAdminLike } from "../middleware/staffAccess.js";
import OfficeBook from "../model/officeBook.js";
import OfficeType from "../model/officeType.js";
import { OFFICE_TYPES, nk, defaultType, loadOfficeClassifier, clearOfficeTypeCache, lineName } from "../utils/officeTypes.js";

const router = Router();
router.use(isAuthenticated, (req, res, next) => (isAdminLike(req.user) ? next() : res.status(403).json({ success: false, message: "Owner/Admin only" })));

const fail = (res, e) => res.status(500).json({ success: false, message: e.message });
const n = (v) => Number(v) || 0;

// GET /api/v1/office-types → har (side, category, naam) ka total + abhi ka type
router.get("/", async (req, res) => {
  try {
    const [docs, rules, classify] = await Promise.all([
      OfficeBook.find({}, { officeIn: 1, officeOut: 1 }).lean(),
      OfficeType.find({}).lean(),
      loadOfficeClassifier(),
    ]);
    const saved = new Map(rules.map((r) => [`${r.side}|${nk(r.categoryName)}|${r.expenseName}`, r.type]));
    const rows = new Map();
    const cats = new Map();
    const add = (side, x) => {
      const cat = String(x.categoryName || "Other").trim();
      const name = String(lineName(x)).trim();
      const k = `${side}|${nk(cat)}|${nk(name)}`;
      const r = rows.get(k) || { side, categoryName: cat, expenseName: name, count: 0, amount: 0, last: "" };
      r.count += 1;
      r.amount += n(x.amount);
      if (x.createDate) r.last = r.last && cmpDate(r.last) > cmpDate(x.createDate) ? r.last : x.createDate;
      rows.set(k, r);
      const ck = `${side}|${nk(cat)}`;
      const c = cats.get(ck) || { side, categoryName: cat, count: 0, amount: 0 };
      c.count += 1;
      c.amount += n(x.amount);
      cats.set(ck, c);
    };
    docs.forEach((d) => {
      (d.officeIn || []).forEach((x) => add("in", x));
      (d.officeOut || []).forEach((x) => add("out", x));
    });
    const out = [...rows.values()].map((r) => ({
      ...r,
      amount: Math.round(r.amount),
      type: classify(r.side, r.categoryName, r.expenseName),
      catType: saved.get(`${r.side}|${nk(r.categoryName)}|*`) || defaultType(r.side, r.categoryName, ""),
      own: saved.has(`${r.side}|${nk(r.categoryName)}|${nk(r.expenseName)}`),
    }));
    const categories = [...cats.values()].map((c) => ({
      ...c,
      amount: Math.round(c.amount),
      type: saved.get(`${c.side}|${nk(c.categoryName)}|*`) || defaultType(c.side, c.categoryName, ""),
      own: saved.has(`${c.side}|${nk(c.categoryName)}|*`),
    }));
    res.json({ success: true, data: { types: OFFICE_TYPES, rows: out, categories } });
  } catch (e) {
    fail(res, e);
  }
});
const cmpDate = (d) => String(d).split("-").reverse().join("");

// PUT /api/v1/office-types  { side, categoryName, expenseName ("*" = poori category), type | "default" }
router.put("/", async (req, res) => {
  try {
    const side = req.body?.side;
    const categoryName = nk(req.body?.categoryName);
    const expenseName = req.body?.expenseName === "*" ? "*" : nk(req.body?.expenseName);
    const type = req.body?.type;
    if (!["in", "out"].includes(side) || !categoryName || !expenseName) return res.status(400).json({ success: false, message: "Side, category and name are required" });
    const q = { side, categoryName, expenseName };
    if (type === "default") await OfficeType.deleteOne(q);
    else if (OFFICE_TYPES.includes(type)) await OfficeType.updateOne(q, { $set: { type, updatedBy: req.user?.email || req.user?.name || "" } }, { upsert: true });
    else return res.status(400).json({ success: false, message: "Unknown type" });
    clearOfficeTypeCache();
    res.json({ success: true });
  } catch (e) {
    fail(res, e);
  }
});

export default router;
