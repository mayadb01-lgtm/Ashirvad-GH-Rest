// 📚 Purane records (Tally wagairah) ko baaki reports mein jodna — ek hi niyam sab jagah (Performance page jaisa):
//  - 2025 se pehle ke mahine: sirf purana record (app ka us samay ka data reports mein nahi ginta).
//  - 2025 se: purana record sirf un mahino mein jahan app mein GH / restaurant ka koi data nahi.
//  - Isliye koi bhi din / mahina kabhi do jagah se nahi gina jaata.
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

const EMPTY = { has: false, days: {}, exps: [], appMonths: new Set(), catOf: {} };
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
  const appMonths = new Set();
  const offDays = new Set();
  const votes = {};
  const vote = (name, cat) => {
    const k = headKey(name);
    if (!k || !cat) return;
    (votes[k] ||= {})[cat] = (votes[k][cat] || 0) + 1;
  };
  gh.forEach((d) => {
    const k = iso(d.date);
    if (k && k >= APP_FROM && (d.entry || []).some((e) => SOLD.includes(e.period))) appMonths.add(k.slice(0, 7));
  });
  rest.forEach((d) => {
    const k = iso(d.createDate);
    const sale = n(d.totalCash) + n(d.totalCard) + n(d.totalPP) + n(d.totalUpad) + n(d.totalPending) + n(d.totalExpenses);
    if (k && k >= APP_FROM && sale >= 1000) appMonths.add(k.slice(0, 7));
    (d.expenses || []).forEach((e) => vote(e.expenseName, e.categoryName));
  });
  office.forEach((d) => {
    const k = iso(d.createDate);
    if (k) offDays.add(k);
    (d.officeOut || []).forEach((e) => vote(e.expenseName || e.fullname, e.categoryName));
  });
  const catOf = {};
  Object.entries(votes).forEach(([k, v]) => (catOf[k] = Object.entries(v).sort((a, b) => b[1] - a[1])[0][0]));

  const days = {};
  pd.forEach((p) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || appMonths.has(p.date.slice(0, 7))) return;
    const x = (days[p.date] ||= { restaurant: 0, gh: 0, banquet: 0, other: 0 });
    x.restaurant += n(p.restaurant);
    x.gh += n(p.gh);
    // office book wale din (2025 se) banquet / other app se hi
    if (!(p.date >= APP_FROM && offDays.has(p.date))) {
      x.banquet += n(p.banquet);
      x.other += n(p.other);
    }
  });
  const exps = pe.filter((p) => /^\d{4}-\d{2}$/.test(p.month) && !appMonths.has(p.month)).map((p) => ({ month: p.month, book: p.book, head: p.head, category: p.category || "", amount: n(p.amount), entries: n(p.entries) }));
  const v = { has: true, days, exps, appMonths, catOf };
  cache = { at: Date.now(), v };
  return v;
};

// Purane kharch ki category (app mein wahi naam jis category mein zyada aaya, warna Tally ki)
export const pastCategory = (P, x) =>
  x.book === "upad" ? "Upad" : x.book === "personal" ? "Personal" : x.book === "investment" ? x.category || "Construction" : x.category || P.catOf[headKey(x.head)] || "Other (old records)";

// Range ke purane din (YYYY-MM-DD, dono shaamil)
export const pastDaysIn = (P, from, to) => Object.entries(P.days).filter(([k]) => k >= from && k <= to);
