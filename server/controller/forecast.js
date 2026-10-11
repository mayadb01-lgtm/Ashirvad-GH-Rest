// 🔮 Forecast: aage ke 12 mahine ka andaza (rooms, GH kamai, restaurant sale, hafte ka cash),
// pichhle saal se tulna, aur saal ke important dates.
// ⚠️ READ-ONLY: sirf find/lean. Koi save/update/delete nahi. Sirf Admin / Super User.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { isAuthenticated } from "../middleware/auth.js";
import Entry from "../model/entry.js";
import Room from "../model/room.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import { BanquetBooking, banquetTotals } from "../model/banquet.js";
import { EVENTS, EVENT_INFO, MUHURAT } from "../utils/forecastCalendar.js";

dayjs.extend(customParseFormat);
const router = Router();

router.use(isAuthenticated, (req, res, next) => {
  if (req.user?.role === "Admin" || req.user?.isSuperUser) return next();
  return res.status(403).json({ success: false, message: "Owner/Admin only" });
});

const F = "DD-MM-YYYY";
const ISO = "YYYY-MM-DD";
const SOLD = ["day", "night", "extraDay", "extraNight"];
const BIZ_IN = new Set(["Banquet", "Bakery Baada", "Moti baada", "Bhangar/oil", "Soda Shop", "BQ decoration", "DRA Company GH", "Moti Wifi"]);
const SHRINK = 0.6; // tyohar ka asar sirf 60% lete hain (data kam hai)
const BASE_ERR = { rooms: 0.2, gh: 0.243, rest: 0.102 }; // 4 hafte ka back-test error
const IST_MS = 330 * 60 * 1000;
const n = (v) => Number(v) || 0;
const r0 = (v) => Math.round(v);
const r1 = (v) => Math.round(v * 10) / 10;
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10));

// Kaun sa din kis tyohar mein hai
const EVENT_OF = {};
const EVENT_START = {};
Object.entries(EVENTS).forEach(([name, list]) =>
  list.forEach(([a, b]) => {
    for (let d = dayjs(a); !d.isAfter(dayjs(b), "day"); d = d.add(1, "day")) {
      EVENT_OF[d.format(ISO)] = name;
      EVENT_START[d.format(ISO)] = a;
    }
  })
);

