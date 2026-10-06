// Owner Monthly Dashboard API
// ⚠️ READ-ONLY: is file mein sirf find/aggregate hai. Koi save/update/delete nahi.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { isAuthenticated } from "../middleware/auth.js";
import Entry from "../model/entry.js";
import Room from "../model/room.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import StaffSalary from "../model/staffSalary.js";

dayjs.extend(customParseFormat);
const router = Router();

router.use(isAuthenticated, (req, res, next) => {
  if (req.user?.role === "Admin" || req.user?.isSuperUser) return next();
  return res.status(403).json({ success: false, message: "Owner/Admin only" });
});

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const NIGHT_PERIODS = ["night", "extraNight"];
const SOLD_PERIODS = ["day", "night", "extraDay", "extraNight"];
const sum = (arr, f) => arr.reduce((s, x) => s + (Number(f(x)) || 0), 0);
const round = (n, d = 0) => Math.round(n * 10 ** d) / 10 ** d;
const inc = (obj, k, v) => (obj[k] = (obj[k] || 0) + (Number(v) || 0));

// GH sales logic matches GHSalesDashboard: rate of all rows except "UnPaid"
// period rows (those are collections of old dues, not new sales).
const ghSaleRows = (doc) => (doc.entry || []).filter((e) => e.period !== "UnPaid");

const officeMonthTotals = (docs) => {
  const inByCat = {};
  const outByCat = {};
  docs.forEach((d) => {
    (d.officeIn || []).forEach((i) => inc(inByCat, i.categoryName || "Other", i.amount));
    (d.officeOut || []).forEach((o) => inc(outByCat, o.categoryName || "Other", o.amount));
  });
  return {
    inByCat,
    outByCat,
    totalIn: Object.values(inByCat).reduce((a, b) => a + b, 0),
    totalOut: Object.values(outByCat).reduce((a, b) => a + b, 0),
  };
};

const fetchRange = (from, to) => {
  const q = { entryCreateDate: { $gte: from.toDate(), $lte: to.toDate() } };
  return Promise.all([
    Entry.find(q).lean(),
    RestEntry.find(q).lean(),
    OfficeBook.find(q).lean(),
  ]);
};

const monthKpis = (gh, rest, office, salaryTotal, roomCount, days) => {
  const ghRows = gh.flatMap(ghSaleRows);
  const ghRevenue = sum(ghRows, (e) => e.rate);
  const soldRows = ghRows.filter((e) => SOLD_PERIODS.includes(e.period));
  const nightsSold = new Set(
    ghRows.filter((e) => NIGHT_PERIODS.includes(e.period)).map((e) => `${e.createDate}|${e.roomNo}`)
  ).size;
  const restSales = sum(rest, (r) => r.grandTotal);
  const restExpenses = sum(rest, (r) => r.totalExpenses);
  const o = officeMonthTotals(office);
  const totalRevenue = ghRevenue + restSales + o.totalIn;
  const totalOut = restExpenses + o.totalOut + salaryTotal;
  return {
    totalRevenue,
    ghRevenue,
    restSales,
    officeIn: o.totalIn,
    restExpenses,
    officeOut: o.totalOut,
    staffSalary: salaryTotal,
    netCash: totalRevenue - totalOut,
    occupancy: roomCount && days ? round((nightsSold / (roomCount * days)) * 100, 1) : 0,
    adr: soldRows.length ? round(ghRevenue / soldRows.length) : 0,
    bookings: soldRows.length,
    guests: sum(soldRows, (e) => e.noOfPeople),
    belowListPrice: sum(soldRows, (e) => Math.max((e.cost || 0) - (e.rate || 0), 0)),
  };
};

const salaryFor = async (month, year) => {
  const sheet = await StaffSalary.findOne({ month, year }).lean();
  return sheet ? sum(sheet.rows || [], (r) => r.salaryPaidAmount || 0) : 0;
};

