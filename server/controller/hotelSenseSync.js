// Hotel PC (hotel-sense POS) → Rad Shiva: the POS side of each restaurant day.
// POST /api/v1/hotel-sense-sync   (no login; same sync key as /pos-sync, header "x-sync-key" or body.key)
//
// Safety rules (old Rad Shiva data must never be damaged):
//   • writes ONLY records that came from the POS: roomcharges with source "pos" (matched by posOrderId) and
//     the pos_day_extras doc of that day. Staff-typed rows (source "rest" / "gh", restentries, ...) are never touched.
//   • a POS room bill that was collected in Rad Shiva (GH / restaurant / office counter) is never changed again.
//   • only days from the start date onward (HOTEL_SENSE_SYNC_FROM=DD-MM-YYYY in .env, otherwise the first day this
//     endpoint received data); no future days.
//   • before anything is changed or removed, a copy goes to "hotel_sense_sync_backups".
// The exact payload is in HOTEL_SENSE_SYNC.md.
import express, { Router } from "express";
import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import RoomCharge from "../model/roomCharge.js";
import { checkSyncKey } from "./posSync.js";
import { occupiedGuests } from "./roomCharges.js";
import { BACKUPS, EXTRAS } from "../utils/posDay.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const IST_MS = 330 * 60 * 1000;
const MAX_DAYS = 62;
const SOLD = ["day", "night", "extraDay", "extraNight"];
const TO_GH_MODE = { CASH: "Cash", CARD: "Card", UPI: "PP" };

const db = () => mongoose.connection.db;
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10));
const day = (s) => dayjs(String(s || ""), F, true);
const amt = (v) => Math.max(0, Math.round(Number(v) || 0));
const clean = (v, max = 120) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const POS_BY = "POS (hotel PC)";

export let lastExtrasSync = null;

// start date: .env, else stored, else today (first time) - so no earlier day is ever written by accident
const startDate = async (keyDoc) => {
  const env = day(process.env.HOTEL_SENSE_SYNC_FROM);
  if (env.isValid()) return env;
  const stored = day(keyDoc?.data?.extrasFrom);
  if (stored.isValid()) return stored;
  const t = todayIst();
  await db().collection("kitchen_docs").updateOne({ _id: "secret/possync" }, { $set: { "data.extrasFrom": t.format(F) } });
  return t;
};

const backup = (kind, key, reason, before) =>
  db().collection(BACKUPS).insertOne({ at: new Date(), kind, key: String(key), reason, before });

const modeRows = (o) => {
  const x = o && typeof o === "object" ? o : {};
  return { cash: amt(x.cash), upi: amt(x.upi), card: amt(x.card), other: amt(x.other) };
};

