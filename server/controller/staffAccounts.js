// Owner/Admin: staff accounts ka department aur chalu/band set karna
import { Router } from "express";
import User from "../model/user.js";
import { isAdminLike, REPORTS, MODULES, clearAccessCache } from "../middleware/staffAccess.js";
import UserAccess from "../model/userAccess.js";
import LoginLog from "../model/loginLog.js";
import { logLogin } from "../utils/loginLog.js";

const router = Router();
const DEPTS = ["none", "gh", "rest", "office", "manager"];

router.use((req, res, next) => {
  if (isAdminLike(req.user) && req.user.constructor?.modelName === "Admin") return next();
  return res.status(403).json({ success: false, message: "Only the owner can do this" });
});

// GET /api/v1/staff-accounts
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, { name: 1, email: 1, department: 1, isActive: 1, isSuperUser: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
    const acc = Object.fromEntries((await UserAccess.find({}).lean()).map((a) => [a.userId, a]));
    res.json({
      success: true,
      data: users.map((u) => ({ ...u, department: u.department || "none", isActive: u.isActive !== false, access: acc[String(u._id)] || null })),
      reports: Object.entries(REPORTS).map(([key, r]) => ({ key, label: r.label })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/staff-accounts/:id  { department?, isActive? }
router.put("/:id", async (req, res) => {
  try {
    const patch = {};
    if (req.body.department !== undefined) {
      if (!DEPTS.includes(req.body.department)) return res.status(400).json({ success: false, message: "Invalid department" });
      patch.department = req.body.department;
    }
    if (req.body.isActive !== undefined) patch.isActive = !!req.body.isActive;
    const u = await User.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true, projection: { name: 1, email: 1, department: 1, isActive: 1, isSuperUser: 1 } });
    if (!u) return res.status(404).json({ success: false, message: "Staff not found" });
    res.json({ success: true, data: u });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/v1/staff-accounts { name, email, password } — Super Admin khud naya staff account banaye (bina signup code)
router.post("/", async (req, res) => {
  try {
    const name = String(req.body?.name || "").trim().slice(0, 60);
    const email = String(req.body?.email || "").trim().toLowerCase().slice(0, 100);
    const password = String(req.body?.password || "");
    if (!name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ success: false, message: "Enter name and a valid email" });
    if (password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    if (await User.findOne({ email: new RegExp(`^${email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) return res.status(400).json({ success: false, message: "This email already has an account" });
    const u = await User.create({ name, email, password });
    res.json({ success: true, message: `${name}: account created. Now set the access.`, data: { _id: u._id, name, email, department: "none", isActive: true, access: null } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/staff-accounts/login-log?from=YYYY-MM-DD&to=YYYY-MM-DD — kaun kab kahan se login hua (sirf Super Admin)
router.get("/login-log", async (req, res) => {
  try {
    const IST = 330 * 60 * 1000;
    const day = (s, end) => {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ""));
      if (!m) return null;
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], end ? 23 : 0, end ? 59 : 0, end ? 59 : 0) - IST);
    };
    const to = day(req.query.to, true) || new Date();
    const from = day(req.query.from) || new Date(to.getTime() - 7 * 24 * 3600 * 1000);
    const rows = await LoginLog.find({ at: { $gte: from, $lte: to } }).sort({ at: -1 }).limit(3000).lean();
    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/staff-accounts/:id/access  { modules, entryDays (null = koi bhi din), reports, reportDays (null = koi rok nahi), classic (purane entry pages), canEdit (submit ke baad badlav) }
router.put("/:id/access", async (req, res) => {
  try {
    const u = await User.findById(req.params.id, { name: 1 }).lean();
    if (!u) return res.status(404).json({ success: false, message: "Staff not found" });
    const b = req.body || {};
    const days = (v, max) => (v === null || v === "" || v === undefined ? null : Math.min(max, Math.max(0, Math.round(Number(v) || 0))));
    const doc = {
      modules: [...new Set((b.modules || []).filter((m) => MODULES.includes(m)))],
      entryDays: days(b.entryDays, 3650),
      reports: [...new Set((b.reports || []).filter((r) => REPORTS[r]))],
      reportDays: days(b.reportDays, 3650),
      classic: b.classic !== false,
      canEdit: b.canEdit === true,
      updatedBy: req.user?.name || req.user?.email || "",
    };
    const saved = await UserAccess.findOneAndUpdate({ userId: String(u._id) }, { $set: doc }, { upsert: true, new: true }).lean();
    clearAccessCache(u._id);
    res.json({ success: true, data: saved, message: `${u.name}: access saved` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/staff-accounts/:id/password  { password } — Super Admin staff ka naya password set kare
router.put("/:id/password", async (req, res) => {
  try {
    const password = String(req.body?.password || "");
    if (password.length < 6) return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
    const u = await User.findById(req.params.id);
    if (!u) return res.status(404).json({ success: false, message: "Staff not found" });
    u.password = password;
    await u.save();
    logLogin(req, { kind: "staff", event: "reset", user: u, note: `New password set by ${req.user?.name || "Super Admin"}` });
    res.json({ success: true, message: `New password set for ${u.name}` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
