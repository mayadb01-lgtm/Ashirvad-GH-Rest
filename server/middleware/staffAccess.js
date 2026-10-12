import UserAccess from "../model/userAccess.js";
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
//   classic:   sirf classic (purane) entry page ke liye — Super Admin ne "Classic view" band kiya ho to mana
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
    R("PUT", /^\/api\/v1\/entry\/update-entry\/([^/]+)$/, { dateParam: 1 }), // submit ke baad badlav (quick + classic)
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
    R("GET", /^\/api\/v1\/room-charges\/paid-on\/([^/]+)$/, { dateParam: 1 }),
    R("GET", /^\/api\/v1\/counter\/handover\/([^/]+)$/, { dateParam: 1 }), // Office ko diya cash (dekhna)
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
    R("POST", /^\/api\/v1\/stay\/remove$/, { dateBody: "date" }),
    R("PUT", /^\/api\/v1\/stay\/undo-checkout\/[a-f0-9]{24}$/),
    R("PUT", /^\/api\/v1\/stay\/extend\/[a-f0-9]{24}$/),
    // Room calendar (kal se aage; handler khud check karta hai) + safai status
    R("GET", /^\/api\/v1\/stay\/calendar\/[^/]+\/\d+$/),
    R("PUT", /^\/api\/v1\/stay\/clean\/\d+$/),
    R("PUT", /^\/api\/v1\/stay\/expected\/[a-f0-9]{24}$/),
    R("GET", /^\/api\/v1\/stay\/dues\/\d+\/[^/]+\/[^/]+$/),
    // Room shift / swap (wajah zaroori) aur bill merge
    R("POST", /^\/api\/v1\/stay\/move$/, { dateBody: "date" }),
    R("POST", /^\/api\/v1\/stay\/group$/, { dateBody: "date" }),
    R("PUT", /^\/api\/v1\/stay\/group\/[a-f0-9]{24}\/close$/),
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
    R("GET", /^\/api\/v1\/restCategory\/get-category-name$/, { classic: true }), // classic restaurant page ki category list
    // Levana baaki → room (kaun sa room, kaun guest)
    R("GET", /^\/api\/v1\/room-charges\/occupied\/([^/]+)$/, { dateParam: 1 }),
    R("GET", /^\/api\/v1\/room-charges\/rest\/([^/]+)$/, { dateParam: 1 }),
    R("PUT", /^\/api\/v1\/room-charges\/rest-sync\/([^/]+)$/, { dateParam: 1 }),
    // Purchase bills (aaj ke; id wale routes andar date check karte hain)
    R("GET", /^\/api\/v1\/purchase\/day\/([^/]+)$/, { dateParam: 1 }),
    R("GET", /^\/api\/v1\/purchase\/items$/),
    R("GET", /^\/api\/v1\/purchase\/last\/[A-Za-z0-9]+$/),
    R("POST", /^\/api\/v1\/purchase$/, { dateBody: "date" }),
    R("PUT", /^\/api\/v1\/purchase\/[a-f0-9]{24}$/),
    R("DELETE", /^\/api\/v1\/purchase\/[a-f0-9]{24}$/),
    R("POST", /^\/api\/v1\/purchase\/[a-f0-9]{24}\/photo$/),
    R("GET", /^\/api\/v1\/purchase\/photo\/[A-Za-z0-9._-]+$/),
    // Purana udhaar wasool (Collect old dues) — sirf aaj
    R("GET", /^\/api\/v1\/rest-dues\/balances\/([^/]+)$/, { dateParam: 1 }),
    R("GET", /^\/api\/v1\/rest-dues\/day\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/rest-dues$/, { dateBody: "date" }),
    R("PUT", /^\/api\/v1\/rest-dues\/[a-f0-9]{24}\/cancel$/),
    R("GET", /^\/api\/v1\/rest-dues\/gh-cash\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/rest-dues\/gh-handover$/, { dateBody: "date" }),
    R("GET", /^\/api\/v1\/rest-dues\/room-bills\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/rest-dues\/room-bills\/[a-f0-9]{24}\/receive$/, { dateBody: "date" }),
    R("GET", /^\/api\/v1\/counter\/handover\/([^/]+)$/, { dateParam: 1 }), // Office ko diya cash (dekhna)
    R("GET", /^\/api\/v1\/counter\/gh-card\/([^/]+)$/, { dateParam: 1 }), // GH ka Card (same machine)
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
    // Purchase bills (Office Book)
    R("GET", /^\/api\/v1\/purchase\/day\/([^/]+)$/, { dateParam: 1 }),
    R("GET", /^\/api\/v1\/purchase\/items$/),
    R("GET", /^\/api\/v1\/purchase\/last\/[A-Za-z0-9]+$/),
    R("POST", /^\/api\/v1\/purchase$/, { dateBody: "date" }),
    R("PUT", /^\/api\/v1\/purchase\/[a-f0-9]{24}$/),
    R("DELETE", /^\/api\/v1\/purchase\/[a-f0-9]{24}$/),
    R("POST", /^\/api\/v1\/purchase\/[a-f0-9]{24}\/photo$/),
    R("GET", /^\/api\/v1\/purchase\/photo\/[A-Za-z0-9._-]+$/),
    // Room ka food bill Office mein wasool
    R("GET", /^\/api\/v1\/rest-dues\/room-bills\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/rest-dues\/room-bills\/[a-f0-9]{24}\/receive$/, { dateBody: "date" }),
    // Restaurant ka udhaar Office mein wasool
    R("GET", /^\/api\/v1\/rest-dues\/balances\/([^/]+)$/, { dateParam: 1 }),
    R("GET", /^\/api\/v1\/rest-dues\/day\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/rest-dues$/, { dateBody: "date" }),
    R("PUT", /^\/api\/v1\/rest-dues\/[a-f0-9]{24}\/cancel$/),
    // GH ka baaki Office mein wasool + counter ka cash Office ko
    R("GET", /^\/api\/v1\/counter\/gh-dues\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/counter\/gh-dues\/[a-f0-9]{24}\/receive$/, { dateBody: "date" }),
    R("PUT", /^\/api\/v1\/counter\/gh-dues\/receipt\/[a-f0-9]{24}\/cancel$/),
    R("GET", /^\/api\/v1\/counter\/handover\/([^/]+)$/, { dateParam: 1 }),
    R("POST", /^\/api\/v1\/counter\/handover$/, { dateBody: "date" }),
    R("PUT", /^\/api\/v1\/counter\/handover\/[a-f0-9]{24}\/cancel$/),
    // Banquet (booking / bill / payment — date ke niyam controller mein)
    R("GET", /^\/api\/v1\/banquet\/setup$/),
    R("GET", /^\/api\/v1\/banquet\/bookings$/),
    R("GET", /^\/api\/v1\/banquet\/bookings\/[a-f0-9]{24}$/),
    R("POST", /^\/api\/v1\/banquet\/bookings$/),
    R("PUT", /^\/api\/v1\/banquet\/bookings\/[a-f0-9]{24}$/),
    R("POST", /^\/api\/v1\/banquet\/bookings\/[a-f0-9]{24}\/payment$/),
    R("PUT", /^\/api\/v1\/banquet\/bookings\/[a-f0-9]{24}\/payment\/[a-f0-9]{24}\/cancel$/),
    R("POST", /^\/api\/v1\/banquet\/bookings\/[a-f0-9]{24}\/bill$/),
    dayStatus,
  ],
};