// GET /api/v1/owner/monthly-summary/:month/:year   (month = 1..12)
router.get("/monthly-summary/:month/:year", async (req, res) => {
  try {
    const month = Number(req.params.month);
    const year = Number(req.params.year);
    if (!(month >= 1 && month <= 12) || !(year > 2000)) {
      return res.status(400).json({ success: false, message: "Invalid month/year" });
    }

    const start = dayjs(new Date(year, month - 1, 1)).startOf("day");
    const end = start.endOf("month");
    const today = dayjs();
    // current month → count only days elapsed for occupancy/averages
    const effectiveEnd = end.isAfter(today) ? today.endOf("day") : end;
    const days = Math.max(effectiveEnd.diff(start, "day") + 1, 1);
    const prevStart = start.subtract(1, "month");
    const prevEnd = prevStart.endOf("month");
    const trendStart = start.subtract(11, "month");

    const rooms = await Room.find().sort({ roomNumber: 1 }).lean();
    const roomCount = rooms.length;

    // One query for 12 months; slice in memory (data size is small: ~16 rooms/day)
    const [gh12, rest12, office12] = await fetchRange(trendStart, end);
    const inMonth = (d, s, e) => {
      const t = dayjs(d.entryCreateDate);
      return !t.isBefore(s) && !t.isAfter(e);
    };
    const gh = gh12.filter((d) => inMonth(d, start, end));
    const rest = rest12.filter((d) => inMonth(d, start, end));
    const office = office12.filter((d) => inMonth(d, start, end));
    const ghPrev = gh12.filter((d) => inMonth(d, prevStart, prevEnd));
    const restPrev = rest12.filter((d) => inMonth(d, prevStart, prevEnd));
    const officePrev = office12.filter((d) => inMonth(d, prevStart, prevEnd));

    const [salary, salaryPrev] = await Promise.all([
      salaryFor(month, year),
      salaryFor(prevStart.month() + 1, prevStart.year()),
    ]);

    const kpis = monthKpis(gh, rest, office, salary, roomCount, days);
    const prevKpis = monthKpis(ghPrev, restPrev, officePrev, salaryPrev, roomCount, prevEnd.date());

    /* ---------- Daily series ---------- */
    const daily = [];
    for (let i = 0; i < end.date(); i++) {
      const d = start.add(i, "day");
      daily.push({ date: d.format("DD-MM-YYYY"), day: d.date(), weekday: WEEKDAYS[d.day()], gh: 0, rest: 0, office: 0, occupied: 0 });
    }
    const dayIdx = (dateStr) => dayjs(dateStr, "DD-MM-YYYY").date() - 1;
    const heat = {}; // room -> day -> amount
    gh.forEach((doc) => {
      const i = dayIdx(doc.date);
      if (!daily[i]) return;
      const rows = ghSaleRows(doc);
      daily[i].gh += sum(rows, (e) => e.rate);
      daily[i].occupied = new Set(rows.filter((e) => NIGHT_PERIODS.includes(e.period)).map((e) => e.roomNo)).size;
      rows.forEach((e) => {
        if (!SOLD_PERIODS.includes(e.period)) return;
        heat[e.roomNo] ||= {};
        const cell = (heat[e.roomNo][i + 1] ||= { amount: 0, periods: [] });
        cell.amount += e.rate || 0;
        cell.periods.push(e.period);
      });
    });
    rest.forEach((doc) => {
      const i = dayIdx(doc.createDate || doc.date);
      if (daily[i]) daily[i].rest += doc.grandTotal || 0;
    });
    office.forEach((doc) => {
      const i = dayIdx(doc.createDate);
      if (daily[i]) daily[i].office += sum(doc.officeIn || [], (x) => x.amount);
    });
    daily.forEach((d) => (d.total = d.gh + d.rest + d.office));

    /* ---------- Weekday average (only days with data) ---------- */
    const wk = WEEKDAYS.map((w) => ({ weekday: w, total: 0, n: 0 }));
    daily.forEach((d) => {
      if (d.total <= 0) return;
      const w = wk.find((x) => x.weekday === d.weekday);
      w.total += d.total;
      w.n += 1;
    });
    const weekday = wk.map((w) => ({ weekday: w.weekday, avg: w.n ? round(w.total / w.n) : 0 }));

    /* ---------- GH breakdowns ---------- */
    const ghRows = gh.flatMap(ghSaleRows).filter((e) => SOLD_PERIODS.includes(e.period));
    const byMode = {};
    const byType = {};
    ghRows.forEach((e) => {
      inc(byMode, e.modeOfPayment || "Other", e.rate);
      inc(byType, e.type || "Other", e.rate);
    });
    const roomPerf = rooms.map((r) => {
      const rr = ghRows.filter((e) => e.roomNo === r.roomNumber);
      const nights = new Set(rr.filter((e) => NIGHT_PERIODS.includes(e.period)).map((e) => e.createDate)).size;
      return {
        roomNo: r.roomNumber,
        roomType: r.roomType,
        listPrice: r.roomCost,
        revenue: sum(rr, (e) => e.rate),
        bookings: rr.length,
        occupancy: round((nights / days) * 100, 1),
        avgRate: rr.length ? round(sum(rr, (e) => e.rate) / rr.length) : 0,
      };
    });

    /* ---------- Restaurant + office categories ---------- */
    const restExpByCat = {};
    rest.forEach((d) => (d.expenses || []).forEach((x) => inc(restExpByCat, x.categoryName || "Other", x.amount)));
    const restMode = {
      Cash: sum(rest, (r) => r.totalCash),
      Card: sum(rest, (r) => r.totalCard),
      PP: sum(rest, (r) => r.totalPP),
      Upaad: sum(rest, (r) => r.totalUpad),
      Expenses: sum(rest, (r) => r.totalExpenses),
      Levana: sum(rest, (r) => r.totalPending),
    };
    const cashDiffDays = rest
      .filter((r) => r.computerAmount > 0 && Math.abs(r.extraAmount || 0) > 0)
      .map((r) => ({ date: r.createDate, diff: r.extraAmount }))
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 5);
    const o = officeMonthTotals(office);

    /* ---------- 12-month trend ---------- */
    const trend = [];
    for (let i = 0; i < 12; i++) {
      const ms = trendStart.add(i, "month");
      const me = ms.endOf("month");
      trend.push({
        month: ms.format("MMM YY"),
        gh: sum(gh12.filter((d) => inMonth(d, ms, me)).flatMap(ghSaleRows), (e) => e.rate),
        rest: sum(rest12.filter((d) => inMonth(d, ms, me)), (r) => r.grandTotal),
        office: officeMonthTotals(office12.filter((d) => inMonth(d, ms, me))).totalIn,
      });
    }
    trend.forEach((t) => (t.total = t.gh + t.rest + t.office));

    /* ---------- GH unpaid aging (all time, still pending) ---------- */
    const unpaid = await Entry.aggregate([
      { $unwind: "$entry" },
      { $match: { "entry.modeOfPayment": "UnPaid", "entry.isPaid": { $ne: true }, "entry.period": { $ne: "UnPaid" } } },
      { $project: { _id: 0, date: "$entry.createDate", roomNo: "$entry.roomNo", fullname: "$entry.fullname", mobileNumber: "$entry.mobileNumber", rate: "$entry.rate" } },
    ]);
    const aging = { "0-7 days": 0, "8-30 days": 0, "31-90 days": 0, "90+ days": 0 };
    unpaid.forEach((u) => {
      const age = today.diff(dayjs(u.date, "DD-MM-YYYY"), "day");
      const b = age <= 7 ? "0-7 days" : age <= 30 ? "8-30 days" : age <= 90 ? "31-90 days" : "90+ days";
      aging[b] += u.rate || 0;
      u.age = age;
    });
    const topUnpaid = unpaid.sort((a, b) => b.rate - a.rate).slice(0, 8);

    /* ---------- Auto insights ---------- */
    const insights = [];
    const pct = (a, b) => (b ? round(((a - b) / b) * 100, 1) : null);
    const revChange = pct(kpis.totalRevenue, prevKpis.totalRevenue);
    if (revChange !== null)
      insights.push({ tone: revChange >= 0 ? "good" : "bad", text: `Total revenue ${revChange >= 0 ? "up" : "down"} ${Math.abs(revChange)}% vs ${prevStart.format("MMMM")}.` });
    const bestDay = [...weekday].sort((a, b) => b.avg - a.avg)[0];
    const worstDay = [...weekday].filter((w) => w.avg > 0).sort((a, b) => a.avg - b.avg)[0];
    if (bestDay?.avg && worstDay)
      insights.push({ tone: "info", text: `${bestDay.weekday} is the strongest day (avg ₹${bestDay.avg.toLocaleString("en-IN")}); ${worstDay.weekday} is the weakest (avg ₹${worstDay.avg.toLocaleString("en-IN")}).` });
    const lowRoom = [...roomPerf].sort((a, b) => a.occupancy - b.occupancy)[0];
    const topRoom = [...roomPerf].sort((a, b) => b.revenue - a.revenue)[0];
    if (lowRoom && topRoom && roomPerf.some((r) => r.revenue > 0))
      insights.push({ tone: "info", text: `Room ${topRoom.roomNo} earned the most (₹${topRoom.revenue.toLocaleString("en-IN")}); room ${lowRoom.roomNo} had the lowest occupancy (${lowRoom.occupancy}%).` });
    if (kpis.belowListPrice > 0)
      insights.push({ tone: "warn", text: `₹${kpis.belowListPrice.toLocaleString("en-IN")} given below list room price this month.` });
    const overdue = aging["31-90 days"] + aging["90+ days"];
    if (overdue > 0)
      insights.push({ tone: "bad", text: `₹${overdue.toLocaleString("en-IN")} of guest-house dues are older than 30 days.` });
    if (kpis.restSales > 0) {
      const ratio = round((kpis.restExpenses / kpis.restSales) * 100, 1);
      insights.push({ tone: ratio > 45 ? "warn" : "good", text: `Restaurant expenses are ${ratio}% of restaurant sales.` });
    }

    res.status(200).json({
      success: true,
      data: {
        period: { month, year, label: start.format("MMMM YYYY"), daysCounted: days, daysInMonth: end.date(), prevLabel: prevStart.format("MMMM YYYY") },
        roomCount,
        kpis,
        prevKpis,
        daily,
        weekday,
        trend,
        gh: { byMode, byType, roomPerf, heat },
        rest: { expByCat: restExpByCat, mode: restMode, cashDiffDays },
        office: { inByCat: o.inByCat, outByCat: o.outByCat },
        unpaid: { aging, top: topUnpaid, total: sum(unpaid, (u) => u.rate) },
        insights,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/owner/dues  → saare pending guest dues, guest-wise group (read-only)
router.get("/dues", async (req, res) => {
  try {
    const rows = await Entry.aggregate([
      { $unwind: "$entry" },
      { $match: { "entry.modeOfPayment": "UnPaid", "entry.isPaid": { $ne: true }, "entry.period": { $ne: "UnPaid" } } },
      {
        $project: {
          _id: 0,
          date: "$entry.createDate",
          roomNo: "$entry.roomNo",
          fullname: "$entry.fullname",
          mobileNumber: "$entry.mobileNumber",
          rate: "$entry.rate",
          period: "$entry.period",
        },
      },
    ]);
    const today = dayjs();
    const groups = new Map();
    rows.forEach((r) => {
      const mobile = String(r.mobileNumber || "").replace(/\D/g, "");
      const key = mobile.length === 10 ? mobile : `name:${(r.fullname || "").toLowerCase().trim()}`;
      const age = today.diff(dayjs(r.date, "DD-MM-YYYY"), "day");
      if (!groups.has(key)) groups.set(key, { key, fullname: r.fullname, mobile: mobile.length === 10 ? mobile : "", total: 0, oldestDays: 0, stays: [] });
      const g = groups.get(key);
      g.total += r.rate || 0;
      g.oldestDays = Math.max(g.oldestDays, age);
      g.stays.push({ date: r.date, roomNo: r.roomNo, rate: r.rate, period: r.period, age });
    });
    const guests = [...groups.values()]
      .map((g) => ({ ...g, stays: g.stays.sort((a, b) => b.age - a.age) }))
      .sort((a, b) => b.oldestDays - a.oldestDays || b.total - a.total);
    res.json({ success: true, total: guests.reduce((s, g) => s + g.total, 0), guests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
