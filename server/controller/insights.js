// Business Growth reports (Cashflow, GH growth, Kharch control, Data check)
// ⚠️ READ-ONLY: sirf find/lean. Koi save/update/delete nahi.
// Sirf Admin / Super User (staff ke liye server pe band).
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
const F = "DD-MM-YYYY";
const SOLD = ["day", "night", "extraDay", "extraNight"];
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const IST_MS = 330 * 60 * 1000;

const n = (v) => Number(v) || 0;
const sum = (arr, f) => arr.reduce((s, x) => s + n(f(x)), 0);
const round = (v, d = 0) => Math.round(v * 10 ** d) / 10 ** d;
const inc = (o, k, v) => (o[k] = (o[k] || 0) + n(v));
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim();
const ymOf = (d) => dayjs(d).format("YYYY-MM");
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10));
const range = (start, end) => ({ entryCreateDate: { $gte: start.startOf("day").toDate(), $lte: end.endOf("day").toDate() } });
const fail = (res, e) => res.status(500).json({ success: false, message: e.message });

router.use(isAuthenticated, (req, res, next) => {
  if (req.user?.role === "Admin" || req.user?.isSuperUser) return next();
  return res.status(403).json({ success: false, message: "Owner/Admin only" });
});

const monthList = (from, to) => {
  const out = [];
  let m = from.startOf("month");
  while (!m.isAfter(to, "month") && out.length < 60) {
    out.push(m.format("YYYY-MM"));
    m = m.add(1, "month");
  }
  return out;
};

// ───────────────────────── 1) CASHFLOW (mahina-wise, cash basis) ─────────────────────────
// Aaya  = GH (naqad/online sales + purane baaki ki jama) + Rest (grandTotal − udhaar) + Office In
// Gaya  = Rest galle se kharch + Rest upad + Office Out (category-wise)
// "Personal" aur "Loans" alag dikhaye, taaki business ka asli bachat dikhe.
router.get("/cashflow/:from/:to", async (req, res) => {
  try {
    const from = dayjs(req.params.from, "YYYY-MM", true);
    const to = dayjs(req.params.to, "YYYY-MM", true);
    if (!from.isValid() || !to.isValid() || to.isBefore(from)) {
      return res.status(400).json({ success: false, message: "Month format YYYY-MM chahiye (from <= to)" });
    }
    const q = range(from.startOf("month"), to.endOf("month"));
    const [gh, rest, office] = await Promise.all([
      Entry.find(q, { entry: 1, entryCreateDate: 1 }).lean(),
      RestEntry.find(q, { entryCreateDate: 1, grandTotal: 1, totalPending: 1, totalExpenses: 1, totalUpad: 1 }).lean(),
      OfficeBook.find(q, { entryCreateDate: 1, officeIn: 1, officeOut: 1 }).lean(),
    ]);

    const months = monthList(from, to).map((m) => ({
      month: m,
      label: dayjs(m + "-01").format("MMM YY"),
      ghCash: 0, ghJama: 0, ghUdhaar: 0,
      restCash: 0, restUdhaar: 0,
      officeIn: 0, loansIn: 0,
      restKharch: 0, restUpad: 0,
      officeOut: 0, personalOut: 0,
      inByCat: {}, outByCat: {},
    }));
    const byM = Object.fromEntries(months.map((m) => [m.month, m]));

    gh.forEach((d) => {
      const m = byM[ymOf(d.entryCreateDate)];
      if (!m) return;
      (d.entry || []).forEach((e) => {
        if (e.period === "UnPaid") m.ghJama += n(e.rate); // purane baaki ka paisa aaya
        else if (e.modeOfPayment === "UnPaid") m.ghUdhaar += n(e.rate);
        else m.ghCash += n(e.rate);
      });
    });
    rest.forEach((d) => {
      const m = byM[ymOf(d.entryCreateDate)];
      if (!m) return;
      m.restCash += n(d.grandTotal) - n(d.totalPending);
      m.restUdhaar += n(d.totalPending);
      m.restKharch += n(d.totalExpenses);
      m.restUpad += n(d.totalUpad);
    });
    office.forEach((d) => {
      const m = byM[ymOf(d.entryCreateDate)];
      if (!m) return;
      (d.officeIn || []).forEach((x) => {
        const c = x.categoryName || "Other";
        inc(m.inByCat, c, x.amount);
        if (/loan/i.test(c)) m.loansIn += n(x.amount);
        else m.officeIn += n(x.amount);
      });
      (d.officeOut || []).forEach((x) => {
        const c = x.categoryName || "Other";
        inc(m.outByCat, c, x.amount);
        if (/^personal/i.test(c)) m.personalOut += n(x.amount);
        else m.officeOut += n(x.amount);
      });
    });

    months.forEach((m) => {
      m.aaya = m.ghCash + m.ghJama + m.restCash + m.officeIn; // business income (loan alag)
      m.gaya = m.restKharch + m.restUpad + m.officeOut; // business kharch (personal alag)
      m.businessNet = m.aaya - m.gaya;
      m.net = m.aaya + m.loansIn - m.gaya - m.personalOut;
      Object.keys(m).forEach((k) => typeof m[k] === "number" && (m[k] = round(m[k])));
    });

    const keys = ["ghCash", "ghJama", "ghUdhaar", "restCash", "restUdhaar", "officeIn", "loansIn", "restKharch", "restUpad", "officeOut", "personalOut", "aaya", "gaya", "businessNet", "net"];
    const totals = Object.fromEntries(keys.map((k) => [k, round(sum(months, (m) => m[k]))]));
    const outByCat = {};
    const inByCat = {};
    months.forEach((m) => {
      Object.entries(m.outByCat).forEach(([k, v]) => inc(outByCat, k, v));
      Object.entries(m.inByCat).forEach(([k, v]) => inc(inByCat, k, v));
    });
    res.json({ success: true, data: { months, totals, outByCat, inByCat } });
  } catch (e) {
    fail(res, e);
  }
});

