// 📚 Purane records (Tally wagairah) ko baaki reports mein jodna. Niyam (hisse ke hisaab se):
//  - Jis mahine app mein restaurant ka data hai → us mahine Tally ki restaurant sale / restaurant kharch nahi.
//  - Jis mahine app mein GH ka data hai → us mahine Tally ki GH kamai nahi.
//  - Jis mahine app mein office book hai → us mahine Tally ka banquet / office kharch / upad nahi.
//  - Isliye koi bhi hissa kisi mahine mein kabhi do jagah se nahi gina jaata.
//  (Performance page ka apna purana niyam hai: controller/performance.js)
// ⚠️ READ-ONLY: sirf padhta hai. App ki entries ya purane records kabhi nahi badalta.
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Entry from "../model/entry.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import { PastDaily, PastExpense } from "../model/pastData.js";
import { headKey } from "./expenseHeads.js";

dayjs.extend(customParseFormat);
export const APP_FROM = "2025-01-01";
const F = "DD-MM-YYYY";
const ISO = "YYYY-MM-DD";
const SOLD = ["day", "night", "extraDay", "extraNight"];
const n = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);
const iso = (s) => {
  const d = dayjs(s, F, true);
  return d.isValid() ? d.format(ISO) : null;
};

const EMPTY = { has: false, days: {}, exps: [], restMonths: new Set(), ghMonths: new Set(), offMonths: new Set(), catOf: {} };
let cache = { at: 0, v: null };

// days: { "2024-05-01": { restaurant, gh, banquet, other } } · exps: [{ month, book, head, category, amount, entries }]
export const loadPast = async () => {
  if (cache.v && Date.now() - cache.at < 60000) return cache.v;
  const [pd, pe] = await Promise.all([PastDaily.find({}).lean(), PastExpense.find({}).lean()]);
  if (!pd.length && !pe.length) {
    cache = { at: Date.now(), v: EMPTY };
    return EMPTY;
  }
  const [gh, rest, office] = await Promise.all([
    Entry.find({}, { date: 1, "entry.period": 1 }).lean(),
    RestEntry.find({}, { createDate: 1, totalCash: 1, totalCard: 1, totalPP: 1, totalUpad: 1, totalPending: 1, totalExpenses: 1, "expenses.expenseName": 1, "expenses.categoryName": 1 }).lean(),
    OfficeBook.find({}, { createDate: 1, "officeOut.expenseName": 1, "officeOut.fullname": 1, "officeOut.categoryName": 1 }).lean(),
  ]);
  const restMonths = new Set(), ghMonths = new Set(), offMonths = new Set();
  const votes = {};
  const vote = (name, cat) => {
    const k = headKey(name);
    if (!k || !cat) return;
    (votes[k] ||= {})[cat] = (votes[k][cat] || 0) + 1;
  };
  gh.forEach((d) => {
    const k = iso(d.date);
    if (k && (d.entry || []).some((e) => SOLD.includes(e.period))) ghMonths.add(k.slice(0, 7));
  });
  rest.forEach((d) => {
    const k = iso(d.createDate);
    const sale = n(d.totalCash) + n(d.totalCard) + n(d.totalPP) + n(d.totalUpad) + n(d.totalPending) + n(d.totalExpenses);
    if (k && sale >= 1000) restMonths.add(k.slice(0, 7));
    (d.expenses || []).forEach((e) => vote(e.expenseName, e.categoryName));
  });
  office.forEach((d) => {
    const k = iso(d.createDate);
    if (k) offMonths.add(k.slice(0, 7));
    (d.officeOut || []).forEach((e) => vote(e.expenseName || e.fullname, e.categoryName));
  });
  const catOf = {};
  Object.entries(votes).forEach(([k, v]) => (catOf[k] = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]));

  const days = {};
  pd.forEach((p) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return;
    const ym = p.date.slice(0, 7);
    const x = { restaurant: restMonths.has(ym) ? 0 : n(p.restaurant), gh: ghMonths.has(ym) ? 0 : n(p.gh), banquet: offMonths.has(ym) ? 0 : n(p.banquet), other: offMonths.has(ym) ? 0 : n(p.other) };
    if (!x.restaurant && !x.gh && !x.banquet && !x.other) return;
    const d = (days[p.date] ||= { restaurant: 0, gh: 0, banquet: 0, other: 0 });
    Object.keys(x).forEach((key) => (d[key] += x[key]));
  });
  const skipExp = (p) =>
    p.book === "investment" ? false : p.book === "restaurant" ? restMonths.has(p.month) : p.book === "upad" ? restMonths.has(p.month) || offMonths.has(p.month) : offMonths.has(p.month);
  const exps = pe.filter((p) => /^\d{4}-\d{2}$/.test(p.month) && !skipExp(p)).map((p) => ({ month: p.month, book: p.book, head: p.head, category: p.category || "", amount: n(p.amount), entries: n(p.entries) }));
  const v = { has: true, days, exps, restMonths, ghMonths, offMonths, catOf };
  cache = { at: Date.now(), v };
  return v;
};

// Purane kharch ki category (app mein wahi naam jis category mein zyada aaya, warna Tally ki)
export const pastCategory = (P, x) =>
  x.book === "upad" ? "Upad" : x.book === "personal" ? "Personal" : x.book === "investment" ? x.category || "Construction" : x.category || P.catOf[headKey(x.head)] || "Other (old records)";

// Range ke purane din (YYYY-MM-DD, dono shaamil)
export const pastDaysIn = (P, from, to) => Object.entries(P.days).filter(([k]) => k >= from && k <= to);
