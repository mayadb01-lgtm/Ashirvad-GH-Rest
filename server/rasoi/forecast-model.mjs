// Ashirvad restaurant: roz ke sale ka forecast (samjhaane layak, multiplicative)
//   forecast(d) = level × weekday(d, mausam) × season(d) × tyohar(d)
// Sirf origin se pehle ka data use hota hai (backtest = asli jaisa).
// Ye file browser (Manager board) aur Node (backtest) dono mein chalti hai.

export const FEST = {
  // fixed tareekh (MM-DD)
  fixed: {
    "01-01": "newyear1", "12-31": "newyear0", "01-14": "uttarayan", "01-15": "vasi", "01-26": "republic",
    "08-15": "independence", "10-02": "gandhi", "12-25": "christmas", "02-14": "valentine",
  },
  // chaand ke hisaab se (har saal alag) — din: naam
  lunar: {
    bestu: ["2021-11-05", "2022-10-26", "2023-11-14", "2024-11-02", "2025-10-22", "2026-11-10", "2027-10-30"],
    diwali: ["2021-11-04", "2022-10-24", "2023-11-12", "2024-10-31", "2025-10-20", "2026-11-08", "2027-10-29"],
    dhuleti: ["2021-03-29", "2022-03-18", "2023-03-08", "2024-03-25", "2025-03-14", "2026-03-04", "2027-03-22"],
    rakhi: ["2021-08-22", "2022-08-11", "2023-08-30", "2024-08-19", "2025-08-09", "2026-08-28", "2027-08-17"],
    janmashtami: ["2021-08-30", "2022-08-19", "2023-09-07", "2024-08-26", "2025-08-16", "2026-09-04", "2027-08-25"],
    dussehra: ["2021-10-15", "2022-10-05", "2023-10-24", "2024-10-12", "2025-10-02", "2026-10-20", "2027-10-09"],
    ganesh: ["2021-09-10", "2022-08-31", "2023-09-19", "2024-09-07", "2025-08-27", "2026-09-14", "2027-09-04"],
    shivratri: ["2021-03-11", "2022-03-01", "2023-02-18", "2024-03-08", "2025-02-26", "2026-02-15", "2027-03-06"],
  },
  // aas-paas ke din bhi alag gine jaate hain (role: -1 = ek din pehle …)
  around: { bestu: [-1, 1, 2], diwali: [-2, -1], dhuleti: [-1], rakhi: [-1, 1], janmashtami: [-1], dussehra: [-1], newyear1: [], uttarayan: [] },
  // lambi avadhi: [tag, ki tareekh se, din se, din tak]
  ranges: { afterdiwali: ["bestu", 3, 12] },
  navratri: ["2021-10-07", "2022-09-26", "2023-10-15", "2024-10-03", "2025-09-22", "2026-10-11", "2027-09-30"], // 9 din
};

const DAY = 864e5;
const P = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
const iso = (t) => new Date(t).toISOString().slice(0, 10);
const add = (s, n) => iso(P(s) + n * DAY);
const dow = (s) => new Date(P(s)).getUTCDay();
const doy = (s) => Math.floor((P(s) - Date.UTC(+s.slice(0, 4), 0, 1)) / DAY); // 0..365
const median = (a) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
const tmean = (a, cut = 0.1) => { if (!a.length) return NaN; const b = [...a].sort((x, y) => x - y), k = Math.floor(b.length * cut); const c = b.slice(k, b.length - k); return c.reduce((x, y) => x + y, 0) / c.length; };

// har tareekh ka tyohar-tag (ya null)
export function festTag(s, cal = FEST) {
  for (const [k, ds] of Object.entries(cal.lunar)) {
    for (const d0 of ds) {
      const off = Math.round((P(s) - P(d0)) / DAY);
      if (off === 0) return k;
      if ((cal.around[k] || []).includes(off)) return `${k}${off > 0 ? "+" : ""}${off}`;
    }
  }
  const md = s.slice(5);
  if (cal.fixed[md]) return cal.fixed[md];
  if (cal.useRanges !== false) for (const [name, [base, a, b]] of Object.entries(cal.ranges || {})) {
    for (const d0 of cal.lunar[base] || []) { const off = Math.round((P(s) - P(d0)) / DAY); if (off >= a && off <= b) return name; }
  }
  for (const d0 of cal.navratri) { const off = Math.round((P(s) - P(d0)) / DAY); if (off >= 0 && off < 9) return "navratri"; }
  return null;
}

const MONSOON = (s) => { const m = +s.slice(5, 7); return m >= 7 && m <= 9; };