// ───────────────────────── 2) GUEST HOUSE GROWTH ─────────────────────────
router.get("/gh-growth/:start/:end", async (req, res) => {
  try {
    const start = dayjs(req.params.start, F, true);
    const end = dayjs(req.params.end, F, true);
    if (!start.isValid() || !end.isValid() || end.isBefore(start)) {
      return res.status(400).json({ success: false, message: "Date format DD-MM-YYYY chahiye" });
    }
    const [docs, rooms, allForGuests] = await Promise.all([
      Entry.find(range(start, end), { entry: 1, date: 1, entryCreateDate: 1 }).lean(),
      Room.find({}).lean(),
      // purane guest pehchanne ke liye poora itihaas (sirf zaroori fields)
      Entry.find({}, { "entry.mobileNumber": 1, "entry.fullname": 1, "entry.rate": 1, "entry.period": 1, "entry.type": 1, entryCreateDate: 1 }).lean(),
    ]);
    const nRooms = rooms.length || 1;
    const days = end.diff(start, "day") + 1;

    const rows = docs.flatMap((d) =>
      (d.entry || []).filter((e) => SOLD.includes(e.period)).map((e) => ({ ...e, _date: d.entryCreateDate, _key: d.date }))
    );
    const roomDays = new Set(rows.map((e) => `${e._key}|${e.roomNo}`));
    const revenue = sum(rows, (e) => e.rate);
    const discount = sum(rows, (e) => Math.max(n(e.cost) - n(e.rate), 0));

    const byType = {}, byRoomType = {}, byMode = {};
    rows.forEach((e) => {
      inc(byType, e.type || "Other", e.rate);
      inc(byRoomType, e.roomType || "Other", e.rate);
      inc(byMode, e.modeOfPayment || "Other", e.rate);
    });

    // Room-wise
    const roomMap = {};
    rooms.forEach((r) => (roomMap[r.roomNumber] = { roomNo: r.roomNumber, roomType: r.roomType, listRate: r.roomCost, revenue: 0, days: new Set(), stays: 0 }));
    rows.forEach((e) => {
      const r = (roomMap[e.roomNo] ||= { roomNo: e.roomNo, roomType: e.roomType, listRate: 0, revenue: 0, days: new Set(), stays: 0 });
      r.revenue += n(e.rate);
      r.days.add(e._key);
      r.stays += 1;
    });
    const roomWise = Object.values(roomMap)
      .map((r) => ({ roomNo: r.roomNo, roomType: r.roomType, listRate: r.listRate, revenue: round(r.revenue), stays: r.stays, occupancy: round((100 * r.days.size) / days), avgRate: r.stays ? round(r.revenue / r.stays) : 0 }))
      .sort((a, b) => a.roomNo - b.roomNo);

    // Weekday occupancy
    const wdDays = {}, wdUsed = {};
    for (let d = start; !d.isAfter(end, "day"); d = d.add(1, "day")) inc(wdDays, WEEKDAYS[d.day()], 1);
    roomDays.forEach((k) => inc(wdUsed, WEEKDAYS[dayjs(k.split("|")[0], F).day()], 1));
    const weekday = WEEKDAYS.map((w) => ({ day: w, occupancy: wdDays[w] ? round((100 * (wdUsed[w] || 0)) / (wdDays[w] * nRooms)) : 0 }));

    // Monthly trend
    const mt = {};
    rows.forEach((e) => {
      const m = (mt[ymOf(e._date)] ||= { revenue: 0, stays: 0, roomDays: new Set() });
      m.revenue += n(e.rate);
      m.stays += 1;
      m.roomDays.add(`${e._key}|${e.roomNo}`);
    });
    const monthly = Object.keys(mt).sort().map((k) => {
      const dim = dayjs(k + "-01").daysInMonth();
      const m = mt[k];
      return { month: k, label: dayjs(k + "-01").format("MMM YY"), revenue: round(m.revenue), occupancy: round((100 * m.roomDays.size) / (nRooms * dim)), adr: m.stays ? round(m.revenue / m.stays) : 0 };
    });

    // Purane guests (poore itihaas se), is period mein aaye guests
    const hist = {};
    allForGuests.forEach((d) =>
      (d.entry || []).forEach((e) => {
        if (!SOLD.includes(e.period)) return;
        const mob = String(e.mobileNumber || "").replace(/\D/g, "").slice(-10);
        if (mob.length !== 10 || /^(\d)\1{9}$/.test(mob)) return;
        const g = (hist[mob] ||= { mobile: mob, name: "", type: "", stays: 0, spent: 0, last: null, first: null });
        g.stays += 1;
        g.spent += n(e.rate);
        if (e.fullname) g.name = norm(e.fullname);
        if (e.type) g.type = e.type;
        const dt = d.entryCreateDate;
        if (!g.last || dt > g.last) g.last = dt;
        if (!g.first || dt < g.first) g.first = dt;
      })
    );
    const periodMobiles = new Set(rows.map((e) => String(e.mobileNumber || "").replace(/\D/g, "").slice(-10)));
    const periodGuests = Object.values(hist).filter((g) => periodMobiles.has(g.mobile));
    const repeatGuests = periodGuests.filter((g) => g.stays > 1);
    const topGuests = Object.values(hist)
      .filter((g) => g.stays > 1)
      .sort((a, b) => b.stays - a.stays || b.spent - a.spent)
      .slice(0, 100)
      .map((g) => ({ ...g, spent: round(g.spent), last: dayjs(g.last).format(F), first: dayjs(g.first).format(F), daysSinceLast: todayIst().diff(dayjs(g.last), "day") }));

    res.json({
      success: true,
      data: {
        rooms: nRooms,
        days,
        kpi: {
          revenue: round(revenue),
          stays: rows.length,
          occupancy: round((100 * roomDays.size) / (nRooms * days), 1),
          adr: rows.length ? round(revenue / rows.length) : 0,
          revPar: round(revenue / (nRooms * days)),
          discount: round(discount),
          guests: periodGuests.length,
          repeatGuests: repeatGuests.length,
          repeatShare: periodGuests.length ? round((100 * repeatGuests.length) / periodGuests.length) : 0,
          emptyRoomNights: Math.max(nRooms * days - roomDays.size, 0),
        },
        byType, byRoomType, byMode, roomWise, weekday, monthly, topGuests,
      },
    });
  } catch (e) {
    fail(res, e);
  }
});