// ---------- room bills of one day ----------
const syncRoomBills = async (date, list, complete, out) => {
  const rows = (Array.isArray(list) ? list : []).filter((r) => r && clean(r.posOrderId, 40) && Number(r.roomNo) > 0);
  if ((Array.isArray(list) ? list.length : 0) !== rows.length) out.skipped.push(`${date}: ${list.length - rows.length} room bill(s) without posOrderId / roomNo`);
  const guests = rows.length ? (await occupiedGuests(date)).guests : [];
  const seen = new Set();
  for (const r of rows) {
    const posOrderId = clean(r.posOrderId, 40);
    if (seen.has(posOrderId)) continue;
    seen.add(posOrderId);
    const roomNo = Number(r.roomNo);
    const existing = await RoomCharge.findOne({ source: "pos", posOrderId });
    if (existing && existing.date !== date) {
      out.skipped.push(`POS bill ${posOrderId}: already saved for ${existing.date}, not moved to ${date}`);
      continue;
    }
    // collected in Rad Shiva (GH / restaurant / office): staff money record, never changed again
    if (existing?.isPaid && !existing.posPaid) {
      if (amt(r.amount) !== amt(existing.amount)) out.skipped.push(`POS bill ${posOrderId}: already collected in Rad Shiva, POS amount change not applied`);
      out.kept += 1;
      continue;
    }
    const guest = guests.find((g) => g.roomNo === roomNo) || {};
    const set = {
      date,
      entryCreateDate: day(date).startOf("day").toDate(),
      kind: "food",
      source: "pos",
      posOrderId,
      posBillNo: clean(r.billNo, 40),
      posRoom: roomNo,
      amount: amt(r.amount),
      label: clean(r.label, 120) || `Restaurant food bill (POS bill ${clean(r.billNo, 40) || `#${posOrderId}`})`,
    };
    // same room as the POS chose before: keep the room / guest the Guest House may have moved it to (room shift)
    if (!existing || existing.posRoom !== roomNo) {
      Object.assign(set, {
        roomNo,
        period: SOLD.includes(guest.period) ? guest.period : "",
        guestName: clean(guest.guestName || r.guestName, 80),
        mobile: clean(guest.mobile || r.mobile, 15).replace(/\D/g, ""),
      });
    }
    // paid in the POS itself (bill later paid at the restaurant counter)
    const posPaid = r.isPaid === true;
    if (posPaid) {
      Object.assign(set, { isPaid: true, posPaid: true, paidMode: TO_GH_MODE[String(r.paidMode || "").toUpperCase()] || clean(r.paidMode, 10) || "Cash", paidDate: day(r.paidDate).isValid() ? r.paidDate : date, paidAt: "rest", paidBy: POS_BY });
    } else if (existing?.posPaid) {
      Object.assign(set, { isPaid: false, posPaid: false, paidMode: "", paidDate: "", paidAt: "", paidBy: "" });
    }
    if (!existing) {
      await RoomCharge.create({ ...set, isPaid: !!set.isPaid, enteredBy: clean(r.enteredBy, 60) || POS_BY });
      out.created += 1;
      continue;
    }
    const before = existing.toObject();
    const changed = Object.entries(set).some(([k, v]) => String(before[k] instanceof Date ? before[k].getTime() : before[k] ?? "") !== String(v instanceof Date ? v.getTime() : v ?? ""));
    if (!changed) {
      out.same += 1;
      continue;
    }
    await backup("roomcharge", existing._id, "updated", before);
    existing.set({ ...set, updatedBy: POS_BY });
    await existing.save();
    out.updated += 1;
  }
  // the POS no longer sends a bill to a room (cancelled / paid another way): remove ONLY unpaid POS rows of this day
  if (complete) {
    const gone = await RoomCharge.find({ source: "pos", date, posOrderId: { $nin: [...seen] } }).lean();
    for (const c of gone) {
      if (c.isPaid && !c.posPaid) {
        out.skipped.push(`POS bill ${c.posOrderId}: no longer a room bill in the POS, but already collected in Rad Shiva - kept`);
        continue;
      }
      await backup("roomcharge", c._id, "removed", c);
      await RoomCharge.deleteOne({ _id: c._id, source: "pos" });
      out.removed += 1;
    }
  }
};

