// 📊 Performance: saal vs saal (GH, restaurant, banquet, kharch).
// App ka data 2025 se + purane records (Tally) ke din / mahine.
// ⚠️ GET routes READ-ONLY. Import route sirf naye "past" collections mein likhta hai —
//    app ki asli entries (Entry, RestEntry, OfficeBook) ko kabhi nahi chhoota.
// ✅ Rule: jis din app mein data hai, us din ka purana (imported) data kabhi nahi liya jata.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { isAuthenticated } from "../middleware/auth.js";
import { loadDaily } from "./forecast.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import PastMonthly from "../model/pastMonthly.js";
import { PastDaily, PastExpense } from "../model/pastData.js";
import { headKey, headLabel } from "../utils/expenseHeads.js";

dayjs.extend(customParseFormat);
const router = Router();
router.use(isAuthenticated, (req, res, next) => {
  if (req.user?.role === "Admin" || req.user?.isSuperUser) return next();
  return res.status(403).json({ success: false, message: "Owner/Admin only" });
});

const IST_MS = 330 * 60 * 1000;
const ISO = "YYYY-MM-DD";
const F = "DD-MM-YYYY";
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const n = (v) => (v == null || v === "" ? null : Number(v));
const fin = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10));
const BOOKS = new Set(["restaurant", "office", "upad", "personal", "investment"]); // investment = construction / setup (alag, roz ke kharch mein nahi)

// App ka data graph mein isi din se gina jaata hai. Isse pehle ke mahine poore purane records (Tally) se.
const APP_FROM = "2025-01-01";
// Kis din app mein koi bhi entry hai (GH / restaurant / office book) — ye din purane data se kabhi nahi bharenge
const appDateSet = (D) => new Set(Object.keys(D).filter((k) => k >= APP_FROM && (D[k].hasGh || D[k].rest != null || D[k].hasOff)));

// App ke kharch: mahina × book × head (category bhi)
const appExpenses = async (thisMonth) => {
  const [rest, office] = await Promise.all([
    RestEntry.find({}, { createDate: 1, expenses: 1, upad: 1 }).lean(),
    OfficeBook.find({}, { createDate: 1, officeOut: 1 }).lean(),
  ]);
  const agg = {};
  const catVotes = {};
  const add = (date, book, head, category, amount) => {
    const d = dayjs(date, F, true);
    if (!d.isValid()) return;
    const ym = d.format("YYYY-MM");
    if (ym < "2025-01" || ym >= thisMonth) return;
    const k = headKey(head);
    if (category) ((catVotes[k] ||= {})[category] = (catVotes[k][category] || 0) + 1);
    const key = `${ym}|${book}|${k}`;
    const x = (agg[key] ||= { month: ym, book, key: k, category: category || "", amount: 0, entries: 0, source: "app" });
    x.amount += fin(amount);
    x.entries += 1;
  };
  rest.forEach((doc) => {
    (doc.expenses || []).forEach((e) => add(doc.createDate, "restaurant", e.expenseName, e.categoryName, e.amount));
    (doc.upad || []).forEach((e) => add(doc.createDate, "upad", e.fullname, "Upad", e.amount));
  });
  office.forEach((doc) =>
    (doc.officeOut || []).forEach((e) => {
      const c = e.categoryName || "";
      const book = c === "Upad" ? "upad" : c === "Personal" ? "personal" : "office";
      add(doc.createDate, book, book === "upad" ? e.fullname || e.expenseName : e.expenseName || e.fullname, c, e.amount);
    })
  );
  // har head ki sabse zyada use hui category (Tally ke naamon ko bhi isi se category milti hai)
  const catOf = {};
  Object.entries(catVotes).forEach(([k, v]) => (catOf[k] = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]));
  return { rows: Object.values(agg), catOf };
};

