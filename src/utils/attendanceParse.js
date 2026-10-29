// 📥 Attendance machine ki din-wise file (Excel/CSV) → [{ name, code, date: "YYYY-MM-DD", st, in, out }]
// Teen tarah ki file samajhta hai:
//  1. "Lambi" list: har line = ek staff + ek din (Date, Name, Status / In / Out)
//  2. Jaal (grid): har line = ek staff, upar 1..31 tareekh, khane mein P / A / time
//  3. Block (eSSL jaisa): har staff ka alag block — "Status", "In Time", "Out Time" ki lines, upar 1..31
// st: P (aaya) · A (gayab) · H (aadha din) · L (chhutti) · WO (week off / holiday)

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const pad = (n) => String(n).padStart(2, "0");
const txt = (v) => (v === null || v === undefined ? "" : v instanceof Date ? "" : String(v)).trim();
const iso = (y, m, d) => {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null;
};

// Ek tareekh (Date object, Excel number, ya text) → "YYYY-MM-DD"
export const parseDate = (v) => {
  if (v instanceof Date && !isNaN(v)) return iso(v.getFullYear(), v.getMonth() + 1, v.getDate());
  if (typeof v === "number" && v > 30000 && v < 80000) {
    const d = new Date(Math.round((v - 25569) * 86400000));
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const s = txt(v);
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s);
  if (m) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], +m[2], +m[1]); // India: DD-MM-YYYY
  m = /^(\d{1,2})[-\s/.]*([A-Za-z]{3,})[a-z]*[-\s/.,]*(\d{2,4})/.exec(s);
  if (m) {
    const mi = MONTHS.indexOf(m[2].slice(0, 3).toLowerCase());
    if (mi >= 0) return iso(m[3].length === 2 ? 2000 + +m[3] : +m[3], mi + 1, +m[1]);
  }
  return null;
};

const TIME_RE = /\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/g;
const times = (s) => [...String(s).matchAll(TIME_RE)].map((m) => `${pad(+m[1])}:${m[2]}`);

// Ek khane ki value → { st, in, out } ya null (khaali / samajh nahi aaya)
export const parseCell = (v) => {
  if (v instanceof Date && !isNaN(v)) return { st: "P", in: `${pad(v.getHours())}:${pad(v.getMinutes())}`, out: "" };
  const s = txt(v).toUpperCase();
  if (!s || s === "-" || s === "--") return null;
  const t = times(s);
  const word = s.replace(TIME_RE, " ").replace(/[^A-Z½/]+/g, " ").trim();
  let st = null;
  if (/½|\bHD\b|HALF|P\/2|\bA\/P\b|\bP\/A\b|\bHF\b/.test(s)) st = "H";
  else if (/^(P|PR|PRE|PRESENT|POW|WOP|PH ?P|MIS|MISS|SP)\b/.test(word)) st = "P";
  else if (/^(A|AB|ABS|ABSENT|LWP)\b/.test(word)) st = "A";
  else if (/^(L|LV|LEAVE|CL|SL|EL|PL|ML|OD)\b/.test(word)) st = "L";
  else if (/^(WO|W ?\/ ?O|W|OFF|WEEKOFF|WEEK OFF|HO|HOL|HOLIDAY|PH|H)\b/.test(word)) st = "WO";
  if (!st && t.length) st = "P";
  if (!st) return null;
  return { st, in: st === "P" || st === "H" ? t[0] || "" : "", out: (st === "P" || st === "H") && t.length > 1 ? t[t.length - 1] : "" };
};

// File ke text mein mahina-saal dhoondho ("October 2026", "01/10/2026 To 31/10/2026")
export const findMonth = (aoa) => {
  for (const row of aoa.slice(0, 15)) {
    for (const c of row) {
      const s = txt(c);
      let m = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s\-,'/]*(?:\d{1,2}(?:st|nd|rd|th)?[\s\-,'/]+)?(20\d\d)/i.exec(s);
      if (m) return { y: +m[2], m: MONTHS.indexOf(m[1].toLowerCase()) + 1 };
      const d = parseDate(s);
      if (d && /to|from|period|date/i.test(s + " " + row.map(txt).join(" "))) return { y: +d.slice(0, 4), m: +d.slice(5, 7) };
    }
  }
  return null;
};