// Banquet ko Office se alag module banao (Super Admin alag-alag de sake)
RULES.banquet = RULES.office.filter((r) => /banquet/.test(r.re.source));
RULES.office = RULES.office.filter((r) => !/banquet/.test(r.re.source));
RULES.banquet.push(dayStatus);
export const MODULES = ["gh", "rest", "office", "banquet"];

// Aaj se N din peeche tak ki dates (raat ki grace ke saath). N = 0 → sirf aaj
export const datesBack = (days) => {
  const grace = Number(process.env.STAFF_GRACE_HOURS ?? 2);
  const nowIst = new Date(Date.now() + IST_OFFSET_MS);
  const extra = grace > 0 && nowIst.getUTCHours() < grace ? 1 : 0;
  const out = [];
  for (let i = 0; i <= Math.max(0, Number(days) || 0) + extra; i++) out.push(fmt(new Date(nowIst.getTime() - i * 24 * 3600 * 1000)));
  return out;
};

/* ───────── Reports jo Super Admin kisi user ko de sakta hai (har ek ka data din ki seema mein) ─────────
   clamp: ym2 = /:from/:to (YYYY-MM) · dmy2 = /:start/:end (DD-MM-YYYY) · my = /:month/:year · months = /:n · qdmy = ?from&to (DD-MM-YYYY) */
