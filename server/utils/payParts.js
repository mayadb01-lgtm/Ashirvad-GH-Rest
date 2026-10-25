// Ek bill ka paisa do (ya zyada) mode mein: jaise ₹1500 = Cash 700 + PPS 800.
// Row par `split: [{ mode, amount }]` rehta hai; `modeOfPayment` = sabse badi rakam wala mode (purani reports ke liye).
// Har jagah jahan mode ke hisaab se jod hota hai, payParts() se jodo — split ho to hisse, warna poori rakam ek mode mein.
export const PAY_MODES = ["Cash", "Card", "PPS", "PPC"];

export const payParts = (e, amtKey = "rate", modeKey = "modeOfPayment", splitKey = "split") => {
  const s = e?.[splitKey];
  if (Array.isArray(s) && s.length) return s.map((p) => ({ mode: p.mode, amount: Number(p.amount) || 0 }));
  return [{ mode: e?.[modeKey], amount: Number(e?.[amtKey]) || 0 }];
};

// Saaf karo + jaancho. Return { split, mode } ya { error }
export function normSplit(split, total, modes = PAY_MODES) {
  if (!Array.isArray(split) || !split.length) return { split: [] };
  const by = {};
  for (const p of split) {
    const amount = Math.round((Number(p?.amount) || 0) * 100) / 100;
    if (amount <= 0) continue;
    const mode = String(p?.mode || "");
    if (!modes.includes(mode)) return { error: `Split payment: "${mode || "?"}" is not a payment mode` };
    by[mode] = (by[mode] || 0) + amount;
  }
  const parts = Object.entries(by).map(([mode, amount]) => ({ mode, amount }));
  if (parts.length < 2) return parts.length ? { split: [], mode: parts[0].mode } : { split: [] };
  const sum = parts.reduce((t, p) => t + p.amount, 0);
  if (Math.abs(sum - (Number(total) || 0)) > 0.5) return { error: `Split payment total ₹${sum} is not equal to the bill ₹${Number(total) || 0}` };
  const main = parts.reduce((a, b) => (b.amount > a.amount ? b : a)).mode;
  return { split: parts, mode: main };
}

// GH day rows: split saaf karo; purana split (classic page se save) bachao jab rakam/mode na badla ho
export function fixEntrySplits(rows, oldRows = []) {
  const old = new Map();
  for (const o of oldRows || []) {
    const x = o?.toObject ? o.toObject() : o;
    if (Array.isArray(x?.split) && x.split.length) {
      if (x._id) old.set(`id:${x._id}`, x);
      old.set(`k:${x.id}|${x.roomNo}|${x.period}`, x);
    }
  }
  for (const r of rows) {
    if (Array.isArray(r.split) && r.split.length) {
      if (r.modeOfPayment === "UnPaid") return `Room ${r.roomNo}: an unpaid room cannot have a split payment`;
      const n = normSplit(r.split, r.rate);
      if (n.error) return `Room ${r.roomNo}: ${n.error}`;
      r.split = n.split;
      if (n.mode) r.modeOfPayment = n.mode;
    } else if (r.split === undefined) {
      const o = (r._id && old.get(`id:${r._id}`)) || old.get(`k:${r.id}|${r.roomNo}|${r.period}`);
      if (o && Number(o.rate) === Number(r.rate) && o.modeOfPayment === r.modeOfPayment) r.split = o.split;
    } else r.split = [];
  }
  return null;
}