const NAME_HEAD = /^(emp(loyee)?\.?\s*)?name$|^name$|^staff$|^employee$/i;
const CODE_HEAD = /^(emp(loyee)?\.?\s*)?(code|id|no\.?|number)$|^e\.?\s*code$|^user\s*id$|^ac[-\s]?no\.?$/i;
const isDayNum = (c) => {
  const s = txt(c).replace(/\s+[A-Za-z]{1,3}$/, ""); // "1 Wed" / "1 W" → "1"
  return /^\d{1,2}$/.test(s) && +s >= 1 && +s <= 31 ? +s : null;
};

// 1. Lambi list
const parseLong = (aoa) => {
  for (let h = 0; h < Math.min(20, aoa.length); h++) {
    const head = aoa[h].map((c) => txt(c).toLowerCase());
    const di = head.findIndex((c) => /^(att(endance)?\.?\s*)?date$|^date$|^day$|^punch\s*date$/.test(c));
    const ni = head.findIndex((c) => NAME_HEAD.test(c));
    if (di < 0 || ni < 0) continue;
    const ci = head.findIndex((c) => CODE_HEAD.test(c));
    const si = head.findIndex((c) => /status|attendance|remark|^att\.?$/.test(c) && !/date/.test(c));
    const ii = head.findIndex((c) => /^in(\s*time)?$|first\s*(in|punch)|check\s*in|punch\s*in|^in\s*punch/.test(c));
    const oi = head.findIndex((c) => /^out(\s*time)?$|last\s*(out|punch)|check\s*out|punch\s*out|^out\s*punch/.test(c));
    const out = [];
    aoa.slice(h + 1).forEach((r) => {
      const date = parseDate(r[di]);
      const name = txt(r[ni]);
      if (!date || !name) return;
      const fromStatus = si >= 0 ? parseCell(r[si]) : null;
      const tin = ii >= 0 ? (r[ii] instanceof Date ? parseCell(r[ii])?.in : times(txt(r[ii]))[0]) || "" : "";
      const tout = oi >= 0 ? (r[oi] instanceof Date ? parseCell(r[oi])?.in : times(txt(r[oi])).slice(-1)[0]) || "" : "";
      let st = fromStatus?.st || (tin || tout ? "P" : null);
      if (!st) return;
      out.push({ name, code: ci >= 0 ? txt(r[ci]) : "", date, st, in: tin || fromStatus?.in || "", out: tout || fromStatus?.out || "" });
    });
    if (out.length) return out;
  }
  return null;
};

// Upar wali line jismein 1..31 (ya tareekhein) hon → { row, cols: [[colIndex, day|iso]] }
const findDayHeader = (aoa, start = 0) => {
  for (let h = start; h < aoa.length; h++) {
    const cols = [];
    aoa[h].forEach((c, i) => {
      const dn = isDayNum(c);
      const d = dn ? null : c instanceof Date || /\d/.test(txt(c)) ? parseDate(c) : null;
      if (dn) cols.push([i, dn]);
      else if (d) cols.push([i, d]);
    });
    if (cols.length >= 7) return { row: h, cols };
  }
  return null;
};
const dateOf = (key, ym) => (typeof key === "string" ? key : ym ? iso(ym.y, ym.m, key) : null);

