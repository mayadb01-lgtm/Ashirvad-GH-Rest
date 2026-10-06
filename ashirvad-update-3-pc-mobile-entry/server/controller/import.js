import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { v4 as uuidv4 } from "uuid";
import { isAuthenticated } from "../middleware/auth.js";
import Entry from "../model/entry.js";
import Room from "../model/room.js";
import RestEntry from "../model/restEntry.js";
import RestCategory from "../model/restCategory.js";
import OfficeBook, { OfficeCategory } from "../model/officeBook.js";

dayjs.extend(customParseFormat);
const router = Router();

/* ------------------------------------------------------------------ */
/* Shared helpers                                                       */
/* ------------------------------------------------------------------ */

const MAX_ROWS = 5000;
const GH_PERIODS = {
  day: { key: "day", label: "Day" },
  night: { key: "night", label: "Night" },
  extraday: { key: "extraDay", label: "extraDay" },
  extranight: { key: "extraNight", label: "extraNight" },
};
const GH_TYPES = [
  "Single",
  "Couple",
  "Family",
  "Employee",
  "NRI",
  "Foreigner",
  "Group",
  "Other",
];
const GH_MODES = ["Cash", "Card", "PPC", "PPS", "UnPaid"];
const OFFICE_MODES = ["Cash", "Card", "PP", "PPS", "PPC", "UnPaid"];

const str = (v) => (v === undefined || v === null ? "" : String(v).trim());
const num = (v) => {
  if (v === "" || v === undefined || v === null) return NaN;
  return Number(String(v).replace(/[₹,\s]/g, ""));
};
const pick = (list, value) =>
  list.find((x) => x.toLowerCase() === str(value).toLowerCase());
const toBool = (v) => ["yes", "y", "true", "1"].includes(str(v).toLowerCase());

// Client already normalises dates to DD-MM-YYYY, but re-check strictly here.
const normaliseDate = (v) => {
  const d = dayjs(str(v), ["DD-MM-YYYY", "D-M-YYYY"], true);
  return d.isValid() ? d.format("DD-MM-YYYY") : null;
};

const isAdmin = (req) => req.user && req.user.role === "Admin";

const getRows = (req, res) => {
  const { rows } = req.body || {};
  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ success: false, message: "No rows to import." });
    return null;
  }
  if (rows.length > MAX_ROWS) {
    res.status(400).json({
      success: false,
      message: `Too many rows. Max ${MAX_ROWS} per import, split the file.`,
    });
    return null;
  }
  return rows;
};

const groupByDate = (items) =>
  items.reduce((acc, it) => {
    (acc[it.date] ||= []).push(it);
    return acc;
  }, {});

// Only admins / super users may import.
router.use(isAuthenticated, (req, res, next) => {
  if (isAdmin(req) || req.user?.isSuperUser) return next();
  return res
    .status(403)
    .json({ success: false, message: "Only admins can import data." });
});