export const REPORTS = {
  "owner-report": { label: "Owner monthly report", rules: [R("GET", /^\/api\/v1\/owner\/monthly-summary\/(\d+)\/(\d+)$/, { clamp: "my" })] },
  "profit-loss": { label: "Profit & Loss", rules: [R("GET", /^\/api\/v1\/insights\/pnl\/([^/]+)\/([^/]+)$/, { clamp: "ym2" })] },
  cashflow: { label: "Cashflow", rules: [R("GET", /^\/api\/v1\/insights\/cashflow\/([^/]+)\/([^/]+)$/, { clamp: "ym2" })] },
  "mode-balance": { label: "Monthly balance (Cash / PP / PPS / PPC)", rules: [R("GET", /^\/api\/v1\/insights\/mode-balance\/([^/]+)\/([^/]+)$/, { clamp: "ym2" })] },
  "gh-growth": { label: "GH growth", rules: [R("GET", /^\/api\/v1\/insights\/gh-growth\/([^/]+)\/([^/]+)$/, { clamp: "dmy2" })] },
  "kharch-control": { label: "Expense control", rules: [R("GET", /^\/api\/v1\/insights\/kharch\/(\d+)$/, { clamp: "months" })] },
  "rest-receivables": { label: "Restaurant receivables (who owes)", rules: [R("GET", /^\/api\/v1\/insights\/rest-receivables$/)] },
  "guest-dues": { label: "Guest dues & reminders", rules: [R("GET", /^\/api\/v1\/owner\/dues$/)] },
  "banquet-report": { label: "Banquet report & kitchen planning", rules: [R("GET", /^\/api\/v1\/banquet\/report$/, { clamp: "qdmy" }), R("GET", /^\/api\/v1\/banquet\/kitchen$/, { clamp: "qdmy" })] },
  "data-check": { label: "Data check (error alerts)", rules: [R("GET", /^\/api\/v1\/insights\/data-alerts$/)] },
};

// Purana tarika (department) — jab tak Super Admin naya access set na kare
const LEGACY = {
  gh: { modules: ["gh"], entryDays: 0 },
  rest: { modules: ["rest"], entryDays: 0 },
  office: { modules: ["office", "banquet"], entryDays: 0 },
  manager: { modules: MODULES, entryDays: null },
};

const cache = new Map(); // userId → { at, doc }
export const clearAccessCache = (userId) => (userId ? cache.delete(String(userId)) : cache.clear());
const loadAccess = async (userId) => {
  const k = String(userId);
  const hit = cache.get(k);
  if (hit && Date.now() - hit.at < 30 * 1000) return hit.doc;
  const doc = await UserAccess.findOne({ userId: k }).lean();
  cache.set(k, { at: Date.now(), doc });
  return doc;
};

// User ka asli access (Super Admin = null, matlab koi rok nahi)
export const effectiveAccess = async (user) => {
  if (!user || isAdminLike(user)) return null;
  const doc = await loadAccess(user._id);
  if (doc) {
    return {
      custom: true,
      modules: (doc.modules || []).filter((m) => MODULES.includes(m)),
      entryDays: doc.entryDays === null || doc.entryDays === undefined ? null : Math.max(0, Number(doc.entryDays) || 0),
      reports: (doc.reports || []).filter((r) => REPORTS[r]),
      reportDays: doc.reportDays === null || doc.reportDays === undefined ? null : Math.max(0, Number(doc.reportDays) || 0),
      classic: doc.classic !== false,
    };
  }
  const l = LEGACY[user.department];
  return l ? { custom: false, modules: l.modules, entryDays: l.entryDays, reports: [], reportDays: 0, classic: true } : { custom: false, modules: [], entryDays: 0, reports: [], reportDays: 0, classic: true };
};

// Kya yeh user is date ki entry chhoo sakta hai? (controllers ke liye; staffGuard req.access set karta hai)
export const dateOk = (req, d) => {
  if (isAdminLike(req.user)) return true;
  const acc = req.access;
  if (!acc) return allowedStaffDates().includes(d);
  if (acc.entryDays === null) return true;
  return datesBack(acc.entryDays).includes(d);
};
export const anyDateOk = (user) => isAdminLike(user); // purana naam (sirf admin)

const deny = (res, message, code = 403) => res.status(code).json({ success: false, message, staffBlocked: true });