// 3. Block format (har staff ka alag block)
const parseBlocks = (aoa, ym) => {
  const out = [];
  let hdr = null;
  let who = null;
  for (let i = 0; i < aoa.length; i++) {
    const r = aoa[i];
    const line = r.map(txt).filter(Boolean).join("  ");
    const h = findDayHeader([r]);
    if (h) {
      hdr = { cols: h.cols };
      continue;
    }
    const nm = /(?:emp(?:loyee)?\.?\s*)?name\s*[:\-]?\s*([A-Za-z][A-Za-z .']{1,40}?)(?=\s{2,}|\s*(?:emp|code|dept|department|id)\b|$)/i.exec(line);
    const cd = /(?:emp(?:loyee)?\.?\s*)?(?:code|id)\s*[:\-]?\s*([A-Za-z0-9]+)/i.exec(line);
    const first = txt(r.find((c) => txt(c)) || "").toLowerCase();
    if (nm && !/^(status|in|out)/.test(first)) {
      who = { name: nm[1].trim(), code: cd ? cd[1] : "" };
      continue;
    }
    if (!hdr || !who) continue;
    const kind = /^status$|^att(endance)?$/.test(first) ? "st" : /^in(\s*time)?$|^first/.test(first) ? "in" : /^out(\s*time)?$|^last/.test(first) ? "out" : null;
    if (!kind) continue;
    hdr.cols.forEach(([ci, key]) => {
      const date = dateOf(key, ym);
      if (!date) return;
      let rec = out.find((x) => x.name === who.name && x.date === date);
      if (kind === "st") {
        const p = parseCell(r[ci]);
        if (!p) return;
        if (!rec) out.push((rec = { ...who, date, st: p.st, in: p.in, out: p.out }));
        else rec.st = p.st;
      } else {
        const t = r[ci] instanceof Date ? parseCell(r[ci])?.in : times(txt(r[ci]))[kind === "in" ? 0 : times(txt(r[ci])).length - 1];
        if (!t) return;
        if (!rec) out.push((rec = { ...who, date, st: "P", in: "", out: "" }));
        rec[kind] = t;
      }
    });
  }
  return out.length ? out : null;
};

// 2. Grid (har line ek staff)
const parseGrid = (aoa, ym) => {
  const h = findDayHeader(aoa);
  if (!h) return null;
  const head = aoa[h.row].map((c) => txt(c));
  const firstDay = Math.min(...h.cols.map(([i]) => i));
  let ni = head.findIndex((c, i) => i < firstDay && NAME_HEAD.test(c));
  const ci = head.findIndex((c, i) => i < firstDay && CODE_HEAD.test(c));
  if (ni < 0) {
    // naam wala column: din se pehle ka pehla column jismein zyadatar akshar hon
    for (let i = 0; i < firstDay; i++) {
      const vals = aoa.slice(h.row + 1, h.row + 15).map((r) => txt(r[i]));
      if (vals.filter((v) => /[A-Za-z]{2,}/.test(v)).length >= Math.max(1, vals.filter(Boolean).length / 2) && i !== ci) {
        ni = i;
        break;
      }
    }
  }
  if (ni < 0) return null;
  const out = [];
  aoa.slice(h.row + 1).forEach((r) => {
    const name = txt(r[ni]);
    if (!name || /^(total|status|in|out)/i.test(name)) return;
    const recs = [];
    h.cols.forEach(([i, key]) => {
      const date = dateOf(key, ym);
      const p = date ? parseCell(r[i]) : null;
      if (p) recs.push({ name, code: ci >= 0 ? txt(r[ci]) : "", date, ...p });
    });
    if (recs.length >= 3) out.push(...recs);
  });
  return out.length ? out : null;
};

// Poori sheet (array of rows) → records + kaunsa format mila
export const parseAttendance = (aoa, ymOverride) => {
  const rows = (aoa || []).map((r) => (Array.isArray(r) ? r : []));
  const ym = ymOverride || findMonth(rows);
  const long = parseLong(rows);
  if (long) return { kind: "list", ym, records: long, needsMonth: false };
  const hdr = findDayHeader(rows);
  const needsMonth = !!hdr && hdr.cols.some(([, k]) => typeof k === "number") && !ym;
  const blocks = parseBlocks(rows, ym);
  if (blocks) return { kind: "blocks", ym, records: blocks, needsMonth };
  const grid = parseGrid(rows, ym);
  if (grid) return { kind: "grid", ym, records: grid, needsMonth };
  return { kind: null, ym, records: [], needsMonth };
};

// Machine ke naam ko app ke staff se milao (0..100)
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z\s]/g, " ").replace(/\s+/g, " ").trim();
export const matchScore = (a, b) => {
  const x = norm(a);
  const y = norm(b);
  if (!x || !y) return 0;
  if (x === y) return 100;
  if (x.replace(/\s/g, "") === y.replace(/\s/g, "")) return 98;
  if (y.startsWith(x + " ") || x.startsWith(y + " ")) return 90;
  const xw = x.split(" ");
  const yw = y.split(" ");
  if (xw[0].length >= 3 && xw[0] === yw[0]) return 75;
  const common = xw.filter((w) => w.length >= 3 && yw.includes(w)).length;
  return common ? 60 + common * 5 : 0;
};
export const bestStaff = (machineName, staff) => {
  let best = null;
  staff.forEach((s) => {
    const sc = matchScore(machineName, s.name);
    if (sc > (best?.sc || 0)) best = { id: s._id, sc };
  });
  if (!best || best.sc < 75) return null;
  // do log barabar mile to khud mat chuno
  const ties = staff.filter((s) => matchScore(machineName, s.name) === best.sc).length;
  return ties > 1 ? null : best.id;
};
