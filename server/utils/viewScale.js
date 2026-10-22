// 👁️ View-only account (malik ka banaya): sirf reports, aur har rupaye ka aankda ek % kam (jaise 20%).
// Asli data kabhi nahi badalta — sirf is account ko bheja gaya jawab chhota kiya jaata hai.
// Ginti (rooms, din, guests), %, saal / mahina waise hi rehte hain.

export const isViewOnly = (u) => !!u && u.viewOnly === true;
export const scaleOf = (u) => {
  const s = Number(u?.viewScale);
  return isViewOnly(u) && s > 0 && s <= 1 ? s : 1;
};

// In keys ki seedhi value (number) nahi badalti
const KEEP =
  /^(m|year|month|day|days|dayno|order|n|nrooms|rooms.*|roomno|roomnumber|.*count|stays|daystays|nightstays|bookings|guests|people|.*nights|room_nights|occ|occupancy|.*pct|pct|percent|margin|share|repeatshare|repeatguests|.*days|.*_days|entries|week|age|dayssincelast|connected|growth|changepct|first|last|has.*|code|status|minhours|gstpercent|taxrate|shrink|.*err|.*x|w|index|id|_id|__v|mobile.*|phone.*|zipcode|dayscounted|daysinmonth|pastcount|basedon|band|label|mon|date|today|from|to|start|end|name|item|source|kind|event|action|tone|occupied|periods)$/i;
// In keys ke andar ka poora object waise hi (ginti / hisaab ke niyam)
const KEEP_OBJ = /^(type|.*err|window|periods|method|coverage)$/i;

const RUPEE = /₹\s?([\d,]+(?:\.\d+)?)/g;
const scaleText = (s, f) => s.replace(RUPEE, (all, num) => `₹${Math.round(Number(num.replace(/,/g, "")) * f).toLocaleString("en-IN")}`);

export const scaleDeep = (v, f, key = "") => {
  if (f === 1 || v == null) return v;
  if (key && KEEP_OBJ.test(key)) return v;
  if (key && typeof v !== "object" && KEEP.test(key)) return v;
  if (typeof v === "number") return Number.isFinite(v) ? (Number.isInteger(v) ? Math.round(v * f) : Math.round(v * f * 100) / 100) : v;
  if (typeof v === "string") return key === "text" || key === "message" ? scaleText(v, f) : v;
  if (Array.isArray(v)) return v.map((x) => (x && typeof x === "object" ? scaleDeep(x, f, "") : scaleDeep(x, f, key)));
  if (typeof v === "object") {
    if (v instanceof Date) return v;
    const out = {};
    Object.entries(v).forEach(([k, x]) => (out[k] = scaleDeep(x, f, k)));
    return out;
  }
  return v;
};

// Is account ke liye khuli API (sirf dekhna)
const REPORTS = ["/api/v1/owner", "/api/v1/insights", "/api/v1/forecast", "/api/v1/biz/daily", "/api/v1/biz/goals", "/api/v1/performance", "/api/v1/group/dashboard"];
const OPEN = ["GET /api/v1/quick/me", "GET /api/v1/admin/getadmin", "GET /api/v1/admin/logout-admin"];

// apiGate login ke baad ise chalata hai
export const viewOnlyGate = (req, res, next) => {
  const u = req.user;
  if (!isViewOnly(u)) return next();
  const path = req.originalUrl.split("?")[0].replace(/\/+$/, "");
  const key = `${req.method} ${path}`;
  const isReport = req.method === "GET" && REPORTS.some((p) => path === p || path.startsWith(p + "/"));
  const isLock = path.startsWith("/api/v1/dash-lock/");
  if (!isReport && !isLock && !OPEN.includes(key)) {
    return res.status(403).json({ success: false, viewOnly: true, message: "This account can only view reports." });
  }
  if (isReport) {
    const f = scaleOf(u);
    const json = res.json.bind(res);
    res.json = (body) => json(body && body.success !== false ? scaleDeep(body, f) : body);
  }
  return next();
};