/* Report ki date ko user ki seema mein laao. Return: null (theek) | "message" (mana) — req.url badal sakta hai */
const ymd = (d) => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
const clampReport = (req, rule, path, days) => {
  if (!rule.clamp || days === null) return null;
  const earliest = new Date(Date.now() + IST_OFFSET_MS - days * 24 * 3600 * 1000);
  const eYm = `${earliest.getUTCFullYear()}-${pad(earliest.getUTCMonth() + 1)}`;
  const eDmy = fmt(earliest);
  const dmyNum = (s) => {
    const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s || "");
    return m ? Number(m[3]) * 10000 + Number(m[2]) * 100 + Number(m[1]) : 0;
  };
  const tooOld = `Only the last ${days} days are allowed for you.`;
  const m = path.match(rule.re);
  const q = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";
  const setPath = (p) => (req.url = p.replace(/^\/api\/v1/, "") + q);
  if (rule.clamp === "ym2") {
    let [from, to] = [decodeURIComponent(m[1]), decodeURIComponent(m[2])];
    if (to < eYm) return tooOld;
    if (from < eYm) from = eYm;
    setPath(path.replace(rule.re, (x) => x.replace(`/${m[1]}/${m[2]}`, `/${from}/${to}`)));
  } else if (rule.clamp === "my") {
    const ym = `${m[2]}-${pad(Number(m[1]))}`;
    if (ym < eYm) return tooOld;
  } else if (rule.clamp === "dmy2") {
    let [from, to] = [decodeURIComponent(m[1]), decodeURIComponent(m[2])];
    if (dmyNum(to) < ymd(earliest)) return tooOld;
    if (dmyNum(from) < ymd(earliest)) from = eDmy;
    setPath(path.replace(`/${m[1]}/${m[2]}`, `/${from}/${to}`));
  } else if (rule.clamp === "months") {
    const allowed = Math.max(2, Math.ceil(days / 30) + 1);
    if (Number(m[1]) > allowed) setPath(path.replace(/\/\d+$/, `/${allowed}`));
  } else if (rule.clamp === "qdmy") {
    const from = String(req.query?.from || "");
    if (!from || dmyNum(from) < ymd(earliest)) req.query.from = eDmy;
    const to = String(req.query?.to || "");
    if (to && dmyNum(to) < ymd(earliest)) return tooOld;
  }
  return null;
};

export const staffGuard = async (req, res, next) => {
  const user = req.user;
  if (isAdminLike(user)) return next();

  const path = req.originalUrl.split("?")[0].replace(/\/+$/, "");
  const method = req.method;

  // getuser / me hamesha (taaki app sahi message dikha sake)
  if (RULES.common.some((r) => r.method === method && r.re.test(path))) return next();

  if (user?.isActive === false) return deny(res, "Your account is disabled. Please contact the owner.");
  let acc;
  try {
    acc = await effectiveAccess(user);
  } catch (e) {
    return deny(res, "Could not check your access. Please try again.", 500);
  }
  req.access = acc;

  // Report?
  for (const key of Object.keys(REPORTS)) {
    const rule = REPORTS[key].rules.find((r) => r.method === method && r.re.test(path));
    if (!rule) continue;
    if (!acc.reports.includes(key)) {
      // Banquet kitchen/report ke raaste booking module se takraate nahi; baaki: mana
      return deny(res, "This report is not allowed for you. Ask the Super Admin.");
    }
    const msg = clampReport(req, rule, path, acc.reportDays);
    if (msg) return deny(res, msg);
    req.reportOk = key;
    return next();
  }

  if (!acc.modules.length) {
    return deny(res, "You do not have access to any business yet. Ask the owner to set your access.");
  }
  const rule = acc.modules.flatMap((m) => RULES[m] || []).find((r) => r.method === method && r.re.test(path));
  if (!rule) return deny(res, "This page/report is not available to you.");
  if (rule.classic && !acc.classic) return deny(res, "Classic view is not allowed for you. Ask the Super Admin.");

  // Dates: Super Admin ki di hui seema (entryDays). window2: check-in ka din + agla din (guest registration)
  const base = acc.entryDays === null ? null : datesBack(acc.entryDays);
  const allowed = base === null ? null : rule.window2 ? [...new Set([...base, ...twoDayWindow()])] : base;
  const tooOld = acc.entryDays ? `You can only view/edit the last ${acc.entryDays} days.` : "Staff can only view/edit today's entries.";
  if (allowed && rule.dateParam) {
    const d = decodeURIComponent(path.match(rule.re)[rule.dateParam] || "");
    if (!allowed.includes(d)) return deny(res, tooOld);
  }
  if (rule.dateBody) {
    const d = String(req.body?.[rule.dateBody] ?? "");
    const mustMatch = rule.dateParam ? decodeURIComponent(path.match(rule.re)[rule.dateParam]) : null;
    if ((allowed && !allowed.includes(d)) || (mustMatch && d !== mustMatch)) {
      return deny(res, tooOld);
    }
  }
  return next();
};

export default staffGuard;
