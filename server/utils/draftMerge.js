// 🔄 Do device ke adhoore draft ko jodna (server aur app dono yahi niyam). Bhara hua (payment chuna) room kabhi nahi mitta.
const filled = (r) => !!(r && (r.modeOfPayment || (Array.isArray(r.split) && r.split.length)));
const touched = (r) => !!(r && (filled(r) || String(r.fullname || "").trim() || Number(r.rate) > 0));
const uniq = (a = [], b = []) => [...new Set([...(a || []), ...(b || [])].map(String))];
// a = purana / doosra, b = naya. bNewer: b ka time naya hai
export const mergeDraft = (a, b, bNewer = true) => {
  if (!a) return b;
  if (!b) return a;
  const out = { ...(bNewer ? a : b), ...(bNewer ? b : a) };
  const dismissed = uniq(a._dismissed, b._dismissed);
  const ra = a.rooms || {};
  const rb = b.rooms || {};
  const rooms = {};
  new Set([...Object.keys(ra), ...Object.keys(rb)]).forEach((k) => {
    const x = ra[k];
    const y = rb[k];
    let pick;
    if (filled(x) && filled(y)) pick = bNewer ? y : x;
    else if (filled(x) || filled(y)) pick = filled(x) ? x : y;
    else if (touched(x) && touched(y)) pick = bNewer ? y : x;
    else pick = touched(x) ? x : touched(y) ? y : bNewer ? y ?? x : x ?? y;
    if (pick && pick._stayId && dismissed.includes(String(pick._stayId))) return;
    if (pick) rooms[k] = pick;
  });
  const jama = [];
  const seen = new Set();
  [...(bNewer ? b.jama || [] : a.jama || []), ...(bNewer ? a.jama || [] : b.jama || [])].forEach((j) => {
    const id = String(j?.srcId || j?.id || JSON.stringify(j));
    if (seen.has(id)) return;
    seen.add(id);
    jama.push(j);
  });
  out.rooms = rooms;
  out.jama = jama;
  out._dismissed = dismissed;
  if (a._dupOk || b._dupOk) out._dupOk = uniq(a._dupOk, b._dupOk);
  return out;
};