// ───────────────────────── 3) KHARCH CONTROL ─────────────────────────
// Kharch = Restaurant galle se kharch + Office Out (Personal/Loans/Upad chhod ke)
router.get("/kharch/:months", async (req, res) => {
  try {
    const count = Math.min(Math.max(parseInt(req.params.months, 10) || 6, 2), 24);
    const end = todayIst().endOf("month");
    const start = end.subtract(count - 1, "month").startOf("month");
    const q = range(start, end);
    const [rest, office] = await Promise.all([
      RestEntry.find(q, { entryCreateDate: 1, grandTotal: 1, expenses: 1 }).lean(),
      OfficeBook.find(q, { entryCreateDate: 1, officeOut: 1 }).lean(),
    ]);
    const months = monthList(start, end);
    const sales = Object.fromEntries(months.map((m) => [m, 0]));
    const food = Object.fromEntries(months.map((m) => [m, 0]));
    const total = Object.fromEntries(months.map((m) => [m, 0]));
    const items = {}; // name -> {category, months:{}}
    const cats = {}; // cat -> {months:{}}
    const add = (m, cat, name, amt, src) => {
      if (!(m in total)) return;
      if (/^(personal|loans?|upad)/i.test(cat || "")) return;
      const key = norm(name).toLowerCase() || "(naam nahi)";
      const it = (items[key] ||= { name: norm(name) || "(naam nahi)", category: cat || "Other", source: src, months: {} });
      inc(it.months, m, amt);
      inc((cats[cat || "Other"] ||= { category: cat || "Other", months: {} }).months, m, amt);
      total[m] += n(amt);
      if (/food/i.test(cat || "")) food[m] += n(amt);
    };
    rest.forEach((d) => {
      const m = ymOf(d.entryCreateDate);
      if (m in sales) sales[m] += n(d.grandTotal);
      (d.expenses || []).forEach((x) => add(m, x.categoryName, x.expenseName, x.amount, "Rest"));
    });
    office.forEach((d) => {
      const m = ymOf(d.entryCreateDate);
      (d.officeOut || []).forEach((x) => add(m, x.categoryName, x.expenseName || x.fullname, x.amount, "Office"));
    });

    const monthRows = months.map((m) => ({
      month: m,
      label: dayjs(m + "-01").format("MMM YY"),
      restSales: round(sales[m]),
      food: round(food[m]),
      total: round(total[m]),
      foodPct: sales[m] ? round((100 * food[m]) / sales[m], 1) : 0,
    }));

    const itemList = Object.values(items).map((it) => {
      const vals = months.map((m) => round(it.months[m] || 0));
      return { ...it, months: undefined, values: vals, total: round(vals.reduce((a, b) => a + b, 0)) };
    });
    itemList.sort((a, b) => b.total - a.total);

    // Alert: pichla poora mahina vs usse pehle ke 3 mahino ka average (30%+ aur ₹2000+ zyada)
    const cur = todayIst();
    const lastFullIdx = months.indexOf(cur.subtract(1, "month").format("YYYY-MM"));
    const alerts = [];
    if (lastFullIdx >= 3) {
      itemList.forEach((it) => {
        const now = it.values[lastFullIdx];
        const prev = it.values.slice(lastFullIdx - 3, lastFullIdx);
        const avg = prev.reduce((a, b) => a + b, 0) / 3;
        if (now - avg >= 2000 && (avg === 0 ? now >= 5000 : now >= avg * 1.3)) {
          alerts.push({ name: it.name, category: it.category, month: monthRows[lastFullIdx].label, now: round(now), avg: round(avg), changePct: avg ? round((100 * (now - avg)) / avg) : null });
        }
      });
      alerts.sort((a, b) => b.now - b.avg - (a.now - a.avg));
    }

    const catList = Object.values(cats)
      .map((c) => ({ category: c.category, values: months.map((m) => round(c.months[m] || 0)) }))
      .map((c) => ({ ...c, total: c.values.reduce((a, b) => a + b, 0) }))
      .sort((a, b) => b.total - a.total);

    res.json({ success: true, data: { months: monthRows, items: itemList.slice(0, 40), categories: catList, alerts: alerts.slice(0, 15) } });
  } catch (e) {
    fail(res, e);
  }
});

