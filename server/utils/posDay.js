// The POS (hotel PC) part of one restaurant day, as sent by /api/v1/hotel-sense-sync. Read only.
//   room_bills - POS bills sent to a Guest House room ("Pay at guest house"): roomcharges with source "pos"
//                (one already paid at the restaurant the same day is in the counter cash instead)
//   pay_later  - POS bills made that day and left "Pay later" (sale on credit)
//   today_paid - what the POS says the counter took for that day's own bills (owner check)
//   old_paid   - POS bills of an EARLIER day paid that day (old dues, NOT that day's sale)
//   banquet_cash - banquet money the cashier took at the POS counter (shown only, not added to any banquet booking)
import mongoose from "mongoose";
import RoomCharge from "../model/roomCharge.js";

export const EXTRAS = "pos_day_extras"; // _id = DD-MM-YYYY
export const BACKUPS = "hotel_sense_sync_backups";

const n = (v) => Math.round(Number(v) || 0);
const db = () => mongoose.connection.db;

export const posRoomBillRows = async (date) => {
  const list = await RoomCharge.find({ source: "pos", date }).sort({ roomNo: 1 }).lean();
  return list
    .filter((c) => !(c.isPaid && c.paidAt === "rest" && c.paidDate === date))
    .map((c) => ({ _id: c._id, roomNo: c.roomNo, guestName: c.guestName, amount: n(c.amount), label: c.label, isPaid: !!c.isPaid, billNo: c.posBillNo || "" }));
};

export const posExtras = async (date) => (await db().collection(EXTRAS).findOne({ _id: date })) || null;

// Everything the restaurant day screen needs. null when the POS never sent this day.
export const posDayFor = async (date) => {
  const [rooms, x] = await Promise.all([posRoomBillRows(date), posExtras(date)]);
  if (!x && !rooms.length) return null;
  const pl = x?.pay_later || {};
  const op = x?.old_paid || {};
  return {
    synced: !!x,
    receivedAt: x?.receivedAt || null,
    room_bills: { count: rooms.length, amount: rooms.reduce((s, r) => s + r.amount, 0), rows: rooms },
    pay_later: { count: n(pl.count), amount: n(pl.amount), rows: Array.isArray(pl.rows) ? pl.rows : [] },
    today_paid: x?.today_paid || null,
    old_paid: { count: n(op.count), cash: n(op.cash), upi: n(op.upi), card: n(op.card), total: n(op.total), rows: Array.isArray(op.rows) ? op.rows : [] },
    banquet_cash: Array.isArray(x?.banquet_cash) ? x.banquet_cash : [],
  };
};

// Snapshot saved on the restaurant day entry when it is submitted / updated
export const posTotalsFor = async (date) => {
  const p = await posDayFor(date);
  return { posRoomBills: p ? p.room_bills.amount : 0, posPayLater: p ? p.pay_later.amount : 0 };
};

// POS "Pay later" bills and old POS bills paid, for the receivables report (all days, or up to a day)
export const posExtrasList = async () => db().collection(EXTRAS).find({}, { projection: { pay_later: 1, old_paid: 1 } }).toArray();
