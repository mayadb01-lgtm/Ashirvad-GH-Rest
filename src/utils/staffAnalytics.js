// 👥 Staff ranking ka saara hisaab (server se aaya kachcha data → dashboard ke aankde). Sirf padhta hai.
const DAY = 86400000;
const WD = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WDS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const ROLES = ["Cook", "Tandoor", "Chinese", "Chapati", "Helper", "Waiter", "Captain", "Cashier", "Cleaning", "Manager", "Other"];
const isoAdd = (iso, n) => new Date(Date.parse(iso + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
const wday = (iso) => new Date(iso + "T00:00:00Z").getUTCDay();
const mins = (t) => (/^\d{2}:\d{2}$/.test(t || "") ? +t.slice(0, 2) * 60 + +t.slice(3) : null);
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
export const dayLabel = (iso) => `${WDS[wday(iso)]} ${+iso.slice(8)} ${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][+iso.slice(5, 7) - 1]}`;
export const dateList = (from, to) => {
  const out = [];
  for (let d = from; d <= to; d = isoAdd(d, 1)) out.push(d);
  return out;
};

// Peak din = chuni range mein sabse zyada bikri wale top X% din
export const peakDays = (sales, from, to, pct = 20) => {
  const list = dateList(from, to).filter((d) => (sales[d] || 0) > 0);
  if (list.length < 5) return { set: new Set(), cut: 0, list: [] };
  const sorted = [...list].sort((a, b) => sales[b] - sales[a]);
  const n = Math.max(1, Math.round((list.length * pct) / 100));
  const set = new Set(sorted.slice(0, n));
  return { set, cut: sales[sorted[n - 1]], list: list.filter((d) => set.has(d)) };
};

export function analyse(data, opts = {}) {
  const { from, to, today, staff = [], days = [], sales = {}, adv = {}, salary = {}, meta = {} } = data || {};
  const w = { att: 40, peak: 30, punct: 15, adv: 15, ...(meta.weights || {}), ...(opts.weights || {}) };
  const roles = meta.roles || {};
  const shift = meta.shift || {};
  const need = meta.need || {};
  const peak = peakDays(sales, from, to, opts.peakPct || 20);
  const allDates = dateList(from, to);
  const months = [...new Set(allDates.map((d) => d.slice(0, 7)))];

  // staff → date → record
  const rec = {};
  days.forEach((r) => ((rec[r.s] ||= {})[r.date] = r));
  const hasDaily = days.length > 0;
  const people = staff.filter((s) => s.active || rec[s._id] || adv[s._id] || salary[s._id]);

  const rows = people.map((s) => {
    const my = rec[s._id] || {};
    const list = Object.values(my).filter((r) => r.st !== "WO");
    const present = list.reduce((t, r) => t + (r.st === "P" ? 1 : r.st === "H" ? 0.5 : 0), 0);
    const absentDays = list.filter((r) => r.st === "A").map((r) => r.date).sort();
    const leaveDays = list.filter((r) => r.st === "L").map((r) => r.date);
    // Hazri: din-wise ho to wahi, warna salary sheet ki mahine ki hazri
    const sal = salary[s._id] || {};
    const salAtt = months.reduce((t, m) => t + (sal[m]?.att || 0), 0);
    const salDays = months.filter((m) => sal[m]).reduce((t, m) => t + allDates.filter((d) => d.startsWith(m)).length, 0);
    const attRate = list.length ? present / list.length : salDays ? Math.min(1, salAtt / salDays) : null;
    const attText = list.length ? `${+present.toFixed(1)}/${list.length}` : salDays ? `${salAtt}/${salDays}` : "—";

    // Peak din
    const pRec = peak.list.filter((d) => my[d] && my[d].st !== "WO");
    const pAbs = pRec.filter((d) => my[d].st === "A");
    const pLeave = pRec.filter((d) => my[d].st === "L");
    const pHalf = pRec.filter((d) => my[d].st === "H");
    const peakRate = pRec.length ? 1 - (pAbs.length + 0.5 * pLeave.length + 0.5 * pHalf.length) / pRec.length : null;
    // Nuksaan: gayab wale peak din vs maujood wale peak din ki average bikri
    const pPresent = pRec.filter((d) => my[d].st === "P");
    const lossRaw = pAbs.length >= 2 && pPresent.length >= 2 ? Math.round(avg(pPresent.map((d) => sales[d] || 0)) - avg(pAbs.map((d) => sales[d] || 0))) : null;
    const loss = lossRaw > 0 ? lossRaw : null; // sirf jab gayab wale din bikri sach mein kam rahi

    // Samay: der se aana / rush mein jaldi jaana
    const sh = shift[s._id] || {};
    const st = mins(sh.start);
    const en = mins(sh.end);
    let late = 0;
    let early = 0;
    let timed = 0;
    list.forEach((r) => {
      if (r.st !== "P" && r.st !== "H") return;
      const i = mins(r.in);
      const o = mins(r.out);
      if (i === null && o === null) return;
      timed++;
      if (st !== null && i !== null && i > st + 15) late++;
      if (en !== null && o !== null && r.st === "P" && o < en - 15) early++;
    });
    const punctRate = (st !== null || en !== null) && timed >= 3 ? Math.max(0, 1 - (late + early) / timed) : null;

    // Advance
    const a = adv[s._id] || {};
    const advTotal = months.reduce((t, m) => t + (a[m]?.rest || 0) + (a[m]?.office || 0), 0);
    const advMonths = months.filter((m) => (a[m]?.rest || 0) + (a[m]?.office || 0) > 0).length;
    const earned = months.reduce((t, m) => t + (sal[m]?.earned || 0), 0) || Math.round(present * (s.perDayPay || 0));
    const advRatio = earned > 0 ? advTotal / earned : advTotal > 0 ? 1 : 0;
    const advRate = Math.max(0, 1 - Math.min(1, advRatio)) * 0.7 + (1 - (months.length ? advMonths / months.length : 0)) * 0.3;
    const advLevel = advRatio >= 0.6 ? "High" : advRatio >= 0.35 ? "Watch" : "Safe";

    // Score (jo hissa maloom nahi uska weight baaki mein baant do)
    const parts = [
      [attRate, w.att],
      [peakRate, w.peak],
      [punctRate, w.punct],
      [advRate, w.adv],
    ].filter(([v, wt]) => v !== null && wt > 0);
    const wsum = parts.reduce((t, [, wt]) => t + wt, 0);
    const score = wsum ? Math.round((parts.reduce((t, [v, wt]) => t + v * wt, 0) / wsum) * 100) : null;

    // Aadatein (pattern)
    const patterns = [];
    if (absentDays.length >= 3) {
      const byWd = Array(7).fill(0);
      absentDays.forEach((d) => byWd[wday(d)]++);
      const top = byWd.indexOf(Math.max(...byWd));
      if (byWd[top] >= 3 && byWd[top] / absentDays.length >= 0.4) patterns.push({ text: `Mostly ${WD[top]} leave (${byWd[top]}×)`, level: top === 0 || top === 6 ? "bad" : "warn" });
      const early = absentDays.filter((d) => +d.slice(8) <= 5).length;
      if (early >= 3 && early / absentDays.length >= 0.5) patterns.push({ text: `Leave in first 5 days of month (after salary) ${early}×`, level: "warn" });
      let streaks = 0;
      let run = 1;
      for (let i = 1; i <= absentDays.length; i++) {
        if (i < absentDays.length && absentDays[i] === isoAdd(absentDays[i - 1], 1)) run++;
        else {
          if (run >= 3) streaks++;
          run = 1;
        }
      }
      if (streaks) patterns.push({ text: `3+ days in a row absent ×${streaks}`, level: "bad" });
    }
    if (pAbs.length >= 2 && peakRate !== null && peakRate < 0.75) patterns.push({ text: `Often absent on busy days (${pAbs.length}×)`, level: "bad" });
    if (late >= 4) patterns.push({ text: `Late ${late}×`, level: "warn" });
    if (early >= 3) patterns.push({ text: `Left early in rush ${early}×`, level: "warn" });

    const since = s.since ? String(s.since).slice(0, 10) : null;
    const isNew = since && Date.parse(to) - Date.parse(since) < 90 * DAY;
    // Mahina-wise (report card)
    const monthly = months.map((m) => {
      const md = list.filter((r) => r.date.startsWith(m));
      return {
        m,
        att: md.length ? md.reduce((t, r) => t + (r.st === "P" ? 1 : r.st === "H" ? 0.5 : 0), 0) : sal[m]?.att ?? null,
        of: md.length || null,
        absent: md.filter((r) => r.st === "A").length,
        peakAbs: pAbs.filter((d) => d.startsWith(m)).length,
        adv: (a[m]?.rest || 0) + (a[m]?.office || 0),
        earned: sal[m]?.earned || 0,
      };
    });

    return {
      id: s._id,
      name: s.name,
      role: roles[s._id] || "",
      category: s.category,
      perDayPay: s.perDayPay || 0,
      active: s.active,
      isNew,
      attRate,
      attText,
      absent: absentDays.length,
      leave: leaveDays.length,
      peakRec: pRec.length,
      peakAbs: pAbs.length,
      peakAbsDays: pAbs,
      peakRate,
      loss,
      late,
      early,
      punctRate,
      advTotal,
      advMonths,
      monthsCount: months.length,
      earned,
      advRatio,
      advLevel,
      score,
      patterns,
      monthly,
      rec: my,
    };
  });

  const ranked = rows.filter((r) => r.score !== null && r.active).sort((a, b) => b.score - a.score);
  ranked.forEach((r, i) => (r.rank = i + 1));

  // Inaam: top 3 (score 80+) — 2 / 1.5 / 1 din ki pagaar
  const rewards = ranked
    .filter((r) => r.score >= 80 && !r.isNew)
    .slice(0, 3)
    .map((r, i) => ({ id: r.id, name: r.name, score: r.score, amount: Math.round((r.perDayPay || 0) * [2, 1.5, 1][i] / 50) * 50 }));

  // Team ke aankde
  const daily = days.filter((r) => r.st !== "WO");
  const pres = (arr) => (arr.length ? arr.reduce((t, r) => t + (r.st === "P" ? 1 : r.st === "H" || r.st === "L" ? 0.5 : 0), 0) / arr.length : null);
  const peakRecs = daily.filter((r) => peak.set.has(r.date));
  const normalRecs = daily.filter((r) => !peak.set.has(r.date));
  const team = {
    att: hasDaily ? pres(daily) : avg(rows.filter((r) => r.attRate !== null).map((r) => r.attRate)) || null,
    peakAtt: pres(peakRecs),
    normalAtt: pres(normalRecs),
    peakAbsences: peakRecs.filter((r) => r.st === "A").length,
    peakCount: peak.list.length,
    advTotal: rows.reduce((t, r) => t + r.advTotal, 0),
    advHigh: rows.filter((r) => r.active && r.advLevel === "High").length,
    best: ranked[0] || null,
  };

  // Role ki kami: peak din par har role mein kitne aaye vs kam se kam kitne chahiye
  const shortages = [];
  if (hasDaily && Object.values(need).some((n) => n > 0)) {
    peak.list.forEach((d) => {
      const byRole = {};
      rows.forEach((r) => {
        const x = r.rec[d];
        if (r.role && x && (x.st === "P" || x.st === "H")) byRole[r.role] = (byRole[r.role] || 0) + (x.st === "P" ? 1 : 0.5);
      });
      Object.entries(need).forEach(([role, n]) => {
        if (n > 0 && (byRole[role] || 0) < n) shortages.push({ date: d, role, have: byRole[role] || 0, need: n, sale: sales[d] || 0 });
      });
    });
  }

  // Aage ke 14 din: kaun sa din peak hoga (hafte ke din ki purani bikri se) + kaun gayab ho sakta hai
  const recentDates = Object.keys(sales).filter((d) => d <= today && d > isoAdd(today, -120) && sales[d] > 0);
  const overall = avg(recentDates.map((d) => sales[d]));
  const wdAvg = Array(7)
    .fill(0)
    .map((_, i) => avg(recentDates.filter((d) => wday(d) === i).map((d) => sales[d])));
  const upcoming = [];
  for (let k = 1; k <= 14; k++) {
    const d = isoAdd(today, k);
    const i = wday(d);
    if (!overall || wdAvg[i] < overall * 1.12) continue;
    const risks = rows
      .filter((r) => r.active)
      .map((r) => {
        const same = Object.values(r.rec).filter((x) => x.st !== "WO" && wday(x.date) === i);
        const abs = same.filter((x) => x.st === "A").length;
        return { id: r.id, name: r.name, role: r.role, p: same.length >= 3 ? abs / same.length : 0, n: same.length };
      })
      .filter((x) => x.p >= 0.3)
      .sort((a, b) => b.p - a.p);
    const roleShort = {};
    risks.forEach((x) => x.role && (roleShort[x.role] = (roleShort[x.role] || 0) + x.p));
    upcoming.push({ date: d, expected: Math.round(wdAvg[i]), lift: Math.round((wdAvg[i] / overall - 1) * 100), risks, roleShort });
  }

  return { rows, ranked, team, peak, rewards, shortages, upcoming, hasDaily, weights: w, months };
}

// WhatsApp ka sandesh (manager ko) — agle peak din ki chetavni
export const warningText = (biz, up) => {
  const lines = [`*${biz} — staff alert*`];
  up.slice(0, 4).forEach((u) => {
    lines.push(`\n*${dayLabel(u.date)}* (busy day, ~${u.lift}% more sale)`);
    if (!u.risks.length) lines.push("No high-risk staff.");
    u.risks.slice(0, 5).forEach((r) => lines.push(`• ${r.name}${r.role ? ` (${r.role})` : ""} — ${Math.round(r.p * 100)}% chance absent`));
  });
  lines.push("\nPlease keep a backup ready.");
  return lines.join("\n");
};
