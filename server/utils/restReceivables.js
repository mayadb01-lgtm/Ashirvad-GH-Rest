// Restaurant receivables: kiska kitna baaki (read-only hisaab).
//   Diya  = Restaurant "Receivables" (udhaar) rows
//   Aaya  = (1) Office In ki "Old dues received" (Pending) lines jinka naam usi aadmi ka hai
//           (2) Restaurant screen se "Collect old dues" (naya collection restduereceipts)
// Yeh wasooli revenue / sale mein nahi ginti (sale udhaar dene wale din gin chuki) — do baar nahi ginta.
// "Room bill" wale udhaar guest ke room bill ke saath wasool hote hain, isliye alag.
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import RestPending from "../model/restPending.js";
import RestDueReceipt from "../model/restDueReceipt.js";
import RoomCharge from "../model/roomCharge.js";
import RestDueAdjust from "../model/restDueAdjust.js";
import { loadOfficeClassifier, lineName, nk } from "./officeTypes.js";

dayjs.extend(customParseFormat);
const F = "DD-MM-YYYY";
const n = (v) => Number(v) || 0;
const round = (v) => Math.round(v);
const sum = (arr, f) => arr.reduce((s, x) => s + n(f(x)), 0);
const IST_MS = 330 * 60 * 1000;
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10));
const dv = (s) => String(s || "").split("-").reverse().join("");
export const isRoomBill = (k) => /room\s*bill/.test(nk(k));