router.get("/", async (req, res) => {
  try {
    const { D, nRooms } = await loadDaily();
    const thisMonth = todayIst().format("YYYY-MM");
    const appDates = appDateSet(D);

    // ── App ke mahine (poore mahine, 2025 se)
    const byMonth = {};
    Object.keys(D).sort().forEach((k) => {
      const ym = k.slice(0, 7);
      if (ym < "2025-01" || ym >= thisMonth) return;
      const x = D[k];
      const M = (byMonth[ym] ||= { gh: 0, rn: 0, rest: 0, restDays: 0, bq: 0, officeDays: 0, ghDays: 0 });
      if (x.hasGh) { M.gh += x.rev; M.rn += x.occ; M.ghDays++; }
      if (x.rest != null) { M.rest += x.rest; M.restDays++; }
      M.bq += x.banquet || 0;
      if (x.hasOff) M.officeDays++;
    });
    const months = Object.entries(byMonth)
      .filter(([, M]) => M.ghDays || M.restDays)
      .map(([ym, M]) => {
        const y = +ym.slice(0, 4), m = +ym.slice(5, 7), days = dayjs(ym + "-01").daysInMonth();
        return {
          month: ym, year: y, m, mon: MON[m - 1], days, source: "app",
          gh_revenue: Math.round(M.gh), room_nights: M.rn, restaurant: Math.round(M.rest), banquet: Math.round(M.bq),
          avg_rate: M.rn ? Math.round(M.gh / M.rn) : null, occupancy: M.rn ? M.rn / (nRooms * days) : null,
          restaurant_per_day: M.restDays ? Math.round(M.rest / M.restDays) : null, office_days: M.officeDays,
        };
      });
    const appMonths = new Set(months.map((r) => r.month));

    // ── Purane din (Tally) — app wale din / mahine hamesha chhod do
    let pastDays = [];
    try {
      pastDays = (await PastDaily.find({}, { _id: 0, date: 1, source: 1, restaurant: 1, gh: 1, banquet: 1 }).lean())
        .filter((p) => !appMonths.has(p.date.slice(0, 7)) && p.date.slice(0, 7) < thisMonth)
        .map((p) => (p.date < APP_FROM ? p : { ...p, restaurant: D[p.date]?.rest != null ? 0 : p.restaurant, gh: D[p.date]?.hasGh ? 0 : p.gh, banquet: D[p.date]?.hasOff ? 0 : p.banquet }));
    } catch (e) { pastDays = []; }
    const pm = {};
    pastDays.forEach((p) => {
      const ym = p.date.slice(0, 7);
      const M = (pm[ym] ||= { gh: 0, rest: 0, bq: 0, restDays: 0, source: p.source });
      M.gh += fin(p.gh); M.rest += fin(p.restaurant); M.bq += fin(p.banquet);
      if (fin(p.restaurant)) M.restDays++;
    });
    const past = Object.entries(pm).map(([ym, M]) => {
      const y = +ym.slice(0, 4), m = +ym.slice(5, 7), days = dayjs(ym + "-01").daysInMonth();
      return { month: ym, year: y, m, mon: MON[m - 1], days, source: M.source || "past", gh_revenue: Math.round(M.gh), room_nights: 0, restaurant: Math.round(M.rest), banquet: Math.round(M.bq),
        avg_rate: null, occupancy: null, restaurant_per_day: M.restDays ? Math.round(M.rest / M.restDays) : null, office_days: days };
    });
    const pastMonthsSet = new Set(past.map((r) => r.month));

    // ── Excel template wale mahine (sirf jahan na app ho na Tally)
    try {
      (await PastMonthly.find({}).lean())
        .filter((p) => /^\d{4}-\d{2}$/.test(p.month) && !appMonths.has(p.month) && !pastMonthsSet.has(p.month))
        .filter((p) => [p.ghRevenue, p.roomNights, p.restaurant, p.banquet].some((v) => v != null))
        .forEach((p) => {
          const y = +p.month.slice(0, 4), m = +p.month.slice(5, 7), days = dayjs(p.month + "-01").daysInMonth();
          const gh = n(p.ghRevenue) || 0, rn = n(p.roomNights) || 0, rest = n(p.restaurant) || 0;
          past.push({ month: p.month, year: y, m, mon: MON[m - 1], days, source: "past", gh_revenue: gh, room_nights: rn, restaurant: rest, banquet: n(p.banquet) || 0,
            avg_rate: rn ? Math.round(gh / rn) : null, occupancy: rn ? rn / (nRooms * days) : null, restaurant_per_day: rest ? Math.round(rest / days) : null, office_days: days });
        });
    } catch (e) { /* koi baat nahi */ }

    // ── Roz ka restaurant (app + purana) → hafte ke din, strong / weak din
    const restDay = {};
    Object.keys(D).forEach((k) => { if (D[k].rest != null && k.slice(0, 7) < thisMonth && k >= "2025-01-01") restDay[k] = D[k].rest; });
    pastDays.forEach((p) => { if (fin(p.restaurant) > 0 && restDay[p.date] == null) restDay[p.date] = fin(p.restaurant); });
    const latest = months.length ? months.at(-1).year : null;
    const window = months.filter((r) => r.year === latest).map((r) => r.m);
    const years = [...new Set(Object.keys(restDay).map((k) => +k.slice(0, 4)))].sort();
    const weekday = [], dayBands = [];
    years.forEach((y) => {
      const dd = Object.keys(restDay).filter((k) => +k.slice(0, 4) === y && window.includes(+k.slice(5, 7)));
      if (!dd.length) return;
      const by = {};
      dd.forEach((k) => (by[dayjs(k, ISO).day()] ||= []).push(restDay[k]));
      [1, 2, 3, 4, 5, 6, 0].forEach((d, i) => {
        const a = by[d] || [];
        if (a.length) weekday.push({ year: y, day: DOW[d], order: i + 1, restaurant_per_day: Math.round(a.reduce((s, v) => s + v, 0) / a.length), days: a.length });
      });
      const v = dd.map((k) => restDay[k]);
      dayBands.push({ year: y, order: 1, band: "Strong (₹40k+)", days: v.filter((x) => x >= 40000).length });
      dayBands.push({ year: y, order: 2, band: "Normal (₹30–40k)", days: v.filter((x) => x >= 30000 && x < 40000).length });
      dayBands.push({ year: y, order: 3, band: "Weak (under ₹30k)", days: v.filter((x) => x < 30000).length });
    });

    // ── Kharch (app + purana), head ke naam ek jaise
    const { rows: appExp, catOf } = await appExpenses(thisMonth);
    let pastExp = [];
    try {
      pastExp = (await PastExpense.find({}, { _id: 0, month: 1, book: 1, head: 1, category: 1, amount: 1, entries: 1, source: 1 }).lean())
        .filter((p) => !appMonths.has(p.month) && p.month < thisMonth);
    } catch (e) { pastExp = []; }
    const expAgg = {};
    [...appExp, ...pastExp.map((p) => ({ month: p.month, book: p.book, key: headKey(p.head), category: p.category || "", amount: fin(p.amount), entries: fin(p.entries), source: p.source }))].forEach((r) => {
      const k = `${r.month}|${r.book}|${r.key}`;
      const x = (expAgg[k] ||= { month: r.month, year: +r.month.slice(0, 4), m: +r.month.slice(5, 7), book: r.book, head: headLabel(r.key), category: r.category || "", amount: 0, entries: 0, source: r.source });
      if (!x.category && r.category) x.category = r.category;
      x.amount += r.amount;
      x.entries += r.entries;
    });
    const expenses = Object.values(expAgg).map((x) => {
      const k = headKey(x.head);
      const category = x.book === "upad" ? "Upad" : x.book === "personal" ? "Personal" : x.book === "investment" ? x.category || "Construction" : x.category || catOf[k] || (k === "not split" || k.startsWith("purant") ? "Not split" : "Other (old records)");
      return { ...x, amount: Math.round(x.amount), category };
    });

    res.json({
      success: true,
      data: {
        today: todayIst().format(ISO), nRooms,
        months: [...past, ...months].sort((a, b) => (a.month < b.month ? -1 : 1)),
        weekday, dayBands, expenses,
        window: { first: window.length ? Math.min(...window) : 1, last: window.length ? Math.max(...window) : 12 },
        pastCount: past.length,
        pastSources: [...new Set(past.map((p) => p.source))],
      },
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Kitna purana data pada hai (source ke hisaab se)
router.get("/past-status", async (req, res) => {
  try {
    const [d, x] = await Promise.all([
      PastDaily.aggregate([{ $group: { _id: "$source", days: { $sum: 1 }, first: { $min: "$date" }, last: { $max: "$date" }, restaurant: { $sum: "$restaurant" }, gh: { $sum: "$gh" }, banquet: { $sum: "$banquet" } } }]),
      PastExpense.aggregate([{ $group: { _id: { source: "$source", book: "$book" }, rows: { $sum: 1 }, amount: { $sum: "$amount" }, entries: { $sum: "$entries" } } }]),
    ]);
    res.json({ success: true, data: { daily: d, expenses: x } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// 📥 Purana data daalna (Tally se). Sirf "past" collections mein likhta hai.
// Body: { source: "tally", reset?: true, daily: [{date, restaurant, gh, banquet, other}], expenses: [{date, book, head, category?, amount}] }
// Har call mein poore mahine bhejna (hum saal-wise bhejte hain). Dobara chalane par wahi result (upsert).
router.post("/past-import", async (req, res) => {
  try {
    const { source, reset, daily = [], expenses = [] } = req.body || {};
    if (!/^[a-z0-9-]{2,30}$/.test(String(source || ""))) return res.status(400).json({ success: false, message: "source required (e.g. tally)" });
    if (!Array.isArray(daily) || !Array.isArray(expenses)) return res.status(400).json({ success: false, message: "daily and expenses must be lists" });
    const { D } = await loadDaily();
    const appDates = appDateSet(D);
    const today = todayIst().format(ISO);
    const okDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && dayjs(s, ISO, true).isValid() && s < today;
    const skipped = { appDate: 0, invalid: 0, appDates: [] };
    const keep = (s) => {
      if (!okDate(s)) { skipped.invalid++; return false; }
      if (appDates.has(s)) { skipped.appDate++; if (skipped.appDates.length < 20 && !skipped.appDates.includes(s)) skipped.appDates.push(s); return false; }
      return true;
    };
    // Har cheez alag check: jis din app mein restaurant entry hai us din Tally ki restaurant sale nahi, GH entry hai to GH nahi, office book hai to banquet nahi
    const counted = Object.keys(D).filter((k) => k >= APP_FROM); // 2025 se pehle ka app data graph mein nahi ginta, wahan purana record hi chalega
    const restD = new Set(counted.filter((k) => D[k].rest != null)), ghD = new Set(counted.filter((k) => D[k].hasGh)), offD = new Set(counted.filter((k) => D[k].hasOff));
    const days = [];
    daily.forEach((r) => {
      const s = String(r?.date || "");
      if (!okDate(s)) { skipped.invalid++; return; }
      const x = { date: s, restaurant: restD.has(s) ? 0 : fin(r.restaurant), gh: ghD.has(s) ? 0 : fin(r.gh), banquet: offD.has(s) ? 0 : fin(r.banquet), other: offD.has(s) ? 0 : fin(r.other) };
      if (restD.has(s) || ghD.has(s) || offD.has(s)) { skipped.appDate++; if (skipped.appDates.length < 20 && !skipped.appDates.includes(s)) skipped.appDates.push(s); }
      if (restD.has(s) && ghD.has(s) && offD.has(s)) return;
      days.push(x);
    });
    const validExp = expenses.filter((r) => BOOKS.has(r?.book) && String(r?.head || "").trim() && Number.isFinite(Number(r?.amount)));
    skipped.invalid += expenses.length - validExp.length;
    const exps = validExp.filter((r) => keep(String(r.date)));

    if (reset) await Promise.all([PastDaily.deleteMany({ source }), PastExpense.deleteMany({ source })]);

    if (days.length)
      await PastDaily.bulkWrite(days.map((r) => ({
        updateOne: { filter: { source, date: r.date }, update: { $set: { restaurant: fin(r.restaurant), gh: fin(r.gh), banquet: fin(r.banquet), other: fin(r.other) } }, upsert: true },
      })), { ordered: false });

    const agg = {};
    exps.forEach((r) => {
      const head = String(r.head).trim().slice(0, 80), month = r.date.slice(0, 7);
      const k = `${month}|${r.book}|${head}`;
      const x = (agg[k] ||= { month, book: r.book, head, category: String(r.category || "").trim().slice(0, 40), amount: 0, entries: 0 });
      x.amount += Number(r.amount);
      x.entries += 1;
    });
    const rows = Object.values(agg);
    if (rows.length)
      await PastExpense.bulkWrite(rows.map((x) => ({
        updateOne: { filter: { source, month: x.month, book: x.book, head: x.head }, update: { $set: { amount: Math.round(x.amount * 100) / 100, entries: x.entries, category: x.category } }, upsert: true },
      })), { ordered: false });

    res.json({ success: true, data: { source, daysReceived: daily.length, daysSaved: days.length, expenseLinesReceived: expenses.length, expenseLinesSaved: exps.length, expenseMonthRows: rows.length, skipped } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
