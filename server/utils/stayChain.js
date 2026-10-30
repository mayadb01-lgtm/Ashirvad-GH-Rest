// 🔁 Room shift ke baad "bill guest ke saath chale": naye room ke stay se pichhe ke rooms tak (shiftedFrom.stayId) ki kadi.
// Sirf PADHTA hai (Stay, RoomCharge).
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Stay from "../model/stay.js";
import RoomCharge from "../model/roomCharge.js";

dayjs.extend(customParseFormat);
const F = "DD-MM-YYYY";
const D = (s) => dayjs(s, F, true);

// Pichhle rooms ke hisse: [{ stayId, roomNo, from, to }] — to = shift se ek din pehle (shift wale din ka bill shift ke saath aage gaya)
export const previousSegments = async (stay, maxHops = 5) => {
  const out = [];
  let cur = stay;
  const seen = new Set([String(stay?._id || "")]);
  for (let i = 0; i < maxHops; i++) {
    const pid = cur?.shiftedFrom?.stayId;
    if (!pid || !/^[a-f0-9]{24}$/.test(String(pid)) || seen.has(String(pid))) break;
    seen.add(String(pid));
    const prev = await Stay.findById(pid).lean();
    if (!prev) break;
    const end = prev.checkoutDate && D(prev.checkoutDate).isValid() ? D(prev.checkoutDate).subtract(1, "day") : D(cur.startDate).subtract(1, "day");
    if (!end.isBefore(D(prev.startDate), "day")) out.push({ stayId: String(prev._id), roomNo: prev.roomNo, from: prev.startDate, to: end.format(F) });
    cur = prev;
  }
  return out;
};

const datesOf = (from, to) => {
  const list = [];
  for (let x = D(from); x.isValid() && !x.isAfter(D(to), "day") && list.length < 120; x = x.add(1, "day")) list.push(x.format(F));
  return list;
};

// Pichhle rooms ke baaki (aur chahein to aaj wasool hue) food / extra bill
export const chainCharges = async (stay, { paidOn = "" } = {}) => {
  const segs = await previousSegments(stay);
  const rows = [];
  for (const s of segs) {
    const q = { roomNo: s.roomNo, date: { $in: datesOf(s.from, s.to) } };
    const list = await RoomCharge.find(paidOn ? { ...q, $or: [{ isPaid: false }, { paidDate: paidOn }] } : { ...q, isPaid: false }).lean();
    list.forEach((c) => rows.push({ ...c, fromRoom: s.roomNo }));
  }
  return { segs, rows };
};
