// Checkout se pehle: guest ka poora hisaab saaf hai ya nahi.
// Room rent (UnPaid aur abhi tak jama nahi) + food/extra charges (paid nahi) − booking advance.
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { API, num } from "./shared";

dayjs.extend(customParseFormat);
const F = "DD-MM-YYYY";

/**
 * @param roomNo
 * @param from      stay ka pehla din (DD-MM-YYYY)
 * @param to        checkout ka din (DD-MM-YYYY)
 * @param unpaid    /entry/get-unpaid-entries ki list (server pe UnPaid rows)
 * @param todayRows aaj ke draft rows is room ke (draft hi sahi maana jaata hai) — optional
 * @param jamaKeys  draft mein jama ho chuke unpaid rows ki keys — optional
 */
export const computeDues = async ({ roomNo, from, to, unpaid = [], todayRows = null, jamaKeys = new Set() }) => {
  const s = dayjs(from, F, true);
  const e = dayjs(to, F, true);
  const inRange = (d) => {
    const x = dayjs(d, F, true);
    return x.isValid() && !x.isBefore(s, "day") && !x.isAfter(e, "day");
  };
  const lines = [];
  let rent = 0;
  unpaid
    .filter((u) => Number(u.roomNo) === Number(roomNo) && inRange(u.createDate || u.date))
    .filter((u) => !(todayRows && (u.createDate || u.date) === to)) // aaj ka draft hi maana jaayega
    .filter((u) => !jamaKeys.has(`${u.createDate}|${u.roomNo}|${u.mobileNumber}`))
    .forEach((u) => {
      const amt = Math.max(0, num(u.rate) - num(u.discount));
      rent += amt;
      lines.push(`Room rent ${u.createDate}: ₹${Math.round(amt)}`);
    });
  // Aaj ka discount poore bill se ghatta hai (owner food/extra bhi discount se maaf kar sakta hai)
  let discount = 0;
  (todayRows || []).forEach((r) => {
    discount += num(r.discount);
    if (r.modeOfPayment && r.modeOfPayment !== "UnPaid") return;
    const amt = num(r.rate);
    if (!amt) return;
    rent += amt;
    lines.push(`Room rent ${to}${r.modeOfPayment ? "" : " (payment not selected)"}: ₹${Math.round(amt)}`);
  });
  let charges = 0;
  let advance = 0;
  try {
    const { data } = await axios.get(`${API}/stay/dues/${roomNo}/${from}/${to}`);
    (data.data?.charges || []).forEach((c) => {
      charges += num(c.amount);
      lines.push(`${c.label} (${c.date}): ₹${Math.round(num(c.amount))}`);
    });
    advance = num(data.data?.advance);
  } catch {
    /* charges check server pe bhi hota hai */
  }
  const due = Math.max(0, rent + charges - advance - discount);
  if (advance > 0) lines.push(`Booking advance: −₹${Math.round(advance)}`);
  if (discount > 0) lines.push(`Discount: −₹${Math.round(discount)}`);
  return { rent, charges, advance, due, lines };
};
