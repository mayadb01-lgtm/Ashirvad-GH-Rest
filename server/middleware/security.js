// Security gate for every /api/v1 request.
//
// 1. Login zaroori: neeche PUBLIC list ke alawa koi bhi API bina login nahi chalegi.
// 2. DELETE sirf Admin / Super User: staff din ka data mita nahi sakta.
// 2b. Staff sirf apne department ki, sirf aaj ki entry (staffAccess.js).
// 3. Login / signup / reset pe brute-force rok: 15 minute mein 10 galat koshish.
import { isAuthenticated } from "./auth.js";
import { staffGuard, isAdminLike } from "./staffAccess.js";
import { dashGuard } from "../controller/dashLock.js";
import { viewOnlyGate } from "../utils/viewScale.js";

const PUBLIC_ROUTES = new Set([
  "POST /api/v1/user/create-user",
  "POST /api/v1/user/login-user",
  "GET /api/v1/user/logout-user",
  "POST /api/v1/user/reset-password",
  "POST /api/v1/admin/create-admin",
  "POST /api/v1/admin/login-admin",
  "POST /api/v1/admin/verify-otp",
  "POST /api/v1/admin/reset-password/request",
  "POST /api/v1/admin/reset-password",
  // external scheduler (cron-job.org etc.) – protected by secret key inside the route
  "GET /api/v1/backup/run-scheduled",
  // doosre hotel ka server — route ke andar GROUP_KEY se check
  "GET /api/v1/group/summary",
  // staff bharti ka khula form (spam rok jobs.js + rate limit)
  "GET /api/v1/jobs/open",
  "POST /api/v1/jobs/apply",
  "POST /api/v1/pos-sync",
]);

const RATE_LIMITED = new Set([
  "POST /api/v1/user/create-user",
  "POST /api/v1/user/login-user",
  "POST /api/v1/user/reset-password",
  "POST /api/v1/admin/create-admin",
  "POST /api/v1/admin/login-admin",
  "POST /api/v1/admin/verify-otp",
  "POST /api/v1/admin/reset-password/request",
  "POST /api/v1/admin/reset-password",
  "GET /api/v1/backup/run-scheduled",
  "GET /api/v1/group/summary",
  "POST /api/v1/jobs/apply",
  "POST /api/v1/pos-sync",
]);

const routeKey = (req) => `${req.method} ${req.originalUrl.split("?")[0].replace(/\/+$/, "")}`;

/* ---------- tiny in-memory rate limiter (no extra package needed) ---------- */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;
const attempts = new Map(); // ip|route -> { count, resetAt }

const rateLimit = (req, res, next) => {
  const ip = (req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
  const key = `${ip}|${routeKey(req)}`;
  const now = Date.now();
  const rec = attempts.get(key);
  if (!rec || rec.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  rec.count += 1;
  if (rec.count > MAX_ATTEMPTS) {
    const mins = Math.ceil((rec.resetAt - now) / 60000);
    return res.status(429).json({
      success: false,
      message: `Too many attempts. Please try again after ${mins} minute(s).`,
    });
  }
  return next();
};
// purane records saaf karte raho
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of attempts) if (v.resetAt < now) attempts.delete(k);
}, WINDOW_MS).unref();


export const apiGate = (req, res, next) => {
  if (req.method === "OPTIONS") return next(); // CORS preflight
  const key = routeKey(req);

  if (PUBLIC_ROUTES.has(key)) {
    return RATE_LIMITED.has(key) ? rateLimit(req, res, next) : next();
  }

  return isAuthenticated(req, res, () => {
    // Staff Admin (malik ne banaya) bhi entry wali cheezein hata sake — kaun si, wo staffGuard tay karta hai
    if (req.method === "DELETE" && !isAdminLike(req.user) && req.user?.isEntryAdmin !== true) {
      return res.status(403).json({ success: false, message: "Only admin can delete data." });
    }
    // Staff: sirf apna department + sirf aaj (staffAccess.js)
    // Super Admin: dashboard ki report APIs ke liye dashboard password (dashLock.js)
    // View-only account (malik ka banaya): sirf reports, aankde kam (utils/viewScale.js)
    return viewOnlyGate(req, res, () => staffGuard(req, res, () => dashGuard(req, res, next)));
  });
};

export default apiGate;
