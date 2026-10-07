// Booking advance ka sahi din aur sahi mode (sirf reports ke liye, kuch save nahi karta).
//   + Advance jis din mila, us din / us mode mein paisa aaya
//   − Check-in ke din room ki GH row poore kiraye ke saath "paid" likhi jaati hai, jabki us din sirf baaki paisa aaya
//     → jahan room ka paisa gina gaya (room row ka mode / baad ki jama / Office wasooli), wahan se advance ghatao
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Entry from "../model/entry.js";
import Booking from "../model/booking.js";
import GhDueReceipt from "../model/ghDueReceipt.js";

dayjs.extend(customParseFormat);
const F = "DD-MM-YYYY";
const n = (v) => Number(v) || 0;
const ym = (d) => dayjs(d, F, true).format("YYYY-MM");

// → [{ ym, mode, amount }]  (amount + = aaya, − = ghatao)
export const bookingAdvanceMoves = async () => {
  const bookings = await Booking.find({ "advances.0": { $exists: true } }, { advances: 1, status: 1, checkedIn: 1 }).lean();
  const out = [];
  for (const b of bookings) {
    let adv = 0;
    (b.advances || []).forEach((a) => {
      if (!(n(a.amount) > 0) || !a.date) return;
      adv += n(a.amount);
      out.push({ ym: ym(a.date), mode: a.mode || "Cash", amount: n(a.amount) });
    });
    const ci = b.checkedIn || {};
    if (b.status !== "checkedin" || !ci.date || !ci.roomNo || !(adv > 0)) continue;
    const doc = await Entry.findOne({ date: ci.date }, { entry: 1 }).lean();
    const row = (doc?.entry || []).find((e) => Number(e.roomNo) === Number(ci.roomNo) && (!ci.period || e.period === ci.period) && e.period !== "UnPaid");
    if (!row) continue;
    const take = Math.min(adv, n(row.rate));
    if (!(take > 0)) continue;
    if (row.modeOfPayment && row.modeOfPayment !== "UnPaid") {
      out.push({ ym: ym(ci.date), mode: row.modeOfPayment, amount: -take });
      continue;
    }
    // Room UnPaid tha → jahan baad mein wasool hua wahan se ghatao
    const off = await GhDueReceipt.findOne({ srcId: String(row._id), cancelled: { $ne: true } }).lean();
    if (off) {
      out.push({ ym: ym(off.date), mode: off.mode, amount: -take });
      continue;
    }
    const jamaDoc = await Entry.findOne(
      { entry: { $elemMatch: { period: "UnPaid", createDate: row.createDate, roomNo: Number(row.roomNo), mobileNumber: Number(row.mobileNumber) || 0 } } },
      { date: 1, "entry.$": 1 }
    ).lean();
    const j = jamaDoc?.entry?.[0];
    if (j && j.modeOfPayment && j.modeOfPayment !== "UnPaid") out.push({ ym: ym(jamaDoc.date), mode: j.modeOfPayment, amount: -take });
  }
  return out;
};
