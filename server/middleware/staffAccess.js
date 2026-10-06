// 🔒 Staff privacy rules (server pe lagu, isliye link se seedha kholne pe bhi kaam karta hai)
//
// - Admin / Super User: sab kuch (koi badlaav nahi)
// - Staff: SIRF apne department (gh / rest / office) ki, SIRF AAJ ki entry
//   (raat ki late entry ke liye subah STAFF_GRACE_HOURS baje tak "kal" bhi)
// - Staff ke liye reports, dashboards, purani dates, dusra business: sab band
// - "Allowed" list ke bahar ki har request = 403

const pad = (n) => String(n).padStart(2, "0");
const IST_OFFSET_MS = 330 * 60 * 1000;
const fmt = (d) => `${pad(d.getUTCDate())}-${pad(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}`;

// Staff kaun si dates chhoo sakta hai (India time)
export const allowedStaffDates = () => {
  const grace = Number(process.env.STAFF_GRACE_HOURS ?? 3);
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const today = fmt(nowIst);
  const dates = [today];
  if (grace > 0 && nowIst.getUTCHours() < grace) {
    dates.push(fmt(new Date(nowIst.getTime() - 24 * 3600 * 1000)));
  }
  return dates;
};

export const isAdminLike = (user) =>
  !!user && (user.constructor?.modelName === "Admin" || user.role === "Admin" || user.isSuperUser === true);

// [method, path regex, options]
//   dateParam: regex group number jisme date hai
//   dateBody:  body ka field jisme date hai
const R = (method, re, opts = {}) => ({ method, re, ...opts });
const LISTS = {
  rooms: R("GET", /^\/api\/v1\/room$/),
  restStaff: R("GET", /^\/api\/v1\/restStaff\/get-staff-id-name-mobile$/),
  pendingUsers: R("GET", /^\/api\/v1\/restPending\/get-all-pending-users$/),
  restCats: R("GET", /^\/api\/v1\/restCategory\/get-categories$/),
  officeCats: R("GET", /^\/api\/v1\/officeBook\/get-categories$/),
};
const dayStatus = R("GET", /^\/api\/v1\/quick\/day-status\/([^/]+)$/, { dateParam: 1 });

const RULES = {
  common: [R("GET", /^\/api\/v1\/user\/getuser$/), R("GET", /^\/api\/v1\/quick\/me$/)],
  gh: [
    LISTS.rooms,
    R("GET", /^\/api\/v1\/entry\/get-entry\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/entry\/create-entry$/, { dateBody: "date" }),
    R("GET", /^\/api\/v1\/entry\/get-unpaid-entries$/), // Pending jama ke liye
    R("GET", /^\/api\/v1\/quick\/guest\/\d{10}$/), // purana guest
    dayStatus,
  ],
  rest: [
    LISTS.restStaff,
    LISTS.pendingUsers,
    LISTS.restCats,
    R("GET", /^\/api\/v1\/restEntry\/get-entry\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/restEntry\/create-entry$/, { dateBody: "createDate" }),
    R("PUT", /^\/api\/v1\/restEntry\/update-entry\/([^/]+)$/, { dateParam: 1, dateBody: "createDate" }),
    dayStatus,
  ],
  office: [
    LISTS.officeCats,
    LISTS.restCats,
    LISTS.pendingUsers,
    LISTS.restStaff,
    R("GET", /^\/api\/v1\/officeBook\/get-entry\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/officeBook\/create-entry$/, { dateBody: "createDate" }),
    R("PUT", /^\/api\/v1\/officeBook\/update-entry\/([^/]+)$/, { dateParam: 1, dateBody: "createDate" }),
    dayStatus,
  ],
};

const deny = (res, message, code = 403) => res.status(code).json({ success: false, message, staffBlocked: true });

export const staffGuard = (req, res, next) => {
  const user = req.user;
  if (isAdminLike(user)) return next();

  const path = req.originalUrl.split("?")[0].replace(/\/+$/, "");
  const method = req.method;

  // getuser / me hamesha (taaki app sahi message dikha sake)
  if (RULES.common.some((r) => r.method === method && r.re.test(path))) return next();

  if (user?.isActive === false) return deny(res, "Aapka account band hai. Owner se baat karo.");
  const dept = user?.department || "none";
  if (!RULES[dept] || dept === "common") {
    return deny(res, "Aapko abhi kisi business ka access nahi mila. Owner se department set karwao.");
  }

  const rule = RULES[dept].find((r) => r.method === method && r.re.test(path));
  if (!rule) return deny(res, "Ye page/report staff ke liye nahi hai.");

  const allowed = allowedStaffDates();
  if (rule.dateParam) {
    const d = decodeURIComponent(path.match(rule.re)[rule.dateParam] || "");
    if (!allowed.includes(d)) return deny(res, "Staff sirf aaj ki entry dekh/bhar sakta hai.");
  }
  if (rule.dateBody) {
    const d = String(req.body?.[rule.dateBody] ?? "");
    const mustMatch = rule.dateParam ? decodeURIComponent(path.match(rule.re)[rule.dateParam]) : null;
    if (!allowed.includes(d) || (mustMatch && d !== mustMatch)) {
      return deny(res, "Staff sirf aaj ki entry bhar sakta hai.");
    }
  }
  return next();
};

export default staffGuard;