export const computeRestReceivables = async ({ upto } = {}) => {
  const q = upto ? { entryCreateDate: { $lte: upto.endOf("day").toDate() } } : {};
  const [rest, office, people, receipts, classify, food, adjusts] = await Promise.all([
    RestEntry.find(q, { pending: 1, createDate: 1, entryCreateDate: 1 }).lean(),
    OfficeBook.find(q, { officeIn: 1, createDate: 1, entryCreateDate: 1 }).lean(),
    RestPending.find({}, { fullname: 1, mobileNumber: 1, category: 1 }).lean(),
    RestDueReceipt.find({ ...q, cancelled: { $ne: true }, source: { $ne: "gh" } }).lean(),
    loadOfficeClassifier(),
    RoomCharge.find({ ...q, kind: "food", source: "rest" }, { date: 1, roomNo: 1, guestName: 1, amount: 1, isPaid: 1, paidDate: 1, paidMode: 1 }).lean(),
    RestDueAdjust.find({ cancelled: { $ne: true } }).lean(),
  ]);
  const map = new Map();
  const get = (name) => {
    const k = nk(name) || "(no name)";
    if (!map.has(k)) map.set(k, { key: k, name: String(name || "").trim() || "(no name)", mobile: "", given: 0, received: 0, ledger: [] });
    return map.get(k);
  };
  let roomBills = 0;
  rest.forEach((d) =>
    (d.pending || []).forEach((x) => {
      if (!(n(x.amount) > 0)) return;
      if (isRoomBill(x.fullname)) return (roomBills += n(x.amount));
      const r = get(x.fullname);
      r.given += n(x.amount);
      if (!r.mobile && x.mobileNumber > 999999) r.mobile = x.mobileNumber;
      r.ledger.push({ date: x.createDate || d.createDate, kind: "given", amount: n(x.amount), note: "Restaurant credit" });
    })
  );
  people.forEach((p) => {
    const r = map.get(nk(p.fullname));
    if (r && p.mobileNumber > 999999) r.mobile = p.mobileNumber;
  });
  // Owner ka sudhaar: purana baaki (opening) / maafi (writeoff) — paisa nahi, sirf baaki
  adjusts
    .filter((a) => !upto || dv(a.date) <= upto.format("YYYYMMDD"))
    .forEach((a) => {
      const r = get(a.name);
      const amt = n(a.amount);
      if (a.kind === "opening") {
        r.given += amt;
        r.ledger.push({ date: a.date, kind: "given", amount: amt, note: `Opening balance (before app)${a.note ? ` · ${a.note}` : ""}`, adjustId: String(a._id) });
      } else {
        r.received += amt;
        r.ledger.push({ date: a.date, kind: "received", amount: amt, note: `Write-off / settled outside${a.note ? ` · ${a.note}` : ""}`, adjustId: String(a._id) });
      }
    });
  // Restaurant screen se wasooli
  receipts.forEach((x) => {
    const r = get(x.name);
    r.received += n(x.amount);
    r.ledger.push({ date: x.date, kind: "received", amount: n(x.amount), note: `${x.at === "office" ? "Office" : "Restaurant"} · ${x.mode === "PP" ? "PP (UPI)" : x.mode}${x.note ? ` · ${x.note}` : ""}` });
  });
  const otherRecv = new Map(); // office mein wasooli, par restaurant udhaar nahi (GH pending, staff upad jama…)
  office.forEach((d) =>
    (d.officeIn || []).forEach((x) => {
      if (!(n(x.amount) > 0)) return;
      if (classify("in", x.categoryName, lineName(x)) !== "recovery") return;
      // Pending wala naam aam ("Restaurant Pending", "Restaurant bill") ho to detail (fullname) mein asli aadmi dhundho, warna Pending wala naam.
      // GH ke udhaar (GH pending…) restaurant ke nahi, isliye alag.
      const k1 = nk(x.expenseName);
      const k2 = nk(x.fullname);
      const isGh = (k) => /^gh\b|guest\s*house/.test(k);
      const generic = (k) => /pending|bill|restaurant|canteen/.test(k);
      const pick = (k) => (k && !isGh(k) && map.get(k)) || null;
      const r = generic(k1) ? pick(k2) || pick(k1) : pick(k1) || pick(k2);
      const row = { date: x.createDate || d.createDate, kind: "received", amount: n(x.amount), note: `Office · ${x.modeOfPayment || ""}${x.fullname && nk(x.fullname) !== k1 ? ` · ${String(x.fullname).trim()}` : ""}` };
      if (r) {
        r.received += n(x.amount);
        r.ledger.push(row);
      } else {
        const name = String(x.expenseName || x.fullname || "(no name)").trim();
        const o = otherRecv.get(nk(name)) || { name, amount: 0, count: 0, last: "" };
        o.amount += n(x.amount);
        o.count += 1;
        o.last = row.date;
        otherRecv.set(nk(name), o);
      }
    })
  );
  const today = todayIst();
  const rows = [...map.values()].map((r) => {
    r.ledger.sort((a, b) => dv(a.date).localeCompare(dv(b.date)));
    let bal = 0;
    r.ledger.forEach((l) => (l.balance = round((bal += l.kind === "given" ? l.amount : -l.amount))));
    const lastGiven = [...r.ledger].reverse().find((l) => l.kind === "given")?.date || "";
    const lastRecv = [...r.ledger].reverse().find((l) => l.kind === "received")?.date || "";
    const balance = round(r.given - r.received);
    return {
      ...r,
      given: round(r.given),
      received: round(r.received),
      balance,
      lastGiven,
      lastReceived: lastRecv,
      days: balance > 0 && lastGiven ? today.diff(dayjs(lastGiven, F), "day") : 0,
    };
  });
  rows.sort((a, b) => b.balance - a.balance);
  const due = rows.filter((r) => r.balance > 0);
  return {
    rows,
    totals: { given: round(sum(rows, (r) => r.given)), received: round(sum(rows, (r) => r.received)), due: round(sum(due, (r) => r.balance)), people: due.length },
    roomBills: round(roomBills),
    // Room bill: GH counter par guest se wasool hota hai (RoomCharges)
    room: (() => {
      const paid = food.filter((c) => c.isPaid);
      const open = food.filter((c) => !c.isPaid).sort((a, b) => dv(a.date).localeCompare(dv(b.date)));
      const collected = round(sum(paid, (c) => c.amount));
      const due = round(sum(open, (c) => c.amount));
      return { given: round(roomBills), collected, due, notLinked: Math.max(0, round(roomBills - collected - due)), dueList: open.map((c) => ({ date: c.date, roomNo: c.roomNo, guestName: c.guestName, amount: round(c.amount) })) };
    })(),
    otherReceived: [...otherRecv.values()].map((o) => ({ ...o, amount: round(o.amount) })).sort((a, b) => b.amount - a.amount),
  };
};