// ───────── roz ka hisaab (poora itihaas) ─────────
const loadDaily = async () => {
  const [gh, rest, office, rooms, bookings] = await Promise.all([
    Entry.find({}, { entry: 1, date: 1 }).lean(),
    RestEntry.find({}, { createDate: 1, totalCash: 1, totalCard: 1, totalPP: 1, totalUpad: 1, totalPending: 1, totalExpenses: 1 }).lean(),
    OfficeBook.find({}, { createDate: 1, officeIn: 1, officeOut: 1 }).lean(),
    Room.countDocuments({}),
    BanquetBooking.find({}, { payments: 1, status: 1, eventDate: 1, menus: 1, addons: 1, hallRent: 1, discount: 1, gstPercent: 1, occasion: 1, guests: 1, slot: 1 }).lean(),
  ]);
  const D = {};
  const get = (k) => (D[k] ||= { occ: 0, rev: 0, ghIn: 0, rest: null, restIn: 0, offIn: 0, offOut: 0, staff: 0, personal: 0, banquet: 0, hasGh: false, hasOff: false });
  gh.forEach((doc) => {
    const d = dayjs(doc.date, F, true);
    if (!d.isValid()) return;
    const x = get(d.format(ISO));
    const sold = (doc.entry || []).filter((e) => SOLD.includes(e.period));
    x.occ += new Set(sold.map((e) => e.roomNo)).size;
    x.rev += sold.reduce((s, e) => s + n(e.rate), 0);
    x.ghIn += sold.filter((e) => e.modeOfPayment !== "UnPaid").reduce((s, e) => s + n(e.rate), 0);
    x.ghIn += (doc.entry || []).filter((e) => e.period === "UnPaid").reduce((s, e) => s + n(e.rate), 0);
    if (sold.length) x.hasGh = true;
  });
  rest.forEach((doc) => {
    const d = dayjs(doc.createDate, F, true);
    if (!d.isValid()) return;
    const x = get(d.format(ISO));
    const sale = n(doc.totalCash) + n(doc.totalCard) + n(doc.totalPP) + n(doc.totalUpad) + n(doc.totalPending) + n(doc.totalExpenses);
    x.rest = (x.rest || 0) + sale;
    x.restIn += n(doc.totalCash) + n(doc.totalCard) + n(doc.totalPP);
  });
  office.forEach((doc) => {
    const d = dayjs(doc.createDate, F, true);
    if (!d.isValid()) return;
    const x = get(d.format(ISO));
    x.hasOff = true;
    (doc.officeIn || []).forEach((e) => {
      if (BIZ_IN.has(e.categoryName)) x.offIn += n(e.amount);
      if (e.categoryName === "Banquet") x.banquet += n(e.amount);
    });
    (doc.officeOut || []).forEach((e) => {
      const c = e.categoryName;
      if (c === "Personal") x.personal += n(e.amount);
      else if (c === "Staff" || c === "Upad") x.staff += n(e.amount);
      else x.offOut += n(e.amount);
    });
  });
  // Banquet module ka paisa (jis din mila) bhi banquet aavak mein
  bookings.forEach((b) =>
    (b.payments || []).forEach((p) => {
      if (p.cancelled) return;
      const d = dayjs(p.date, F, true);
      if (d.isValid()) get(d.format(ISO)).banquet += n(p.amount);
    })
  );
  // ₹1,000 se kam ki restaurant entry = test / adhoori, gin-ti mein nahi
  Object.values(D).forEach((x) => {
    if (x.rest != null && x.rest < 1000) x.rest = null;
  });
  return { D, nRooms: rooms || 16, bookings };
};

// Kisi series ki value (null = data nahi)
const SERIES = {
  occ: (x) => (x && x.hasGh ? x.occ : null),
  rev: (x) => (x && x.hasGh ? x.rev : null),
  ghIn: (x) => (x && x.hasGh ? x.ghIn : null),
  rest: (x) => (x ? x.rest : null),
  restIn: (x) => (x && x.rest != null ? x.restIn : null),
};

