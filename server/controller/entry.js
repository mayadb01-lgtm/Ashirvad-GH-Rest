import { Router } from "express";
import Entry from "../model/entry.js";
import EntryLock from "../model/entryLock.js";
import dayjs from "dayjs";
// import { isAuthenticated } from "../middleware/auth.js";
const router = Router();
const who = (req) => (req.user ? `${req.user.name || req.user.email || ""}${req.user.role === "Admin" ? " (Admin)" : ""}` : "");


// ---------- Collections (purana baaki jama): sahi row pe, sirf ek baar ----------
// Jama row ki pehchaan: srcId (asli UnPaid row ka _id, naya app bhejta hai) ya date + room + mobile
const jamaKey = (j) => (j.srcId ? `id:${j.srcId}` : `${j.createDate}|${j.roomNo}|${j.mobileNumber}`);
const unpaidMatch = (j, paid) => ({
  entry: {
    $elemMatch: j.srcId
      ? { _id: j.srcId, isPaid: paid ? true : { $ne: true } }
      : { createDate: j.createDate, roomNo: Number(j.roomNo), mobileNumber: Number(j.mobileNumber) || 0, modeOfPayment: "UnPaid", period: { $ne: "UnPaid" }, isPaid: paid ? true : { $ne: true } },
  },
});
const setPaid = (j, paid) =>
  Entry.updateOne(unpaidMatch(j, !paid), {
    $set: {
      "entry.$.isPaid": paid,
      "entry.$.paidDate": paid ? new Date().toLocaleDateString("en-gb") : "",
      "entry.$.updatedDateTime": new Date().toString(),
    },
  });
// Naye jama: asli row atomic tarike se "paid" — pehle se paid ho to ruk jao (do baar wasooli nahi)
const markCollected = async (list) => {
  const done = [];
  for (const j of list) {
    const r = await setPaid(j, true);
    if (!r.modifiedCount) {
      await Promise.all(done.map((d) => setPaid(d, false)));
      return { ok: false, row: j };
    }
    done.push(j);
  }
  return { ok: true, done };
};
const collectedMsg = (j) => `Room ${j.roomNo} (${j.createDate}${j.fullname ? `, ${j.fullname}` : ""}) is already collected. Remove it from Collections and reload.`;

