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
  const grace = Number(process.env.STAFF_GRACE_HOURS ?? 2); // din raat 12 baje band, 2 ghante settle karne ke liye
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const today = fmt(nowIst);
  const dates = [today];
  if (grace > 0 && nowIst.getUTCHours() < grace) {
    dates.push(fmt(new Date(nowIst.getTime() - 24 * 3600 * 1000)));
  }
  return dates;
};

// Guest registration / checkout: check-in ka din aur agla din (aaj + kal)
export const twoDayWindow = () => {
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  return [fmt(nowIst), fmt(new Date(nowIst.getTime() - 24 * 3600 * 1000))];
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
    // Govt guest register (sirf aaj ka; photo dekhna sirf admin)
    R("GET", /^\/api\/v1\/guest-register\/day\/([^/]+)$/, { dateParam: 1 }),
    R("GET", /^\/api\/v1\/guest-register\/one\/([^/]+)\/[A-Za-z]+\/\d+$/, { dateParam: 1, window2: true }),
    R("PUT", /^\/api\/v1\/guest-register\/one\/([^/]+)\/[A-Za-z]+\/\d+$/, { dateParam: 1, window2: true }),
    R("POST", /^\/api\/v1\/guest-register\/one\/([^/]+)\/[A-Za-z]+\/\d+\/photo$/, { dateParam: 1, window2: true }),
    R("GET", /^\/api\/v1\/guest-register\/pending\/([^/]+)$/, { dateParam: 1 }),
    // Room charges: food bill dekhna, extra charge jodna/hatana, vasooli (id wale routes andar date check karte hain)
    R("GET", /^\/api\/v1\/room-charges\/day\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/room-charges\/extra$/, { dateBody: "date" }),
    R("DELETE", /^\/api\/v1\/room-charges\/extra\/[a-f0-9]{24}$/),
    R("PUT", /^\/api\/v1\/room-charges\/paid\/[a-f0-9]{24}$/),
    // Invoice (GST / Non-GST): sirf aaj ka banana/dekhna; cancel + register sirf owner
    R("GET", /^\/api\/v1\/invoice\/room-prefill\/([^/]+)\/[A-Za-z]+\/\d+$/, { dateParam: 1 }),
    R("GET", /^\/api\/v1\/invoice\/by-room\/([^/]+)\/\d+$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/invoice$/, { dateBody: "invoiceDate" }),
    R("GET", /^\/api\/v1\/invoice\/one\/[a-f0-9]{24}$/),
    // Continue stay / checkout
    R("GET", /^\/api\/v1\/stay\/day\/([^/]+)$/, { dateParam: 1 }),
    R("PUT", /^\/api\/v1\/stay\/plan$/, { dateBody: "startDate" }),
    R("POST", /^\/api\/v1\/stay\/checkout$/, { dateBody: "date" }),
    R("PUT", /^\/api\/v1\/stay\/undo-checkout\/[a-f0-9]{24}$/),
    R("PUT", /^\/api\/v1\/stay\/extend\/[a-f0-9]{24}$/),
    // Advance booking (advance hamesha aaj ki date se; cancel sirf owner)
    R("GET", /^\/api\/v1\/booking\/upcoming$/),
    R("POST", /^\/api\/v1\/booking$/),
    R("PUT", /^\/api\/v1\/booking\/[a-f0-9]{24}$/),
    R("POST", /^\/api\/v1\/booking\/[a-f0-9]{24}\/advance$/),
    R("PUT", /^\/api\/v1\/booking\/[a-f0-9]{24}\/checkin$/, { dateBody: "date" }),
    R("GET", /^\/api\/v1\/booking\/for-room\/([^/]+)\/\d+$/, { dateParam: 1 }),
    dayStatus,
  ],
  rest: [
    LISTS.restStaff,
    LISTS.pendingUsers,
    LISTS.restCats,
    R("GET", /^\/api\/v1\/restEntry\/get-entry\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/restEntry\/create-entry$/, { dateBody: "createDate" }),
    R("PUT", /^\/api\/v1\/restEntry\/update-entry\/([^/]+)$/, { dateParam: 1, dateBody: "createDate" }),
    // Levana baaki → room (kaun sa room, kaun guest)
    R("GET", /^\/api\/v1\/room-charges\/occupied\/([^/]+)$/, { dateParam: 1 }),
    R("GET", /^\/api\/v1\/room-charges\/rest\/([^/]+)$/, { dateParam: 1 }),
    R("PUT", /^\/api\/v1\/room-charges\/rest-sync\/([^/]+)$/, { dateParam: 1 }),
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

  if (user?.isActive === false) return deny(res, "Your account is disabled. Please contact the owner.");
  const dept = user?.department || "none";
  if (!RULES[dept] || dept === "common") {
    return deny(res, "You do not have access to any business yet. Ask the owner to set your department.");
  }

  const rule = RULES[dept].find((r) => r.method === method && r.re.test(path));
  if (!rule) return deny(res, "This page/report is not available to staff.");

  // window2: check-in ka din + agla din (guest registration)
  const allowed = rule.window2 ? [...new Set([...allowedStaffDates(), ...twoDayWindow()])] : allowedStaffDates();
  if (rule.dateParam) {
    const d = decodeURIComponent(path.match(rule.re)[rule.dateParam] || "");
    if (!allowed.includes(d)) return deny(res, "Staff can only view/edit today's entries.");
  }
  if (rule.dateBody) {
    const d = String(req.body?.[rule.dateBody] ?? "");
    const mustMatch = rule.dateParam ? decodeURIComponent(path.match(rule.re)[rule.dateParam]) : null;
    if (!allowed.includes(d) || (mustMatch && d !== mustMatch)) {
      return deny(res, "Staff can only edit today's entries.");
    }
  }
  return next();
};

export default staffGuard;
