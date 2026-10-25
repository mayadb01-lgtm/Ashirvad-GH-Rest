// Ek bill do mode mein (jaise Cash 700 + PPS 800). Mode ke hisaab se jodte waqt hamesha isi se jodo.
export const payParts = (e, amtKey = "rate", modeKey = "modeOfPayment", splitKey = "split") => {
  const s = e?.[splitKey];
  if (Array.isArray(s) && s.length) return s.map((p) => ({ mode: p.mode, amount: Number(p.amount) || 0 }));
  return [{ mode: e?.[modeKey], amount: Number(e?.[amtKey]) || 0 }];
};
export const splitLabel = (s) => (Array.isArray(s) && s.length ? s.map((p) => p.mode).join(" + ") : "");
// Aakhri line apne aap = bill − baaki (staff ko jod nahi karna padta)
export const fillSplit = (rows, total) => {
  if (!rows?.length) return [];
  const t = Number(total) || 0;
  const head = rows.slice(0, -1).map((r) => ({ mode: r.mode, amount: Number(r.amount) || 0 }));
  const used = head.reduce((a, r) => a + r.amount, 0);
  return [...head, { mode: rows[rows.length - 1].mode, amount: Math.max(0, Math.round((t - used) * 100) / 100) }];
};
// Galti: null = theek, warna sandesh
export const splitProblem = (rows, total) => {
  const r = (rows || []).filter((x) => Number(x.amount) > 0);
  if (r.length < 2) return "Split needs 2 modes with an amount each";
  if (new Set(r.map((x) => x.mode)).size !== r.length) return "Same mode twice — choose different modes";
  const sum = r.reduce((a, x) => a + Number(x.amount), 0);
  if (Math.abs(sum - (Number(total) || 0)) > 0.5) return `Split total ₹${sum} must equal ₹${Number(total) || 0}`;
  return null;
};
// Sabse badi rakam wala mode (purani reports ke liye modeOfPayment)
export const mainMode = (rows) => (rows || []).reduce((a, b) => (Number(b.amount) > Number(a?.amount || -1) ? b : a), null)?.mode || "";
// Room ka food / extra bill (roomcharges): paidSplit
export const chargeParts = (c) => payParts(c, "amount", "paidMode", "paidSplit");
export const chargeModeText = (c, label = (m) => m) =>
  Array.isArray(c?.paidSplit) && c.paidSplit.length ? c.paidSplit.map((p) => `${label(p.mode)} ₹${Math.round(p.amount).toLocaleString("en-IN")}`).join(" + ") : label(c?.paidMode || "");