// Create a new Entry
router.post("/create-entry", async (req, res) => {
  const lockId = `gh:${req.body?.date || ""}`;
  let locked = false;
  try {
    const { entries, date } = req.body;
    // ek hi waqt mein do Submit (double-click / do phone) → sirf pehla chalega
    try {
      await EntryLock.create({ _id: lockId });
      locked = true;
    } catch (e) {
      if (e?.code === 11000) {
        // 2 min se purana atka taala ho to hata kar dobara try karne ko kaho
        await EntryLock.deleteOne({ _id: lockId, at: { $lt: new Date(Date.now() - 120000) } });
        return res.status(409).json({ success: false, message: "This day is being saved right now. Please wait a moment and refresh." });
      }
      throw e;
    }

    // Only 1 Entry is allowed per date
    const existingEntry = await Entry.findOne({
      date,
      // user: req.user._id, // Find the Entry by date and authenticated user's ID
    })
      .lean()
      .exec();

    if (existingEntry) {
      return res.status(400).json({
        success: false,
        message: "Entry already exists for this date.",
      });
    }

    let parsedEntries = entries;

    // Parse entries from JSON string to JavaScript object
    if (typeof entries === "string") {
      parsedEntries = JSON.parse(entries);
    }

    // Validate request body
    if (
      !parsedEntries ||
      !Array.isArray(parsedEntries) ||
      parsedEntries.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Entries must be a non-empty array.",
      });
    }
    if (!date) {
      return res.status(400).json({
        success: false,
        message: "Date is required.",
      });
    }

    const requiredFields = ["id", "rate", "modeOfPayment", "date"];

    // Validate each entry in the array
    for (const entry of parsedEntries) {
      for (const field of requiredFields) {
        if (!entry[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing field: ${field}`,
          });
        }
      }
    }

    const unpaidEntries = parsedEntries.filter(
      (entry) => entry.period === "UnPaid"
    );

    const marked = await markCollected(unpaidEntries);
    if (!marked.ok) return res.status(409).json({ success: false, message: collectedMsg(marked.row) });

    // Create a new Entry document
    const newEntry = new Entry({
      entry: parsedEntries,
      date,
      enteredBy: who(req),
      enteredAt: new Date(),
      // user: req.user._id, // Assign the authenticated user's ID
    });

    // Save the Entry to the database (fail ho to jama wapas unpaid)
    let createdEntry;
    try {
      createdEntry = await newEntry.save();
    } catch (e) {
      await Promise.all(marked.done.map((j) => setPaid(j, false)));
      throw e;
    }

    res.status(201).json({
      success: true,
      message: "Entry created successfully.",
      data: createdEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    if (locked) await EntryLock.deleteOne({ _id: lockId }).catch(() => {});
  }
});

// Get Entry by Date
router.get("/get-entry/:date", async (req, res) => {
  try {
    const date = req.params.date;
    const entry = await Entry.findOne({
      date,
      // user: req.user._id, // Find the Entry by date and authenticated user's ID
    });

    if (!entry) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      data: entry.entry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Entries by Date Range
router.get("/get-entries/:startDate/:endDate", async (req, res) => {
  try {
    const start = dayjs(req.params.startDate, "DD-MM-YYYY");
    const end = dayjs(req.params.endDate, "DD-MM-YYYY");

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Use DD-MM-YYYY",
      });
    }

    const entries = await Entry.find({
      entryCreateDate: {
        $gte: start.startOf("day").toDate(),
        $lte: end.endOf("day").toDate(),
      },
    }).sort({ entryCreateDate: 1 });

    res.status(200).json({
      success: true,
      data: entries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update Entry by Date
router.put("/update-entry/:date", async (req, res) => {
  try {
    const date = req.params.date;
    const { entries } = req.body;

    // Parse entries from JSON string to JavaScript object
    let parsedEntries = entries;
    if (typeof entries === "string") {
      parsedEntries = JSON.parse(entries);
    }

    // Validate request body
    if (
      !parsedEntries ||
      !Array.isArray(parsedEntries) ||
      parsedEntries.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Entries must be a non-empty array.",
      });
    }

    const requiredFields = ["id", "rate", "modeOfPayment", "date"];

    // Validate each entry in the array
    for (const entry of parsedEntries) {
      for (const field of requiredFields) {
        if (!entry[field]) {
          return res.status(400).json({
            success: false,
            message: `Missing field: ${field}`,
          });
        }
      }
    }

    // Find the Entry by date and authenticated user's ID
    const entry = await Entry.findOne({
      date,
      // user: req.user._id,
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found.",
      });
    }

    // Jama: is din pehle se jo the unhe dobara nahi; naye → asli row paid; hataye gaye → asli row wapas unpaid
    const oldJama = (entry.entry || []).filter((x) => x.period === "UnPaid").map((x) => x.toObject?.() || x);
    const newJama = parsedEntries.filter((item) => item.period === "UnPaid");
    const oldKeys = new Set(oldJama.map(jamaKey).concat(oldJama.map((x) => `${x.createDate}|${x.roomNo}|${x.mobileNumber}`)));
    const newKeys = new Set(newJama.map(jamaKey).concat(newJama.map((x) => `${x.createDate}|${x.roomNo}|${x.mobileNumber}`)));
    const added = newJama.filter((j) => !oldKeys.has(jamaKey(j)) && !oldKeys.has(`${j.createDate}|${j.roomNo}|${j.mobileNumber}`));
    const removed = oldJama.filter((j) => !newKeys.has(`${j.createDate}|${j.roomNo}|${j.mobileNumber}`));
    const marked = await markCollected(added);
    if (!marked.ok) return res.status(409).json({ success: false, message: collectedMsg(marked.row) });

    // Update the Entry
    entry.entry = parsedEntries;
    entry.updatedBy = who(req);
    let updatedEntry;
    try {
      updatedEntry = await entry.save();
    } catch (e) {
      await Promise.all(marked.done.map((j) => setPaid(j, false)));
      throw e;
    }
    for (const j of removed) await setPaid({ createDate: j.createDate, roomNo: j.roomNo, mobileNumber: j.mobileNumber }, false);

    res.status(200).json({
      success: true,
      message: "Entry updated successfully.",
      data: updatedEntry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete Entry by Date
router.delete("/delete-entry/:date", async (req, res) => {
  try {
    const date = req.params.date;
    // Find the Entry by date and authenticated user's ID
    const entry = await Entry.findOneAndDelete({
      date,
      // user: req.user._id,
    });

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Entry not found.",
      });
    }

    res.status(200).json({
      success: true,
      message: "Entry deleted successfully.",
      data: entry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get All modeOfPayment = "Unpaid" Entries
router.get("/get-unpaid-entries", async (req, res) => {
  try {
    const entries = await Entry.find({});

    const unpaidEntries = entries.flatMap((entry) =>
      entry.entry.filter(
        (item) => item.modeOfPayment === "UnPaid" && !item.isPaid
      )
    );

    res.status(200).json({
      success: true,
      data: unpaidEntries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
