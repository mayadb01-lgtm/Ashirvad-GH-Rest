// Naya staff / vendor / levana-baaki wala: sirf Manager (Manager ka access) ya malik
import { effectiveAccess, rasoiAllowed, isAdminLike } from "../middleware/staffAccess.js";

export const isManagerOrOwner = async (user) => {
  if (!user) return false;
  if (isAdminLike(user)) return user.viewOnly !== true;
  const acc = await effectiveAccess(user).catch(() => null);
  return rasoiAllowed(user, acc);
};

export const who = (req) => req.user?.name || req.user?.email || "";
export const cleanName = (v, max = 60) => String(v ?? "").replace(/[<>\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
export const cleanMobile = (v) => String(v ?? "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
export const nameKey = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, "");
export const lev = (a, b) => {
  if (a === b) return 0;
  let p = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const c = [i];
    for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[b.length];
};
// list: [{ _id, fullname, mobileNumber }] → milte-julte (same mobile ya naam)
export const findSimilar = (list, name, mobile) => {
  const k = nameKey(name);
  return list
    .map((x) => {
      const e = nameKey(x.fullname);
      const sameMobile = mobile && String(x.mobileNumber || "") === mobile;
      const d = e && k ? lev(k, e) : 99;
      const close = sameMobile || (k && e && (e === k || (k.length >= 4 && (e.includes(k) || k.includes(e))) || d <= (k.length > 8 ? 2 : 1)));
      return close ? { _id: String(x._id), fullname: x.fullname, mobileNumber: x.mobileNumber || 0, category: x.category || "", exact: e === k || sameMobile, sameMobile: !!sameMobile } : null;
    })
    .filter(Boolean)
    .slice(0, 5);
};
