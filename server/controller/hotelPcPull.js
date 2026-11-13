// Super admin: "Import from cashier PC". Rad Shiva PULLS the hotel PC's data; the hotel PC never sends anything here
// and holds no Rad Shiva key or login.
//
//   GET  /api/v1/hotel-pc/pull/status                 -> is it set up, last good import, suggested dates
//   POST /api/v1/hotel-pc/pull  { from, to }          -> fetch + apply (add-only)
//   POST /api/v1/hotel-pc/pull  { from, to, replace } -> same, and replace ONLY the listed "different" records
//
// Server .env:  HOTEL_PC_PULL_URL  (https://<vps>/shop/api/radshiva/pull, or just https://<vps>)
//               HOTEL_PC_PULL_KEY  (plain key; the hotel PC keeps only its SHA-256. Make it with scripts/make-pull-key.js)
//
// Safety rules (old Rad Shiva data must never be damaged):
//   • only the collections in COLLS below; never logins, secrets or appsettings.
//   • a record is added only when neither its _id nor its natural key (e.g. the day) is in Rad Shiva yet.
//   • a record Rad Shiva already has is never overwritten here. When the hotel PC copy differs and is newer, it is
//     listed as "different"; the super admin may tick it and ask again with { replace: ["<coll>:<id>"] }.
//   • every add and replace is written to "hotel_pc_pull_backups" first (added: the new record; replaced: the old one).
//   • POS room bills (roomcharges source "pos") come only through pos_days (hotelSenseSync.js), never as docs.
//   • running the same import twice changes nothing.
import { Router } from "express";
import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Entry from "../model/entry.js";
import OfficeBook from "../model/officeBook.js";
import RestEntry from "../model/restEntry.js";
import RoomCharge from "../model/roomCharge.js";
import GhDueReceipt from "../model/ghDueReceipt.js";
import RestDueReceipt from "../model/restDueReceipt.js";
import RestDueAdjust from "../model/restDueAdjust.js";
import CashHandover from "../model/cashHandover.js";
import GuestRegister from "../model/guestRegister.js";
import Stay from "../model/stay.js";
import { Booking } from "../model/booking.js";
import { RoomBlock } from "../model/roomBlock.js";
import { RoomMove, RoomGroup } from "../model/roomMove.js";
import { BanquetBooking, BanquetHall, BanquetPackage, BanquetItem, BanquetAddon } from "../model/banquet.js";
import { Invoice } from "../model/invoice.js";
import PurchaseBill from "../model/purchaseBill.js";
import StaffSalary from "../model/staffSalary.js";
import RestCategory from "../model/restCategory.js";
import RestStaff from "../model/restStaff.js";
import RestPending from "../model/restPending.js";
import Room from "../model/room.js";
import OfficeType from "../model/officeType.js";
import { applyPosReports } from "./posSync.js";
import { applyPosDays, PULL_STATE } from "./hotelSenseSync.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const IST_MS = 330 * 60 * 1000;
const MAX_DAYS = 62;
export const PULL_BACKUPS = "hotel_pc_pull_backups";
const db = () => mongoose.connection.db;
const day = (s) => dayjs(String(s || ""), F, true);
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10));
const s = (v) => String(v ?? "").trim();