/* ------------------------------------------------------------------ */
/* Guest House entries                                                  */
/* ------------------------------------------------------------------ */
// body: { rows: [...], duplicateMode: "skip" | "overwrite", dryRun: bool }
router.post("/gh-entries", async (req, res) => {
  try {
    const rows = getRows(req, res);
    if (!rows) return;
    const duplicateMode =
      req.body.duplicateMode === "overwrite" ? "overwrite" : "skip";
    const dryRun = Boolean(req.body.dryRun);

    const rooms = await Room.find().sort({ roomNumber: 1 }).lean();
    const roomIndex = new Map(rooms.map((r, i) => [r.roomNumber, { ...r, i }]));

    const results = [];
    const valid = [];
    const seen = new Set();

    rows.forEach((raw, idx) => {
      const rowNo = raw.__row || idx + 2;
      const errors = [];
      const date = normaliseDate(raw.date);
      if (!date) errors.push("Invalid date (use DD-MM-YYYY)");

      const period = GH_PERIODS[str(raw.period).toLowerCase().replace(/\s/g, "")];
      if (!period) errors.push("Period must be Day / Night / Extra Day / Extra Night");

      const roomNo = num(raw.roomNo);
      const room = roomIndex.get(roomNo);
      if (!room) errors.push(`Room ${str(raw.roomNo) || "?"} does not exist`);

      const rate = num(raw.rate);
      if (!(rate > 0)) errors.push("Rate must be > 0");

      const noOfPeople = num(raw.noOfPeople);
      if (!(noOfPeople > 0)) errors.push("People must be > 0");

      const type = pick(GH_TYPES, raw.type);
      if (!type) errors.push(`Type must be one of ${GH_TYPES.join(", ")}`);

      const modeOfPayment = pick(GH_MODES, raw.modeOfPayment);
      if (!modeOfPayment)
        errors.push(`Payment must be one of ${GH_MODES.join(", ")}`);

      const fullname = str(raw.fullname);
      if (!fullname) errors.push("Guest name is required");

      const mobile = str(raw.mobileNumber).replace(/\D/g, "");
      if (mobile && mobile.length !== 10)
        errors.push("Mobile must be 10 digits");

      const discount = raw.discount === "" || raw.discount == null ? 0 : num(raw.discount);
      if (isNaN(discount) || discount < 0) errors.push("Discount must be ≥ 0");

      const key = `${date}|${period?.key}|${roomNo}`;
      if (date && period && room) {
        if (seen.has(key))
          errors.push("Duplicate in file: same date + period + room");
        seen.add(key);
      }

      if (errors.length) {
        results.push({ row: rowNo, status: "error", errors });
        return;
      }

      valid.push({
        rowNo,
        date,
        entry: {
          id: `${period.label} - ${room.i + 1}`,
          roomNo,
          cost: room.roomCost,
          roomType: room.roomType,
          rate,
          noOfPeople,
          type,
          modeOfPayment,
          fullname,
          mobileNumber: mobile ? Number(mobile) : 0,
          checkInTime: str(raw.checkInTime) || "10:00 AM",
          checkOutTime: str(raw.checkOutTime) || "10:00 AM",
          period: period.key,
          date,
          createDate: date,
          discount,
          isPaid: false,
          updatedDateTime: new Date().toString(),
        },
      });
    });

    const byDate = groupByDate(valid);
    const summary = { created: 0, overwritten: 0, skipped: 0, daysTouched: 0 };

    for (const [date, items] of Object.entries(byDate)) {
      const doc = await Entry.findOne({ date });
      const existing = doc ? doc.entry.map((e) => e.toObject()) : [];
      let changed = false;

      for (const it of items) {
        const pos = existing.findIndex(
          (e) => e.period === it.entry.period && e.roomNo === it.entry.roomNo
        );
        if (pos === -1) {
          existing.push(it.entry);
          summary.created++;
          results.push({ row: it.rowNo, status: "created" });
          changed = true;
        } else if (duplicateMode === "overwrite") {
          // keep original payment-tracking fields
          existing[pos] = {
            ...it.entry,
            _id: existing[pos]._id,
            isPaid: existing[pos].isPaid,
            paidDate: existing[pos].paidDate,
          };
          summary.overwritten++;
          results.push({ row: it.rowNo, status: "overwritten" });
          changed = true;
        } else {
          summary.skipped++;
          results.push({
            row: it.rowNo,
            status: "skipped",
            errors: ["Already exists for this date/period/room"],
          });
        }
      }

      if (changed && !dryRun) {
        if (doc) {
          doc.entry = existing;
          await doc.save();
        } else {
          await new Entry({ date, entry: existing }).save();
        }
      }
      if (changed) summary.daysTouched++;
    }

    summary.errors = results.filter((r) => r.status === "error").length;
    results.sort((a, b) => a.row - b.row);
    res.status(200).json({ success: true, dryRun, summary, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ------------------------------------------------------------------ */
/* Office Book (In / Out)                                               */
/* ------------------------------------------------------------------ */
router.post("/office-book", async (req, res) => {
  try {
    const rows = getRows(req, res);
    if (!rows) return;
    const dryRun = Boolean(req.body.dryRun);

    const cats = await OfficeCategory.find().lean();
    const catMap = new Map(
      cats.map((c) => [
        c.categoryName.toLowerCase(),
        {
          name: c.categoryName,
          expenses: new Map(
            (c.expense || []).map((e) => [e.expenseName.toLowerCase(), e.expenseName])
          ),
        },
      ])
    );

    const results = [];
    const valid = [];

    rows.forEach((raw, idx) => {
      const rowNo = raw.__row || idx + 2;
      const errors = [];
      const date = normaliseDate(raw.date);
      if (!date) errors.push("Invalid date (use DD-MM-YYYY)");

      const sectionRaw = str(raw.section).toLowerCase();
      const section = ["in", "office in", "credit", "jama"].includes(sectionRaw)
        ? "officeIn"
        : ["out", "office out", "debit", "udhar", "kharch"].includes(sectionRaw)
          ? "officeOut"
          : null;
      if (!section) errors.push("Section must be In or Out");

      const amount = num(raw.amount);
      if (!(amount > 0)) errors.push("Amount must be > 0");

      const modeOfPayment = pick(OFFICE_MODES, raw.modeOfPayment);
      if (!modeOfPayment)
        errors.push(`Payment must be one of ${OFFICE_MODES.join(", ")}`);

      const fullname = str(raw.fullname);
      if (!fullname) errors.push("Name is required");

      const cat = catMap.get(str(raw.categoryName).toLowerCase());
      if (!cat) errors.push(`Category "${str(raw.categoryName)}" not found`);
      const expenseName = cat?.expenses.get(str(raw.expenseName).toLowerCase());
      if (cat && !expenseName)
        errors.push(`Expense "${str(raw.expenseName)}" not in ${cat.name}`);

      if (errors.length) {
        results.push({ row: rowNo, status: "error", errors });
        return;
      }

      valid.push({
        rowNo,
        date,
        section,
        item: {
          id: uuidv4(),
          amount,
          modeOfPayment,
          fullname,
          categoryName: cat.name,
          expenseName,
          isVendor: toBool(raw.isVendor),
          remark: str(raw.remark),
          createDate: date,
        },
      });
    });

    const byDate = groupByDate(valid);
    const summary = { created: 0, daysTouched: 0 };

    for (const [date, items] of Object.entries(byDate)) {
      if (!dryRun) {
        let doc = await OfficeBook.findOne({ createDate: date });
        if (!doc) doc = new OfficeBook({ createDate: date, officeIn: [], officeOut: [] });
        items.forEach((it) => doc[it.section].push(it.item));
        doc.updatedDate = dayjs().format("DD-MM-YYYY");
        await doc.save();
      }
      items.forEach((it) => results.push({ row: it.rowNo, status: "created" }));
      summary.created += items.length;
      summary.daysTouched++;
    }

    summary.errors = results.filter((r) => r.status === "error").length;
    results.sort((a, b) => a.row - b.row);
    res.status(200).json({ success: true, dryRun, summary, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/* ------------------------------------------------------------------ */
/* Restaurant expenses                                                  */
/* ------------------------------------------------------------------ */
router.post("/rest-expenses", async (req, res) => {
  try {
    const rows = getRows(req, res);
    if (!rows) return;
    const dryRun = Boolean(req.body.dryRun);

    const cats = await RestCategory.find().lean();
    const catMap = new Map(
      cats.map((c) => [
        c.categoryName.toLowerCase(),
        {
          name: c.categoryName,
          expenses: new Map(
            (c.expense || []).map((e) => [e.expenseName.toLowerCase(), e])
          ),
        },
      ])
    );

    const results = [];
    const valid = [];

    rows.forEach((raw, idx) => {
      const rowNo = raw.__row || idx + 2;
      const errors = [];
      const date = normaliseDate(raw.date);
      if (!date) errors.push("Invalid date (use DD-MM-YYYY)");

      const amount = num(raw.amount);
      if (!(amount > 0)) errors.push("Amount must be > 0");

      const cat = catMap.get(str(raw.categoryName).toLowerCase());
      if (!cat) errors.push(`Category "${str(raw.categoryName)}" not found`);
      const exp = cat?.expenses.get(str(raw.expenseName).toLowerCase());
      if (cat && !exp)
        errors.push(`Expense "${str(raw.expenseName)}" not in ${cat.name}`);

      if (errors.length) {
        results.push({ row: rowNo, status: "error", errors });
        return;
      }

      valid.push({
        rowNo,
        date,
        item: {
          id: uuidv4(),
          amount,
          categoryName: cat.name,
          expenseName: exp.expenseName,
          isVendor: raw.isVendor === "" || raw.isVendor == null ? !!exp.isVendor : toBool(raw.isVendor),
          fullname: str(raw.fullname),
          createDate: date,
        },
      });
    });

    const byDate = groupByDate(valid);
    const summary = { created: 0, daysTouched: 0 };

    for (const [date, items] of Object.entries(byDate)) {
      if (!dryRun) {
        let doc = await RestEntry.findOne({ createDate: date });
        if (!doc) doc = new RestEntry({ date, createDate: date });
        items.forEach((it) => doc.expenses.push(it.item));

        // Recalculate totals exactly like RestEntryPage does
        doc.totalExpenses = doc.expenses.reduce((s, e) => s + (e.amount || 0), 0);
        doc.grandTotal =
          (doc.totalUpad || 0) +
          (doc.totalPending || 0) +
          doc.totalExpenses +
          (doc.totalCard || 0) +
          (doc.totalPP || 0) +
          (doc.totalCash || 0);
        doc.extraAmount = doc.grandTotal - (doc.computerAmount || 0);
        doc.updatedDateTime = new Date().toString();
        await doc.save();
      }
      items.forEach((it) => results.push({ row: it.rowNo, status: "created" }));
      summary.created += items.length;
      summary.daysTouched++;
    }

    summary.errors = results.filter((r) => r.status === "error").length;
    results.sort((a, b) => a.row - b.row);
    res.status(200).json({ success: true, dryRun, summary, results });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
