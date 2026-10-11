// 🔐 Dashboard password: Super Admin login ke baad dashboard kholne ke liye ek alag password.
// - Password app ke code mein nahi, database mein (bcrypt hash) har admin ka alag: appsettings "dashPassword:<adminId>"
// - Sahi password → "dash_unlock" cookie (browser band hone tak / max 12 ghante)
// - Dashboard wali report APIs (owner, insights, forecast, biz, performance, ...) bina unlock ke 423 dengi
// - Password bhool gaye → apna admin LOGIN password daal ke naya bana sakte hain
import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import process from "process";
import AppSetting from "../model/appSetting.js";
import Admin from "../model/admin.js";

const router = Router();
const COOKIE = "dash_unlock";
const OPTS = { httpOnly: true, sameSite: "none", secure: true };
const isAdmin = (u) => u?.constructor?.modelName === "Admin";
const key = (id) => `dashPassword:${id}`;
const tag = (hash) => String(hash).slice(-12); // password badla → purane unlock khatam

// chhota cache taaki har report call pe DB na jaaye
const cache = new Map(); // adminId -> { hash, at }
const getHash = async (id) => {
  const c = cache.get(String(id));
  if (c && Date.now() - c.at < 30000) return c.hash;
  const hash = (await AppSetting.findById(key(id)).lean())?.value?.hash || null;
  cache.set(String(id), { hash, at: Date.now() });
  return hash;
};

export const dashState = async (req) => {
  const hash = await getHash(req.user._id);
  if (!hash) return { set: false, unlocked: true };
  try {
    const d = jwt.verify(req.cookies?.[COOKIE] || "", process.env.JWT_SECRET_KEY);
    return { set: true, unlocked: d.k === "dash" && String(d.id) === String(req.user._id) && d.v === tag(hash) };
  } catch {
    return { set: true, unlocked: false };
  }
};

// Sirf dashboard ki report APIs. Entry wale raaste (entry, restEntry, officeBook, quick ...) isse bahar.
const LOCKED = ["/api/v1/owner", "/api/v1/insights", "/api/v1/forecast", "/api/v1/biz", "/api/v1/performance", "/api/v1/staff-accounts", "/api/v1/office-types", "/api/v1/backup"];
export const dashGuard = async (req, res, next) => {
  if (!isAdmin(req.user)) return next();
  const path = req.originalUrl.split("?")[0];
  if (!LOCKED.some((p) => path === p || path.startsWith(p + "/"))) return next();
  try {
    const s = await dashState(req);
    if (s.unlocked) return next();
    return res.status(423).json({ success: false, dashLocked: true, message: "Dashboard is locked. Please enter the dashboard password." });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

const unlockCookie = (res, adminId, hash) =>
  res.cookie(COOKIE, jwt.sign({ id: String(adminId), k: "dash", v: tag(hash) }, process.env.JWT_SECRET_KEY, { expiresIn: "12h" }), OPTS);

// galat password: 5 baar ke baad 15 minute ruko
const fails = new Map();
const blocked = (id) => {
  const f = fails.get(String(id));
  return f && f.until > Date.now() ? Math.ceil((f.until - Date.now()) / 60000) : 0;
};
const fail = (id) => {
  const f = fails.get(String(id)) || { n: 0, until: 0 };
  f.n += 1;
  if (f.n >= 5) { f.until = Date.now() + 15 * 60 * 1000; f.n = 0; }
  fails.set(String(id), f);
};

router.use((req, res, next) => (isAdmin(req.user) ? next() : res.status(403).json({ success: false, message: "Only Super Admin" })));

router.get("/status", async (req, res) => {
  try {
    res.json({ success: true, data: await dashState(req) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/unlock", async (req, res) => {
  try {
    const wait = blocked(req.user._id);
    if (wait) return res.status(429).json({ success: false, message: `Too many wrong tries. Try again after ${wait} minute(s).` });
    const hash = await getHash(req.user._id);
    if (!hash) return res.status(400).json({ success: false, message: "No dashboard password set yet." });
    if (!(await bcrypt.compare(String(req.body?.password || ""), hash))) {
      fail(req.user._id);
      return res.status(401).json({ success: false, message: "Wrong dashboard password" });
    }
    fails.delete(String(req.user._id));
    unlockCookie(res, req.user._id, hash);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Naya / badalna: { password, current? , loginPassword? }
// Pehli baar: sirf naya password. Baad mein: purana dashboard password YA admin login password (bhool gaye to).
router.post("/set", async (req, res) => {
  try {
    const wait = blocked(req.user._id);
    if (wait) return res.status(429).json({ success: false, message: `Too many wrong tries. Try again after ${wait} minute(s).` });
    const pw = String(req.body?.password || "");
    if (pw.length < 4 || pw.length > 64) return res.status(400).json({ success: false, message: "Password must be 4 to 64 characters." });
    const old = await getHash(req.user._id);
    if (old) {
      let ok = false;
      if (req.body?.current) ok = await bcrypt.compare(String(req.body.current), old);
      if (!ok && req.body?.loginPassword) {
        const admin = await Admin.findById(req.user._id).select("+password");
        ok = !!admin && (await admin.comparePassword(String(req.body.loginPassword)));
      }
      if (!ok) {
        fail(req.user._id);
        return res.status(401).json({ success: false, message: "Old dashboard password (or your login password) is wrong." });
      }
    }
    const hash = await bcrypt.hash(pw, 10);
    await AppSetting.updateOne({ _id: key(req.user._id) }, { $set: { value: { hash }, at: new Date() } }, { upsert: true });
    cache.delete(String(req.user._id));
    fails.delete(String(req.user._id));
    unlockCookie(res, req.user._id, hash);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/lock", (req, res) => {
  res.clearCookie(COOKIE, OPTS);
  res.json({ success: true });
});

export const clearDashCookie = (res) => res.clearCookie(COOKIE, OPTS);
export default router;