// ---------- pay later / today paid / old dues / banquet cash of one day ----------
const syncExtras = async (date, d, roomOrderIds, pc, out) => {
  const pl = d.pay_later && typeof d.pay_later === "object" ? d.pay_later : {};
  const op = d.old_paid && typeof d.old_paid === "object" ? d.old_paid : {};
  // POS room bills already saved here (any day) are counted through the room bill, never again as old dues
  const opIds = (Array.isArray(op.rows) ? op.rows : []).map((r) => clean(r?.id, 40)).filter(Boolean);
  if (opIds.length) (await RoomCharge.find({ source: "pos", posOrderId: { $in: opIds } }, { posOrderId: 1 }).lean()).forEach((c) => roomOrderIds.add(c.posOrderId));
  const plRows = (Array.isArray(pl.rows) ? pl.rows : []).slice(0, 500).map((r) => ({ id: clean(r.id, 40), billNo: clean(r.billNo, 40), name: clean(r.name, 80) || "Walk-in", amount: amt(r.amount) }));
  // an old POS room bill paid today is already counted through the room bill itself - never twice
  const opRows = (Array.isArray(op.rows) ? op.rows : [])
    .slice(0, 500)
    .map((r) => ({ id: clean(r.id, 40), billNo: clean(r.billNo, 40), name: clean(r.name, 80) || "Walk-in", amount: amt(r.amount), method: clean(r.method, 10).toUpperCase(), bill_date: day(r.bill_date).isValid() ? r.bill_date : "" }))
    .filter((r) => !roomOrderIds.has(r.id));
  const opBy = { cash: 0, upi: 0, card: 0, other: 0 };
  opRows.forEach((r) => (opBy[{ CASH: "cash", UPI: "upi", CARD: "card" }[r.method] || "other"] += r.amount));
  const tp = modeRows(d.today_paid);
  const doc = {
    pay_later: { count: plRows.length || amt(pl.count), amount: plRows.length ? plRows.reduce((s, r) => s + r.amount, 0) : amt(pl.amount), rows: plRows },
    today_paid: { ...tp, total: tp.cash + tp.upi + tp.card + tp.other },
    old_paid: { count: opRows.length, ...opBy, total: opBy.cash + opBy.upi + opBy.card + opBy.other, rows: opRows },
    banquet_cash: (Array.isArray(d.banquet_cash) ? d.banquet_cash : []).slice(0, 100).map((b) => ({
      id: clean(b.id, 40),
      bookingNo: clean(b.bookingNo, 40),
      party: clean(b.party, 80),
      eventDate: day(b.eventDate).isValid() ? b.eventDate : "",
      amount: amt(b.amount),
      mode: clean(b.mode, 10) || "Cash",
      by: clean(b.by, 60),
    })),
  };
  const before = await db().collection(EXTRAS).findOne({ _id: date });
  const strip = (x) => JSON.stringify({ pay_later: x?.pay_later, today_paid: x?.today_paid, old_paid: x?.old_paid, banquet_cash: x?.banquet_cash });
  if (before && strip(before) === strip(doc)) {
    await db().collection(EXTRAS).updateOne({ _id: date }, { $set: { checkedAt: new Date() } });
    return;
  }
  if (before) await backup("posday", date, "updated", before);
  await db().collection(EXTRAS).updateOne({ _id: date }, { $set: { ...doc, date, entryCreateDate: day(date).startOf("day").toDate(), receivedAt: new Date(), checkedAt: new Date(), pc } }, { upsert: true });
  out.daysChanged += 1;
};

router.post("/", express.text({ type: "text/plain", limit: "5mb" }), async (req, res) => {
  try {
    if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body || "{}");
      } catch {
        return res.status(400).json({ success: false, message: "Bad data" });
      }
    }
    const keyDoc = await checkSyncKey(req);
    if (!keyDoc) return res.status(401).json({ success: false, message: "Wrong sync key" });
    const days = Array.isArray(req.body?.days) ? req.body.days : null;
    if (!days) return res.status(400).json({ success: false, message: "No days in this data" });
    if (days.length > MAX_DAYS) return res.status(400).json({ success: false, message: `Send at most ${MAX_DAYS} days at a time` });
    const from = await startDate(keyDoc);
    const today = todayIst();
    const pc = clean(req.body?.pc, 40);
    const out = { daysChanged: 0, created: 0, updated: 0, same: 0, kept: 0, removed: 0, skipped: [], from: from.format(F) };
    for (const d of days) {
      const date = String(d?.date || "");
      const dd = day(date);
      if (!dd.isValid()) {
        out.skipped.push(`${date || "(no date)"}: date must be DD-MM-YYYY`);
        continue;
      }
      if (dd.isBefore(from, "day")) {
        out.skipped.push(`${date}: before the start date ${from.format(F)}`);
        continue;
      }
      if (dd.isAfter(today, "day")) {
        out.skipped.push(`${date}: future day`);
        continue;
      }
      const list = Array.isArray(d.room_bills) ? d.room_bills : [];
      await syncRoomBills(date, list, d.complete === true, out);
      await syncExtras(date, d, new Set(list.map((r) => clean(r?.posOrderId, 40)).filter(Boolean)), pc, out);
    }
    lastExtrasSync = { at: new Date(), pc, ...out, skipped: out.skipped.length };
    await db().collection("kitchen_docs").updateOne({ _id: "secret/possync" }, { $set: { "data.lastExtrasSync": lastExtrasSync } });
    res.json({ success: true, ...out });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

export default router;