// ───────────────────────── 4) DATA CHECK (galti alert) ─────────────────────────
router.get("/data-alerts", async (req, res) => {
  try {
    const today = todayIst();
    const from = today.subtract(30, "day");
    const future = { entryCreateDate: { $gt: today.endOf("day").toDate() } };
    const recent = range(from, today.subtract(1, "day"));
    const [ghF, restF, offF, ghR, restR, offR, sal, restNoPos] = await Promise.all([
      Entry.find(future, { date: 1 }).lean(),
      RestEntry.find(future, { createDate: 1 }).lean(),
      OfficeBook.find(future, { createDate: 1 }).lean(),
      Entry.find(recent, { entryCreateDate: 1 }).lean(),
      RestEntry.find(recent, { entryCreateDate: 1 }).lean(),
      OfficeBook.find(recent, { entryCreateDate: 1 }).lean(),
      StaffSalary.find({ year: { $gte: today.year() - 1 } }, { month: 1, year: 1, "rows.salaryPaidAmount": 1, "rows.fullname": 1 }).lean(),
      RestEntry.find({ ...range(today.subtract(60, "day"), today), computerAmount: { $in: [0, null] }, grandTotal: { $gt: 0 } }, { createDate: 1 }).lean(),
    ]);
    const alerts = [];
    const fut = [...ghF.map((d) => ["Guest House", d.date]), ...restF.map((d) => ["Restaurant", d.createDate]), ...offF.map((d) => ["Office", d.createDate])];
    if (fut.length) {
      alerts.push({ level: "error", title: "Aage ki date ki entry", text: fut.map(([b, d]) => `${b}: ${d}`).join(", "), hint: "Aaj ke baad ki date pe entry bhari hai. Galat date ho to sahi karo." });
    }
    const missing = (docs, label, link) => {
      const have = new Set(docs.map((d) => dayjs(d.entryCreateDate).format(F)));
      const miss = [];
      for (let d = from; d.isBefore(today, "day"); d = d.add(1, "day")) if (!have.has(d.format(F))) miss.push(d.format("DD MMM"));
      if (miss.length) alerts.push({ level: miss.length > 3 ? "error" : "warning", title: `${label}: ${miss.length} din ki entry nahi (pichhle 30 din)`, text: miss.join(", "), link });
    };
    missing(ghR, "Guest House", "gh-dashboard");
    missing(restR, "Restaurant", "res-reports/sales-report");
    missing(offR, "Office Book", "office-book");
    const neg = sal.filter((s) => (s.rows || []).some((r) => n(r.salaryPaidAmount) < 0));
    if (neg.length) {
      alerts.push({ level: "warning", title: "Staff Salary mein minus (−) amount", text: neg.map((s) => dayjs(`${s.year}-${String(s.month).padStart(2, "0")}-01`).format("MMM YY")).join(", "), hint: "Salary paid amount minus mein hai. Sahi hai ya galti, check karo.", link: "staff-salary" });
    }
    if (restNoPos.length) {
      alerts.push({ level: "info", title: `Restaurant: ${restNoPos.length} din computer amount khaali (pichhle 60 din)`, text: restNoPos.map((d) => d.createDate).slice(0, 20).join(", "), hint: "Computer (POS) ka total na bharne se farak ka hisaab galat aata hai." });
    }
    res.json({ success: true, data: { today: today.format(F), alerts } });
  } catch (e) {
    fail(res, e);
  }
});

export default router;
