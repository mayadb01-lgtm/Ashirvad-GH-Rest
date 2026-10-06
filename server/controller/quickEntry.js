// Quick Entry helpers (READ-ONLY). Login zaroori (security.js gate).
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import Entry from "../model/entry.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
import { allowedStaffDates, isAdminLike } from "../middleware/staffAccess.js";

dayjs.extend(customParseFormat);
const router = Router();

// GET /api/v1/quick/me → main kaun hoon, kya kar sakta hoon (app isi se screen tay karta hai)
router.get("/me", (req, res) => {
  const u = req.user;
  const admin = isAdminLike(u);
  res.json({
    success: true,
    me: {
      name: u?.name || "",
      isAdmin: admin,
      isOwnerAdmin: u?.constructor?.modelName === "Admin",
      department: admin ? "all" : u?.department || "none",
      isActive: u?.isActive !== false,
      modules: admin ? ["gh", "rest", "office"] : ["gh", "rest", "office"].includes(u?.department) ? [u.department] : [],
      allowedDates: admin ? null : allowedStaffDates(), // null = koi rok nahi
    },
  });
});

// GET /api/v1/quick/guest/:mobile → purana guest: naam, kitni baar aaya, last visit, baaki paisa
router.get("/guest/:mobile", async (req, res) => {
  try {
    const mobile = Number(String(req.params.mobile).replace(/\D/g, ""));
    if (!mobile || String(mobile).length !== 10) {
      return res.status(400).json({ success: false, message: "10 digit mobile chahiye" });
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
          day: "$entryCreateDate",
        },
      },
      { $sort: { day: -1 } },
    ]);
    if (!stays.length) return res.json({ success: true, found: false });
    const pending = stays.filter((s) => s.modeOfPayment === "UnPaid" && !s.isPaid);
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