/**
 * S: { "YYYY-MM-DD": sale } (sirf asli din, sale > 0)
 * fit(origin): origin se pehle ke data se model banao → { fc(date), parts(date) }
 */
export function makeModel(S, opt = {}) {
  const o = { levelDays: 28, halfLife: 14, wdWeeks: 104, seasonSmooth: 10, festShrink: 1, trim: 0.1, trend: 0, trendDays: 56, trendCap: 0.15, bias: 0, ...opt };
  const keys = Object.keys(S).filter((k) => S[k] > 0).sort();
  const CAL = o.noRanges ? { ...FEST, useRanges: false } : FEST;
  const tag = {}; keys.forEach((k) => (tag[k] = festTag(k, CAL)));
  const L = {}; keys.forEach((k) => (L[k] = Math.log(S[k])));

  // centered 7-day log-mean (weekday nikaalne ke liye), sirf available din
  const idx = {}; keys.forEach((k, i) => (idx[k] = i));

  return function fit(origin) {
    const hist = keys.filter((k) => k < origin);
    if (hist.length < 120) return null;
    const last = hist[hist.length - 1];

    // 1) Weekday asar (mausam ke hisaab se 2 group), pichhle wdWeeks hafte, tyohar wale din chhod kar
    const wdFrom = add(last, -7 * o.wdWeeks);
    const wdAcc = { n: [[], [], [], [], [], [], []], m: [[], [], [], [], [], [], []] };
    for (let i = 3; i < hist.length - 3; i++) {
      const k = hist[i];
      if (k < wdFrom || tag[k]) continue;
      let s = 0, c = 0;
      for (let j = i - 3; j <= i + 3; j++) if (!tag[hist[j]]) { s += L[hist[j]]; c++; }
      if (c < 5) continue;
      (MONSOON(k) ? wdAcc.m : wdAcc.n)[dow(k)].push(L[k] - s / c);
    }
    // monsoon wale weekday: purane saalon ke Jul–Sep bhi (zyada data)
    const wd = { n: [], m: [] };
    for (let w = 0; w < 7; w++) wd.n[w] = median(wdAcc.n[w]) || 0;
    const mAll = [[], [], [], [], [], [], []];
    for (let i = 3; i < hist.length - 3; i++) {
      const k = hist[i]; if (!MONSOON(k) || tag[k]) continue;
      let s = 0, c = 0; for (let j = i - 3; j <= i + 3; j++) if (!tag[hist[j]]) { s += L[hist[j]]; c++; }
      if (c >= 5) mAll[dow(k)].push(L[k] - s / c);
    }
    for (let w = 0; w < 7; w++) { const a = mAll[w]; const v = median(a); wd.m[w] = a.length >= 8 ? v : wd.n[w]; }
    const nm = (arr) => { const m = arr.reduce((x, y) => x + y, 0) / 7; return arr.map((v) => v - m); };
    wd.n = nm(wd.n); wd.m = nm(wd.m);
    const W = (s) => (MONSOON(s) ? wd.m : wd.n)[dow(s)];

    // 2) Mausam (saal ka pattern): har din ka (weekday hata kar) log ÷ uske 365 din ke centered ausat; saalon ka median, ±seasonSmooth din smooth
    const de = {}; hist.forEach((k) => { if (!tag[k]) de[k] = L[k] - W(k); });
    const dk = Object.keys(de).sort();
    // 365-din centered mean (jahan poora window nahi, wahan trailing)
    const pref = [0]; dk.forEach((k, i) => pref.push(pref[i] + de[k]));
    const tIdx = dk.map((k) => P(k));
    const lo = (t) => { let a = 0, b = tIdx.length; while (a < b) { const m = (a + b) >> 1; if (tIdx[m] < t) a = m + 1; else b = m; } return a; };
    const byDoy = Array.from({ length: 366 }, () => []);
    dk.forEach((k, i) => {
      const t = P(k);
      let a = lo(t - 182 * DAY), b = lo(t + 183 * DAY);
      if (b - a < 300) return; // window adhoora: season mein mat gino
      const m = (pref[b] - pref[a]) / (b - a);
      byDoy[doy(k)].push(de[k] - m);
    });
    const raw = byDoy.map((a) => (a.length ? median(a) : NaN));
    const sea = [];
    for (let d = 0; d < 366; d++) {
      const v = [];
      for (let j = -o.seasonSmooth; j <= o.seasonSmooth; j++) { const x = raw[(d + j + 366) % 366]; if (Number.isFinite(x)) v.push(x); }
      sea[d] = v.length ? v.reduce((x, y) => x + y, 0) / v.length : 0;
    }
    const SEA = (s) => sea[doy(s)] || 0;

    // 3) Tyohar asar: har tag ke purane saalon mein (actual − bina-tyohar ka andaaza), median, kam saal → 0 ki taraf
    const fAcc = {};
    hist.forEach((k, i) => {
      const t = tag[k]; if (!t) return;
      const near = [];
      for (let j = Math.max(0, i - 14); j <= Math.min(hist.length - 1, i + 14); j++) { const q = hist[j]; if (!tag[q] && q < origin) near.push(L[q] - W(q) - SEA(q)); }
      if (near.length < 8) return;
      (fAcc[t] ||= []).push(L[k] - W(k) - SEA(k) - tmean(near, 0.1));
    });
    const F = {};
    for (const [t, a] of Object.entries(fAcc)) { const n = a.length; F[t] = median(a) * (n / (n + o.festShrink)); }

    // 4) Level: pichhle levelDays din (tyohar chhod kar) ka weekday+mausam hata kar, naye din ko zyada vazan
    const from = add(last, -(o.levelDays - 1));
    const lv = [], wts = [];
    hist.forEach((k) => {
      if (k < from || tag[k]) return;
      lv.push(L[k] - W(k) - SEA(k));
      const age = (P(last) - P(k)) / DAY;
      wts.push(o.halfLife ? Math.pow(0.5, age / o.halfLife) : 1);
    });
    // trimmed weighted mean
    const ord = lv.map((v, i) => [v, wts[i]]).sort((a, b) => a[0] - b[0]);
    const cut = Math.floor(ord.length * o.trim);
    const kept = ord.slice(cut, ord.length - cut);
    const sw = kept.reduce((s, x) => s + x[1], 0);
    const level = kept.reduce((s, x) => s + x[0] * x[1], 0) / sw;

    // 5) Trend: pichhle trendDays din ka dhalaan (upar/neeche), aadha-adhoora (damped), had ke andar
    let slope = 0, center = 0;
    if (o.trend) {
      const tf = add(last, -(o.trendDays - 1)); const xs = [], ys = [];
      hist.forEach((k) => { if (k >= tf && !tag[k]) { xs.push((P(k) - P(last)) / DAY); ys.push(L[k] - W(k) - SEA(k)); } });
      const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length;
      let nu = 0, de2 = 0; xs.forEach((x, i) => { nu += (x - mx) * (ys[i] - my); de2 += (x - mx) * (x - mx); });
      slope = de2 ? nu / de2 : 0;
      // level ka "kendra" (weighted umar)
      const ages = []; hist.forEach((k) => { if (k >= from && !tag[k]) ages.push((P(last) - P(k)) / DAY); });
      const ww = ages.map((a) => (o.halfLife ? Math.pow(0.5, a / o.halfLife) : 1));
      center = ages.reduce((s, a, i) => s + a * ww[i], 0) / ww.reduce((a, b) => a + b, 0);
    }
    const trendAt = (s) => { if (!o.trend) return 0; const h = (P(s) - P(last)) / DAY + center; return Math.max(-o.trendCap, Math.min(o.trendCap, o.trend * slope * h)); };
    const parts = (s) => {
      const t = festTag(s, CAL);
      return { level: Math.exp(level + trendAt(s) + o.bias), weekday: Math.exp(W(s)), season: Math.exp(SEA(s)), fest: Math.exp(t && F[t] != null ? F[t] : 0), festName: t };
    };
    const fc = (s) => { const p = parts(s); return p.level * p.weekday * p.season * p.fest; };
    return { fc, parts, F, wd, last };
  };
}

// Purana (board wala) tareeka — tulna ke liye
export function baseline(S, s) {
  const kd = Object.keys(S).filter((x) => x < s && S[x] > 0).sort();
  if (kd.length < 14) return null;
  const last = kd[kd.length - 1], from = add(last, -55), from28 = add(last, -27);
  const win = kd.filter((x) => x >= from).map((x) => [x, S[x]]);
  const mean = win.reduce((a, x) => a + x[1], 0) / win.length, w = dow(s);
  const same = win.filter((x) => dow(x[0]) === w).map((x) => x[1]);
  const wfw = same.length ? same.reduce((a, b) => a + b, 0) / same.length / mean : 1;
  const w28 = win.filter((x) => x[0] >= from28).map((x) => x[1]);
  const m28 = w28.length ? w28.reduce((a, b) => a + b, 0) / w28.length : mean;
  const c4 = same.slice(-4); const C = c4.length ? c4.reduce((a, b) => a + b, 0) / c4.length : m28 * wfw;
  return 0.5 * m28 * wfw + 0.5 * C;
}
export const util = { add, dow, P, iso, median };