const build = (D, nRooms, today, bookings = []) => {
  const keys = Object.keys(D).sort();
  const first = keys.find((k) => k >= "2025-01-01") || keys[0];
  const val = (col, k) => SERIES[col](D[k]);
  const lastOf = (col) => [...keys].reverse().find((k) => val(col, k) != null);
  const lastData = Object.fromEntries(Object.keys(SERIES).map((c) => [c, lastOf(c)]));
  const days = (a, b) => {
    const out = [];
    for (let d = dayjs(a); !d.isAfter(dayjs(b), "day"); d = d.add(1, "day")) out.push(d.format(ISO));
    return out;
  };
  const histDays = days(first, keys[keys.length - 1]);

  // 1) Mahine ka pattern (tyohar ke din chhod ke)
  const season = {};
  Object.keys(SERIES).forEach((col) => {
    const ym = {};
    histDays.forEach((k) => {
      const v = val(col, k);
      if (v == null || EVENT_OF[k]) return;
      (ym[k.slice(0, 7)] ||= []).push(v);
    });
    const byY = {};
    Object.entries(ym).forEach(([k, a]) => {
      if (a.length < 5) return;
      (byY[k.slice(0, 4)] ||= {})[+k.slice(5, 7)] = mean(a);
    });
    const ref = Object.keys(byY).find((y) => Object.keys(byY[y]).length === 12);
    const S = {};
    if (!ref) {
      for (let m = 1; m <= 12; m++) S[m] = 1;
    } else {
      const adj = {};
      Object.entries(byY).forEach(([y, ms]) => {
        const common = Object.keys(ms).filter((m) => byY[ref][m] != null);
        if (!common.length) return;
        const f = mean(common.map((m) => byY[ref][m])) / mean(common.map((m) => ms[m]));
        Object.entries(ms).forEach(([m, v]) => (adj[m] ||= []).push(v * f));
      });
      const raw = {};
      for (let m = 1; m <= 12; m++) raw[m] = adj[m] ? mean(adj[m]) : NaN;
      const avg = mean(Object.values(raw).filter((v) => !isNaN(v)));
      for (let m = 1; m <= 12; m++) S[m] = isNaN(raw[m]) ? 1 : raw[m] / avg;
    }
    season[col] = S;
  });

  // 2) Tyohar ka asar (pichhle saalon mein, aam din ke mukable)
  const eff = {};
  Object.entries(EVENTS).forEach(([name, list]) => {
    eff[name] = {};
    Object.keys(SERIES).forEach((col) => {
      const vals = [];
      list.forEach(([a, b]) => {
        if (b > lastData[col] || a < "2025-01-20") return;
        const pre = days(dayjs(a).subtract(56, "day").format(ISO), dayjs(a).subtract(1, "day").format(ISO)).filter((k) => !EVENT_OF[k] && val(col, k) != null);
        if (pre.length < 20) return;
        const dm = {};
        pre.forEach((k) => (dm[dayjs(k).day()] ||= []).push(val(col, k)));
        const preMean = mean(pre.map((k) => val(col, k)));
        const during = days(a, b).filter((k) => val(col, k) != null);
        if (!during.length) return;
        const base = mean(during.map((k) => (dm[dayjs(k).day()] ? mean(dm[dayjs(k).day()]) : preMean)));
        if (base > 0) vals.push(mean(during.map((k) => val(col, k))) / base);
      });
      eff[name][col] = vals.length ? { x: mean(vals), n: vals.length } : null;
    });
  });

  // 3) Aaj ka level: pichhle 8 hafte, har weekday ka average (mahine ke pattern se saaf)
  const level = {};
  Object.keys(SERIES).forEach((col) => {
    const end = lastData[col];
    if (!end) return;
    const win = days(dayjs(end).subtract(55, "day").format(ISO), end).filter((k) => !EVENT_OF[k] && val(col, k) != null);
    const sIdx = mean(win.map((k) => season[col][+k.slice(5, 7)]));
    const dm = {};
    win.forEach((k) => (dm[dayjs(k).day()] ||= []).push(val(col, k)));
    const all = mean(win.map((k) => val(col, k))) / sIdx;
    level[col] = Object.fromEntries([0, 1, 2, 3, 4, 5, 6].map((w) => [w, dm[w] ? mean(dm[w]) / sIdx : all]));
  });
  const fc = (col, k) => {
    if (!level[col]) return 0;
    const ev = EVENT_OF[k];
    let sIdx = season[col][+k.slice(5, 7)];
    if (ev && eff[ev]?.[col]) {
      // tyohar ka asar uske pehle ke 8 hafte ke mukable naapa tha, isliye wahi mahina-pattern lo
      const st = dayjs(EVENT_START[k]);
      sIdx = mean([1, 2, 3, 4, 5, 6, 7, 8].map((w) => season[col][st.subtract(w * 7, "day").month() + 1]));
    }
    let v = level[col][dayjs(k).day()] * sIdx;
    if (ev && eff[ev]?.[col]) v *= 1 + (eff[ev][col].x - 1) * SHRINK;
    if (col === "occ") v = Math.min(v, nRooms);
    return Math.max(0, v);
  };
  // asli ho to asli, warna andaza
  const actOrFc = (col, k) => (k <= lastData[col] && val(col, k) != null ? val(col, k) : k <= lastData[col] ? 0 : fc(col, k));

  // 4) Office: pichhle 3 poore mahine ka level x mahine ke hafte ka hissa
  const offKeys = keys.filter((k) => D[k].hasOff);
  const lastOff = offKeys[offKeys.length - 1];
  const offCols = ["offIn", "offOut", "staff", "personal"];
  const office = {};
  offCols.forEach((c) => {
    const wom = [0, 0, 0, 0];
    let tot = 0;
    offKeys.filter((k) => k >= "2025-01-01").forEach((k) => {
      const w = Math.min(Math.floor((+k.slice(8, 10) - 1) / 7), 3);
      wom[w] += D[k][c];
      tot += D[k][c];
    });
    const lastFull = dayjs(lastOff).add(1, "day").date() === 1 ? dayjs(lastOff) : dayjs(lastOff).startOf("month").subtract(1, "day");
    const months = [0, 1, 2].map((i) => lastFull.subtract(i, "month").format("YYYY-MM"));
    const monthly = mean(months.map((m) => offKeys.filter((k) => k.startsWith(m)).reduce((s, k) => s + D[k][c], 0)));
    office[c] = (k) => {
      const d = dayjs(k);
      const w = Math.min(Math.floor((d.date() - 1) / 7), 3);
      const dIn = w < 3 ? 7 : d.daysInMonth() - 21;
      return (monthly * (tot ? wom[w] / tot : 0.25)) / dIn;
    };
  });

  // ───── roz ka andaza: aaj se 12 mahine ─────
  const start = today.format(ISO);
  const end = today.add(12, "month").subtract(1, "day").format(ISO);
  const ly = (col, k) => {
    const p = dayjs(k).subtract(364, "day").format(ISO);
    return p <= lastData[col] ? val(col, p) : null;
  };
  const daily = days(start, end).map((k) => ({
    date: k,
    rooms: r1(fc("occ", k)),
    gh: r0(fc("rev", k)),
    rest: r0(fc("rest", k)),
    event: EVENT_OF[k] || "",
    lyRooms: ly("occ", k),
    lyGh: ly("rev", k),
    lyRest: ly("rest", k),
  }));

  // ───── hafte ka cash (Som–Ravi) ─────
  const wk0 = today.day() === 1 ? today : today.add((8 - today.day()) % 7, "day");
  const weeks = [];
  for (let i = 0; i < 52; i++) {
    const ws = wk0.add(i * 7, "day");
    const dd = days(ws.format(ISO), ws.add(6, "day").format(ISO));
    const s = (f) => dd.reduce((t, k) => t + f(k), 0);
    const ghIn = s((k) => fc("ghIn", k)), restIn = s((k) => fc("restIn", k));
    const offIn = s(office.offIn), offOut = s(office.offOut), staff = s(office.staff), personal = s(office.personal);
    const tin = ghIn + restIn + offIn, tout = offOut + staff, net = tin - tout;
    const ma = ws.diff(today, "day") / 30.4;
    const half = 1.41 * Math.hypot(0.113 * tin, 0.172 * tout) * (1 + 0.1 * Math.max(0, ma - 1));
    weeks.push({
      weekStart: ws.format(ISO),
      label: `${ws.format("D MMM")} – ${ws.add(6, "day").format("D MMM YY")}`,
      cashIn: r0(tin), cashOut: r0(tout), net: r0(net), low: r0(net - half), high: r0(net + half),
      personal: r0(personal), afterPersonal: r0(net - personal),
    });
  }

  // ───── mahine ka andaza vs pichhla saal ─────
  const sumMonth = (col, m, f) => days(dayjs(m + "-01").format(ISO), dayjs(m + "-01").endOf("month").format(ISO)).reduce((t, k) => t + f(col, k), 0);
  const actual = (col, k) => val(col, k) || 0;
  const months = [];
  for (let i = 0; i < 12; i++) {
    const m = today.startOf("month").add(i, "month").format("YYYY-MM");
    const lyM = dayjs(m + "-01").subtract(1, "year").format("YYYY-MM");
    const k = i + 1;
    const row = { month: m, label: dayjs(m + "-01").format("MMM YY") };
    [["rooms", "occ"], ["gh", "rev"], ["rest", "rest"]].forEach(([key, col]) => {
      const p = sumMonth(col, m, actOrFc);
      const e = BASE_ERR[key] * (1 + 0.1 * (k - 1));
      row[key] = r0(p);
      row[key + "Low"] = r0(p * (1 - e));
      row[key + "High"] = r0(p * (1 + e));
      row[key + "Ly"] = r0(sumMonth(col, lyM, actual));
    });
    months.push(row);
  }

  // ───── itihaas: har mahine ka asli ─────
  const history = [];
  for (let m = dayjs(first).startOf("month"); !m.isAfter(dayjs(lastData.rest || lastData.occ), "month") && m.isBefore(today.startOf("month"), "month"); m = m.add(1, "month")) {
    const ym = m.format("YYYY-MM");
    const dd = days(m.format(ISO), m.endOf("month").format(ISO));
    history.push({
      month: ym,
      label: m.format("MMM YY"),
      rooms: r0(dd.reduce((t, k) => t + actual("occ", k), 0)),
      gh: r0(dd.reduce((t, k) => t + actual("rev", k), 0)),
      rest: r0(dd.reduce((t, k) => t + actual("rest", k), 0)),
      banquet: r0(dd.reduce((t, k) => t + (D[k]?.banquet || 0), 0)),
    });
  }

  // ───── important dates (aaj se 12 mahine) ─────
  const keyDates = [];
  Object.entries(EVENTS).forEach(([name, list]) =>
    list.forEach(([a, b]) => {
      if (b < start || a > end) return;
      const info = EVENT_INFO[name] || {};
      keyDates.push({
        start: a, end: b, event: name, kind: info.kind || "Festival", action: info.action || "",
        roomsX: eff[name]?.occ ? Math.round(eff[name].occ.x * 100) / 100 : null,
        restX: eff[name]?.rest ? Math.round(eff[name].rest.x * 100) / 100 : null,
        basedOn: Math.max(eff[name]?.occ?.n || 0, eff[name]?.rest?.n || 0),
        // tyohar ki wajah se kitna zyada / kam (aam din ke mukable): mauka ya khali jagah
        ...(() => {
          const dd = days(a < start ? start : a, b > end ? end : b);
          const extra = (col) => {
            const e = eff[name]?.[col];
            if (!e) return 0;
            const f = 1 + (e.x - 1) * SHRINK;
            return dd.reduce((t, k) => t + fc(col, k) - fc(col, k) / f, 0);
          };
          return { days: dd.length, extraRooms: r1(extra("occ")), extraGh: r0(extra("rev")), extraRest: r0(extra("rest")) };
        })(),
      });
    })
  );
  // Shaadi ka season: lagatar muhurat wale mahine
  const muMonths = Object.keys(MUHURAT).filter((m) => m >= start.slice(0, 7) && m <= end.slice(0, 7)).sort();
  let run = [];
  const flush = () => {
    if (!run.length) return;
    const cnt = run.reduce((t, m) => t + MUHURAT[m].split(",").length, 0);
    const firstDay = run[0] + "-" + String(MUHURAT[run[0]].split(",")[0].trim()).padStart(2, "0");
    const lastM = run[run.length - 1];
    const lastDay = lastM + "-" + String(MUHURAT[lastM].split(",").pop().trim()).padStart(2, "0");
    keyDates.push({ start: firstDay, end: lastDay, event: `Wedding season (${cnt} muhurat dates)`, kind: "Wedding", action: "Sell banquet + rooms + food package; call past clients early.", roomsX: null, restX: null, basedOn: 0 });
    run = [];
  };
  const dayOf = (m, which) => dayjs(m + "-" + String(MUHURAT[m].split(",")[which === "first" ? 0 : MUHURAT[m].split(",").length - 1].trim()).padStart(2, "0"));
  muMonths.forEach((m, i) => {
    // 25 din se zyada ka gap (jaise kharmas / chaturmas) = naya season
    if (i && dayOf(m, "first").diff(dayOf(muMonths[i - 1], "last"), "day") > 25) flush();
    run.push(m);
  });
  flush();
  keyDates.sort((x, y) => x.start.localeCompare(y.start));

  // 🎉 Banquet: pichhle saalon mein usi mahine ki aavak + pehle se pakki bookings + muhurat
  const live = bookings.filter((b) => b.status !== "cancelled").map((b) => {
    const d = dayjs(b.eventDate, F, true);
    const t = banquetTotals(b);
    return d.isValid() ? { date: d.format(ISO), value: t.total, paid: t.paid, occasion: b.occasion || "Event", guests: n(b.guests), slot: b.slot || "" } : null;
  }).filter(Boolean);
  const banquetMonths = months.map((r) => {
    const m = r.month;
    const past = [1, 2].map((y) => {
      const pm = dayjs(m + "-01").subtract(y, "year").format("YYYY-MM");
      const h = history.find((x) => x.month === pm);
      return h ? h.banquet : null;
    });
    const vals = past.filter((v) => v != null);
    const bk = live.filter((b) => b.date.startsWith(m));
    const bookedValue = r0(bk.reduce((t, b) => t + b.value, 0));
    const expected = Math.max(vals.length ? mean(vals) : 0, bookedValue);
    const row = {
      month: m, label: r.label,
      muhurat: MUHURAT[m] ? MUHURAT[m].split(",").length : 0, dates: MUHURAT[m] || "",
      lastYear: past[0], twoYearsAgo: past[1],
      expected: r0(expected),
      low: r0(Math.max(vals.length ? Math.min(...vals) : 0, bookedValue)),
      high: r0(Math.max(vals.length ? Math.max(...vals) : 0, bookedValue)),
      booked: bk.length, bookedValue, advance: r0(bk.reduce((t, b) => t + b.paid, 0)),
    };
    // mahine ki row mein bhi
    r.banquet = row.expected;
    r.banquetLow = row.low;
    r.banquetHigh = row.high;
    r.banquetLy = past[0] ?? 0;
    r.banquetBooked = bookedValue;
    return row;
  });
  // Pakki banquet bookings ko important dates mein (customer ka naam nahi)
  live.filter((b) => b.date >= start && b.date <= end).forEach((b) =>
    keyDates.push({
      start: b.date, end: b.date, kind: "Banquet",
      event: `Banquet booking: ${b.occasion}${b.guests ? ` (${b.guests} guests)` : ""}`,
      action: `${b.slot ? b.slot + " · " : ""}Bill ₹${Math.round(b.value).toLocaleString("en-IN")}, advance ₹${Math.round(b.paid).toLocaleString("en-IN")}. Plan staff, stock and rooms for guests.`,
      roomsX: null, restX: null, basedOn: 0,
    })
  );
  keyDates.sort((x, y) => x.start.localeCompare(y.start));

  // Data kitne time ka
  const firstOf = (f) => keys.find((k) => k >= "2025-01-01" && f(D[k]));
  const coverage = [
    { item: "Guest House", from: firstOf((x) => x.hasGh), to: lastData.occ },
    { item: "Restaurant", from: firstOf((x) => x.rest != null), to: lastData.rest },
    { item: "Office & banquet", from: firstOf((x) => x.hasOff), to: lastOff },
    { item: "Forecast", from: start, to: end },
  ];

  const recent = days(dayjs(start).subtract(70, "day").format(ISO), dayjs(start).subtract(1, "day").format(ISO)).map((k) => ({ date: k, rooms: val("occ", k), gh: val("rev", k), rest: val("rest", k) }));

  return { today: start, nRooms, coverage, daily, recent, weeks, months, history, keyDates, banquetMonths, method: { shrink: SHRINK, baseErr: BASE_ERR } };
};

router.get("/", async (req, res) => {
  try {
    const { D, nRooms, bookings } = await loadDaily();
    res.json({ success: true, data: build(D, nRooms, todayIst(), bookings) });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
export { loadDaily };
