// Quick Entry helpers (READ-ONLY). Login zaroori (security.js gate).
import { officeReceivedGhIds } from "../model/ghDueReceipt.js";
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Entry from "../model/entry.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import Stay from "../model/stay.js";
import { isAdminLike, effectiveAccess, datesBack, MODULES, REPORTS, rasoiAllowed } from "../middleware/staffAccess.js";

dayjs.extend(customParseFormat);
const router = Router();

// GET /api/v1/quick/me → main kaun hoon, kya kar sakta hoon (app isi se screen tay karta hai)
router.get("/me", async (req, res) => {
  const u = req.user;
  const admin = isAdminLike(u);
  const acc = admin ? null : await effectiveAccess(u).catch(() => null);
  res.json({
    success: true,
    me: {
      name: u?.name || "",
      isAdmin: admin,
      isOwnerAdmin: u?.constructor?.modelName === "Admin",
      viewOnly: u?.viewOnly === true, // sirf reports dekhne wala account
      department: admin ? "all" : u?.department || "none",
      isActive: u?.isActive !== false,
      entryAdmin: !admin && u?.isEntryAdmin === true, // malik ne "Admin" banaya staff
      // Super Admin ne jo diya (ya purana department)
      modules: admin ? MODULES : acc?.modules || [],
      isManager: !admin && (acc?.modules?.length || 0) > 1,
      entryDays: admin ? null : acc?.entryDays ?? 0,
      allowedDates: admin || acc?.entryDays === null ? null : datesBack(acc?.entryDays || 0), // null = koi rok nahi
      reports: admin ? Object.keys(REPORTS) : acc?.reports || [],
      reportDays: admin ? null : acc?.reportDays ?? 0,
      classic: admin ? true : acc?.classic !== false, // purane (classic) entry pages
      canEdit: admin ? true : acc?.canEdit === true, // submit ho chuki entry badal sake
      rasoi: admin || rasoiAllowed(u, acc), // Rasoi Board (kitchen)
    },
  });
});

// GET /api/v1/quick/guest/:mobile → purana guest: naam, kitni baar aaya, last visit, baaki paisa
router.get("/guest/:mobile", async (req, res) => {
  try {
    const mobile = Number(String(req.params.mobile).replace(/\D/g, ""));
    if (!mobile || String(mobile).length !== 10) {
      return res.status(400).json({ success: false, message: "Enter a 10-digit mobile number" });
    }
    const stays = await Entry.aggregate([
      { $match: { "entry.mobileNumber": mobile } },
      { $unwind: "$entry" },
      { $match: { "entry.mobileNumber": mobile, "entry.period": { $nin: ["UnPaid", "reservation"] } } },
      {
        $project: {
          _id: 0,
          date: "$entry.createDate",
          roomNo: "$entry.roomNo",
          fullname: "$entry.fullname",
          type: "$entry.type",
          noOfPeople: "$entry.noOfPeople",
          rate: "$entry.rate",
          modeOfPayment: "$entry.modeOfPayment",
          isPaid: "$entry.isPaid",
          id: "$entry._id",
          day: "$entryCreateDate",
        },
      },
      { $sort: { day: -1 } },
    ]);
    if (!stays.length) return res.json({ success: true, found: false });
    const offIds = await officeReceivedGhIds(); // Office mein wasool hue baaki nahi
    const pending = stays.filter((s) => s.modeOfPayment === "UnPaid" && !s.isPaid && !offIds.has(String(s.id)));
    const last = stays[0];
    res.json({
      success: true,
      found: true,
      guest: {
        fullname: last.fullname,
        type: last.type,
        noOfPeople: last.noOfPeople,
        visits: new Set(stays.map((s) => s.date)).size,
        lastVisit: last.date,
        lastRoom: last.roomNo,
        lastRate: last.rate,
        pendingAmount: pending.reduce((a, s) => a + (s.rate || 0), 0),
        pendingCount: pending.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/v1/quick/day-status/:date → teeno business: entry hui? kisne, kab?
// GET /quick/gh-missing → pichhle 30 din (aaj chhod ke) jin dino room bhare the lekin GH ka din Submit nahi hua
router.get("/gh-missing", async (req, res) => {
  try {
    const F = "DD-MM-YYYY";
    const today = dayjs(new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10));
    const from = today.subtract(30, "day");
    const dates = [];
    for (let x = from; x.isBefore(today, "day"); x = x.add(1, "day")) dates.push(x.format(F));
    const [stays, entries] = await Promise.all([
      Stay.find({ startCreateDate: { $gte: from.subtract(60, "day").toDate(), $lt: today.startOf("day").toDate() } }, { roomNo: 1, startDate: 1, status: 1, checkoutDate: 1 }).lean(),
      Entry.find({ date: { $in: dates } }, { date: 1 }).lean(),
    ]);
    const done = new Set(entries.map((e) => e.date));
    const rooms = {};
    stays.forEach((s) => {
      const st = dayjs(s.startDate, F, true);
      if (!st.isValid()) return;
      const end = s.status === "active" || !s.checkoutDate ? today.subtract(1, "day") : dayjs(s.checkoutDate, F, true).subtract(1, "day");
      for (let x = st.isBefore(from, "day") ? from : st; !x.isAfter(end, "day") && x.isBefore(today, "day"); x = x.add(1, "day")) {
        const k = x.format(F);
        (rooms[k] ||= new Set()).add(s.roomNo);
      }
    });
    const data = dates.filter((d) => rooms[d] && !done.has(d)).map((d) => ({ date: d, rooms: rooms[d].size }));
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/day-status/:date", async (req, res) => {
  try {
    const date = req.params.date;
    const [gh, rest, office] = await Promise.all([
      Entry.findOne({ date }, { entry: 1, enteredBy: 1, enteredAt: 1, updatedBy: 1 }).lean(),
      RestEntry.findOne({ createDate: date }, { grandTotal: 1, enteredBy: 1, enteredAt: 1, updatedBy: 1 }).lean(),
      OfficeBook.findOne({ createDate: date }, { officeIn: 1, officeOut: 1, enteredBy: 1, enteredAt: 1, updatedBy: 1 }).lean(),
    ]);
    const periods = (gh?.entry || []).reduce((acc, e) => ((acc[e.period] = (acc[e.period] || 0) + 1), acc), {});
    res.json({
      success: true,
      data: {
        gh: gh ? { done: true, periods, by: gh.enteredBy, at: gh.enteredAt, updatedBy: gh.updatedBy } : { done: false },
        rest: rest ? { done: true, total: rest.grandTotal, by: rest.enteredBy, at: rest.enteredAt, updatedBy: rest.updatedBy } : { done: false },
        office: office
          ? { done: true, rows: (office.officeIn?.length || 0) + (office.officeOut?.length || 0), by: office.enteredBy, at: office.enteredAt, updatedBy: office.updatedBy }
          : { done: false },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