// hotel PC collection name -> [model, natural key (or null: by _id only)]
// Set up only in Rad Shiva (the hotel PC copies are its built-in setup): rooms and banquet halls / packages / menu
// items / add-ons are never taken from the cashier PC
const RAD_SHIVA_MASTER = new Set(["rooms", "roomgroups", "banquethalls", "banquetpackages", "banquetitems", "banquetaddons"]);
const COLLS = {
  restentries: [RestEntry, (d) => s(d.createDate)],
  entries: [Entry, (d) => s(d.date)],
  officebooks: [OfficeBook, (d) => s(d.date)],
  roomcharges: [RoomCharge, null],
  ghduereceipts: [GhDueReceipt, null],
  restduereceipts: [RestDueReceipt, null],
  restdueadjusts: [RestDueAdjust, null],
  cashhandovers: [CashHandover, null],
  guestregisters: [GuestRegister, (d) => `${s(d.date)}|${s(d.period)}|${s(d.roomNo)}`],
  stays: [Stay, (d) => `${s(d.startDate)}|${s(d.period)}|${s(d.roomNo)}`],
  bookings: [Booking, null],
  roomblocks: [RoomBlock, (d) => s(d.roomNo)],
  roommoves: [RoomMove, null],
  banquetbookings: [BanquetBooking, null],
  invoices: [Invoice, (d) => `${s(d.series)}|${s(d.fy)}|${s(d.seq)}`],
  purchasebills: [PurchaseBill, null],
  staffsalaries: [StaffSalary, (d) => `${String(Number(d.month)).padStart(2, "0")}-${s(d.year)}`],
  restcategories: [RestCategory, (d) => s(d.categoryName).toLowerCase()],
  reststaffs: [RestStaff, null],
  restpendings: [RestPending, null],
  rooms: [Room, (d) => s(d.roomNumber)],
  roomgroups: [RoomGroup, null],
  officetypes: [OfficeType, (d) => `${s(d.side)}|${s(d.categoryName)}|${s(d.expenseName)}`],
  banquethalls: [BanquetHall, (d) => s(d.name).toLowerCase()],
  banquetpackages: [BanquetPackage, (d) => s(d.name).toLowerCase()],
  banquetitems: [BanquetItem, (d) => s(d.name).toLowerCase()],
  banquetaddons: [BanquetAddon, (d) => s(d.name).toLowerCase()],
};
// fields that are part of the natural key, to find the Rad Shiva record with the same key
const KEY_QUERY = {
  restentries: (d) => ({ createDate: s(d.createDate) }),
  entries: (d) => ({ date: s(d.date) }),
  officebooks: (d) => ({ date: s(d.date) }),
  guestregisters: (d) => ({ date: s(d.date), period: s(d.period), roomNo: Number(d.roomNo) }),
  stays: (d) => ({ startDate: s(d.startDate), period: s(d.period), roomNo: Number(d.roomNo) }),
  roomblocks: (d) => ({ roomNo: Number(d.roomNo) }),
  invoices: (d) => ({ series: d.series, fy: d.fy, seq: d.seq }),
  staffsalaries: (d) => ({ month: Number(d.month), year: Number(d.year) }),
  restcategories: (d) => ({ categoryName: new RegExp(`^${escapeRe(s(d.categoryName))}$`, "i") }),
  rooms: (d) => ({ roomNumber: Number(d.roomNumber) }),
  officetypes: (d) => ({ side: d.side, categoryName: d.categoryName, expenseName: d.expenseName }),
  banquethalls: (d) => ({ name: new RegExp(`^${escapeRe(s(d.name))}$`, "i") }),
  banquetpackages: (d) => ({ name: new RegExp(`^${escapeRe(s(d.name))}$`, "i") }),
  banquetitems: (d) => ({ name: new RegExp(`^${escapeRe(s(d.name))}$`, "i") }),
  banquetaddons: (d) => ({ name: new RegExp(`^${escapeRe(s(d.name))}$`, "i") }),
};
function escapeRe(x) {
  return x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const IGNORE = new Set(["_id", "__v", "createdAt", "updatedAt"]);
// same values, whatever the key order; Dates / ObjectIds as strings. Inside sub-documents the _id and the
// created / updated times are left out: only content counts (some rows default createdAt to "now" on every read).
const norm = (v, top = true) => {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (v instanceof mongoose.Types.ObjectId) return String(v);
  if (Array.isArray(v)) return v.map((x) => norm(x, false));
  if (typeof v === "object") {
    const o = {};
    Object.keys(v)
      .sort()
      .forEach((k) => {
        if (k === "__v" || (!top && (k === "_id" || k === "createdAt" || k === "updatedAt"))) return;
        const x = norm(v[k], false);
        if (x !== null && !(Array.isArray(x) && x.length === 0)) o[k] = x;
      });
    return o;
  }
  return v;
};
// top-level fields that differ
const diffFields = (a, b) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  return [...keys].filter((k) => !IGNORE.has(k) && JSON.stringify(norm(a[k], false)) !== JSON.stringify(norm(b[k], false)));
};
// Rad Shiva's own record seen through the same model (so default values do not look like a change)
const asModel = (Model, doc) => {
  try {
    return new Model(doc).toObject({ depopulate: true, versionKey: false });
  } catch {
    return doc;
  }
};
const time = (v) => {
  const t = v ? new Date(v).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

// the hotel PC record cast to this Rad Shiva model (unknown fields dropped, types fixed). null + reason when it is not valid.
const castDoc = (Model, raw) => {
  const id = s(raw?._id);
  if (!/^[a-f0-9]{24}$/i.test(id)) return { why: "no valid _id" };
  const m = new Model(raw);
  const err = m.validateSync();
  if (err) return { why: `not valid here: ${Object.keys(err.errors || {}).slice(0, 4).join(", ") || err.message}` };
  const obj = m.toObject({ depopulate: true, versionKey: false });
  obj._id = new mongoose.Types.ObjectId(id);
  // keep the hotel PC's own times (never "now")
  const c = time(raw.createdAt);
  const u = time(raw.updatedAt);
  if (c) obj.createdAt = new Date(c);
  if (u) obj.updatedAt = new Date(u);
  // the save hooks do not run on a plain insert: the day field the reports search on
  if (Model.schema.path("entryCreateDate") && !obj.entryCreateDate) {
    const d = day(obj.date || obj.createDate);
    if (d.isValid()) obj.entryCreateDate = d.startOf("day").toDate();
  }
  // the same for the day lines inside (expenses, upad, pending... and GH / office entries)
  Object.values(obj).forEach((v) => {
    if (!Array.isArray(v)) return;
    v.forEach((e) => {
      if (e && typeof e === "object" && !(e instanceof Date) && e.createDate && !e.entryCreateDate) {
        const d = day(e.createDate);
        if (d.isValid()) e.entryCreateDate = d.startOf("day").toDate();
      }
    });
  });
  return { obj };
};

const backup = (kind, coll, id, reason, doc, by) => db().collection(PULL_BACKUPS).insertOne({ at: new Date(), kind, coll, id: String(id), reason, doc, by });

// one collection of hotel PC docs: add new ones, compare the rest; replace only the ticked ones
const applyColl = async (coll, list, replaceIds, by, out) => {
  const [Model, natKey] = COLLS[coll];
  const res = { added: 0, same: 0, different: 0, replaced: 0, skipped: 0 };
  out.collections[coll] = res;
  const skip = (id, why) => {
    res.skipped += 1;
    if (out.skipped.length < 300) out.skipped.push({ coll, id: String(id || ""), why });
  };
  const seen = new Set();
  for (const raw of Array.isArray(list) ? list : []) {
    if (!raw || typeof raw !== "object") continue;
    const id = s(raw._id);
    if (seen.has(id)) continue;
    seen.add(id);
    // POS room bills come only through pos_days (matched by posOrderId), never as plain records
    if (coll === "roomcharges" && raw.source === "pos") {
      skip(id, "POS room bill: brought in with the POS days");
      continue;
    }
    const { obj, why } = castDoc(Model, raw);
    if (!obj) {
      skip(id, why);
      continue;
    }
    let mine = await Model.collection.findOne({ _id: obj._id });
    let byKey = false;
    if (!mine && natKey && KEY_QUERY[coll]) {
      mine = await Model.collection.findOne(KEY_QUERY[coll](obj));
      byKey = !!mine;
    }
    if (!mine) {
      try {
        await backup("added", coll, obj._id, "new record from the cashier PC", obj, by);
        await Model.collection.insertOne(obj);
        res.added += 1;
      } catch (e) {
        skip(id, e.code === 11000 ? "a record with the same key is already here" : e.message);
      }
      continue;
    }
    const fields = diffFields(obj, asModel(Model, mine));
    if (!fields.length) {
      res.same += 1;
      continue;
    }
    const theirs = time(obj.updatedAt);
    const ours = time(mine.updatedAt);
    if (theirs && ours && theirs <= ours) {
      skip(id, `Rad Shiva copy is newer (${fields.slice(0, 5).join(", ")} differ) - kept`);
      continue;
    }
    const tag = `${coll}:${id}`;
    if (replaceIds.has(tag)) {
      // keep Rad Shiva's own _id (other records may point to it); everything else from the cashier PC
      await backup("replaced", coll, mine._id, `replaced by the cashier PC copy ${id}`, mine, by);
      await Model.collection.replaceOne({ _id: mine._id }, { ...obj, _id: mine._id });
      res.replaced += 1;
      continue;
    }
    res.different += 1;
    out.different.push({
      tag,
      coll,
      id,
      radShivaId: String(mine._id),
      sameKeyOtherId: byKey,
      key: s(obj.name || obj.categoryName) || (natKey ? natKey(obj) : ""),
      fields: fields.slice(0, 12),
      hotelUpdatedAt: obj.updatedAt || null,
      radShivaUpdatedAt: mine.updatedAt || null,
    });
  }
};

// ---------- fetch from the hotel PC ----------
const pullUrl = () => {
  const u = s(process.env.HOTEL_PC_PULL_URL).replace(/\/+$/, "");
  if (!u) return "";
  return /\/pull$/.test(u) ? u : `${u}/shop/api/radshiva/pull`;
};
const fetchHotelPc = async (from, to, timeoutMs = 120000) => {
  const url = pullUrl();
  const key = s(process.env.HOTEL_PC_PULL_KEY);
  if (!url || !key) throw Object.assign(new Error("Not set up: HOTEL_PC_PULL_URL and HOTEL_PC_PULL_KEY are needed in the server settings"), { status: 503 });
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  let r;
  let text;
  try {
    r = await fetch(`${url}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { headers: { "x-pull-key": key, accept: "application/json" }, signal: ctl.signal });
    text = await r.text();
  } catch (e) {
    const msg = e.name === "AbortError" ? `The cashier PC did not answer in ${Math.round(timeoutMs / 1000)} seconds` : `Could not reach the cashier PC (${e.cause?.code || e.message})`;
    throw Object.assign(new Error(msg), { status: 502 });
  } finally {
    clearTimeout(timer);
  }
  let j = null;
  try {
    j = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  // the VPS link answers 502 / 503 / 504 itself when the hotel PC is off
  if (!j && [502, 503, 504].includes(r.status)) throw Object.assign(new Error(`Cashier PC not reachable (HTTP ${r.status})`), { status: 502 });
  if (!r.ok || !j?.success) {
    const msg = j?.message || `HTTP ${r.status}`;
    const hint = r.status === 401 ? " (the key on the cashier PC does not match)" : r.status === 503 ? " (pull is not switched on at the cashier PC)" : "";
    throw Object.assign(new Error(`Cashier PC said: ${msg}${hint}`), { status: 502 });
  }
  return j;
};

// ---------- one import (manual button and the 2-minute timer) ----------
// One at a time, also across server processes: a short lease in hotel_pc_pulls _id "lock".
const LOCK_MS = 5 * 60 * 1000;
const takeLock = async (owner) => {
  const now = new Date();
  try {
    const r = await db()
      .collection(PULL_STATE)
      .findOneAndUpdate({ _id: "lock", until: { $lt: now } }, { $set: { until: new Date(now.getTime() + LOCK_MS), owner, at: now } }, { upsert: true, returnDocument: "after" });
    return !!r;
  } catch (e) {
    if (e.code === 11000) return false; // someone else holds it
    throw e;
  }
};
const dropLock = (owner) => db().collection(PULL_STATE).updateOne({ _id: "lock", owner }, { $set: { until: new Date(0) } }).catch(() => {});

export class Busy extends Error {}

// fetch + apply. Throws Busy when another import runs.
export const runPull = async ({ from, to, replace = new Set(), by, auto = false, timeoutMs = 120000 }) => {
  const owner = `${process.pid}:${Date.now()}:${Math.random()}`;
  if (!(await takeLock(owner))) throw new Busy("An import is already running. Wait a minute and try again.");
  try {
    const got = await fetchHotelPc(from.format(F), to.format(F), timeoutMs);
    const out = { from: from.format(F), to: to.format(F), pc: s(got.pc).slice(0, 40), at: got.at || null, auto, collections: {}, different: [], skipped: [], ignored: [] };
    // 1) records (before the POS days: room bills look up the guest of the room)
    const docs = got.docs && typeof got.docs === "object" ? got.docs : {};
    for (const coll of Object.keys(docs)) {
      if (!COLLS[coll] || RAD_SHIVA_MASTER.has(coll)) {
        out.ignored.push(coll); // anything not on the list (logins, settings, ...) or set up only here is never written
        continue;
      }
      await applyColl(coll, docs[coll], replace, by, out);
    }
    // 2) POS side of each restaurant day (room food bills, pay later, old dues)
    out.posDays = await applyPosDays(got.pos_days, out.pc, from.format(F));
    // 3) Manager board numbers (dish / table / footfall)
    out.posReports = got.pos_reports ? await applyPosReports(got.pos_reports, out.pc) : { saved: false, message: "No POS reports in this data" };
    const totals = Object.values(out.collections).reduce((t, r) => {
      Object.keys(r).forEach((k) => (t[k] = (t[k] || 0) + r[k]));
      return t;
    }, {});
    out.totals = totals;
    const now = new Date();
    const pd = out.posDays || {};
    const changed = (totals.added || 0) + (totals.replaced || 0) + (pd.created || 0) + (pd.updated || 0) + (pd.removed || 0) + (pd.daysChanged || 0) > 0;
    // the timer runs 720 times a day: a log line only when it changed something (manual imports always)
    if (!auto || changed) await db().collection(PULL_STATE).insertOne({ kind: "log", ok: true, auto, at: now, by, from: out.from, to: out.to, replaced: replace.size, totals, posDays: { ...pd, skipped: pd.skipped?.length || 0 }, posReports: out.posReports });
    await db()
      .collection(PULL_STATE)
      .updateOne({ _id: "state" }, { $set: { lastOkAt: now, lastOkFrom: out.from, lastOkTo: out.to, lastOkAuto: auto, lastOkBy: by, waitingDifferent: out.different.length, failingSince: null, lastError: "" } }, { upsert: true });
    return out;
  } catch (e) {
    if (!(e instanceof Busy)) {
      const now = new Date();
      const state = await db().collection(PULL_STATE).findOne({ _id: "state" });
      await db()
        .collection(PULL_STATE)
        .updateOne({ _id: "state" }, { $set: { lastErrorAt: now, lastError: e.message, failingSince: state?.failingSince || now } }, { upsert: true })
        .catch(() => {});
      if (!auto) await db().collection(PULL_STATE).insertOne({ kind: "log", ok: false, at: now, by, from: from.format(F), to: to.format(F), message: e.message }).catch(() => {});
    }
    throw e;
  } finally {
    await dropLock(owner);
  }
};

// ---------- automatic import every 2 minutes (switched on / off by the Super Admin) ----------
// Asks for yesterday..today, or from the last good import when the PC was off (at most 62 days back).
// Same safe apply as the button: add only; "different" records wait for the Super Admin.
export const AUTO_EVERY_MS = 2 * 60 * 1000;
const AUTO_TIMEOUT_MS = 60 * 1000;
export const autoRange = (state, today = todayIst()) => {
  let from = today.subtract(1, "day");
  const last = day(state?.lastOkTo);
  if (last.isValid() && last.isBefore(from, "day")) from = last;
  if (today.diff(from, "day") >= MAX_DAYS) from = today.subtract(MAX_DAYS - 1, "day");
  return { from, to: today };
};
let autoDown = false; // log "not reachable" once, then stay quiet until it works again
export const autoTick = async () => {
  if (mongoose.connection.readyState !== 1) return { skipped: "no database" };
  const state = await db().collection(PULL_STATE).findOne({ _id: "state" });
  if (state?.autoOn !== true) return { skipped: "off" };
  if (!pullUrl() || !s(process.env.HOTEL_PC_PULL_KEY)) return { skipped: "not set up" };
  const { from, to } = autoRange(state);
  try {
    const out = await runPull({ from, to, by: "Auto import", auto: true, timeoutMs: AUTO_TIMEOUT_MS });
    if (autoDown) console.log(`[cashier PC import] working again: ${out.from}..${out.to} imported`);
    autoDown = false;
    return { ok: true, out };
  } catch (e) {
    if (e instanceof Busy) return { skipped: "busy" };
    if (!autoDown) console.log(`[cashier PC import] ${e.message} - trying again every 2 minutes, quietly`);
    autoDown = true;
    return { ok: false, message: e.message };
  }
};
let autoTimer = null;
export const startHotelPcAutoPull = () => {
  if (autoTimer) return;
  autoTimer = setInterval(() => {
    autoTick().catch((e) => console.log(`[cashier PC import] ${e.message}`));
  }, AUTO_EVERY_MS);
  autoTimer.unref?.();
};

// ---------- who may do it ----------
const superAdmin = (req, res, next) => {
  const u = req.user;
  if (u?.constructor?.modelName === "Admin" && u.isSuperAdmin === true && u.viewOnly !== true) return next();
  return res.status(403).json({ success: false, message: "Only the Super Admin can import from the cashier PC." });
};
const who = (u) => s(u?.name || u?.email || "Super Admin").slice(0, 60);

router.get("/pull/status", superAdmin, async (req, res) => {
  try {
    const [state, last] = await Promise.all([
      db().collection(PULL_STATE).findOne({ _id: "state" }),
      db().collection(PULL_STATE).find({ kind: "log", ok: true }).sort({ at: -1 }).limit(1).next(),
    ]);
    const today = todayIst();
    const lastTo = day(state?.lastOkTo).isValid() ? state.lastOkTo : last?.to;
    let from = day(lastTo).isValid() ? day(lastTo) : today;
    if (today.diff(from, "day") >= MAX_DAYS) from = today.subtract(MAX_DAYS - 1, "day");
    res.set("Cache-Control", "no-store").json({
      success: true,
      setUp: !!(pullUrl() && s(process.env.HOTEL_PC_PULL_KEY)),
      startDate: day(process.env.HOTEL_SENSE_SYNC_FROM).isValid() ? process.env.HOTEL_SENSE_SYNC_FROM : state?.extrasFrom || null,
      last: last ? { at: last.at, from: last.from, to: last.to, by: last.by, totals: last.totals } : null,
      lastOk: state?.lastOkAt ? { at: state.lastOkAt, from: state.lastOkFrom, to: state.lastOkTo, auto: !!state.lastOkAuto, by: state.lastOkBy } : null,
      failingSince: state?.failingSince || null,
      lastError: state?.failingSince ? state.lastError || "" : "",
      waitingDifferent: state?.waitingDifferent || 0,
      auto: { on: state?.autoOn === true, by: state?.autoBy || "", at: state?.autoAt || null, everyMinutes: AUTO_EVERY_MS / 60000 },
      suggest: { from: from.format(F), to: today.format(F) },
      maxDays: MAX_DAYS,
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// on / off switch of the 2-minute import
router.post("/pull/auto", superAdmin, async (req, res) => {
  try {
    const on = req.body?.on === true;
    await db()
      .collection(PULL_STATE)
      .updateOne({ _id: "state" }, { $set: { autoOn: on, autoBy: who(req.user), autoAt: new Date() } }, { upsert: true });
    if (on) autoTick().catch(() => {}); // first run now, not in 2 minutes
    res.json({ success: true, on });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

router.post("/pull", superAdmin, async (req, res) => {
  const from = day(req.body?.from);
  let to = day(req.body?.to);
  if (!from.isValid() || !to.isValid() || to.isBefore(from, "day")) return res.status(400).json({ success: false, message: "from and to must be DD-MM-YYYY, from not after to" });
  const today = todayIst();
  if (to.isAfter(today, "day")) to = today;
  if (to.diff(from, "day") >= MAX_DAYS) return res.status(400).json({ success: false, message: `At most ${MAX_DAYS} days at a time` });
  const replace = new Set((Array.isArray(req.body?.replace) ? req.body.replace : []).map((x) => s(x)).filter((x) => /^[a-z]+:[a-f0-9]{24}$/i.test(x)).slice(0, 2000));
  try {
    const out = await runPull({ from, to, replace, by: who(req.user) });
    res.json({ success: true, ...out });
  } catch (e) {
    res.status(e instanceof Busy ? 409 : e.status || 500).json({ success: false, message: e.message });
  }
});

export default router;
