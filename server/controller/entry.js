import { Router } from "express";
import Entry from "../model/entry.js";
// import { isAuthenticated } from "../middleware/auth.js";
const router = Router();

// Create a new Entry
router.post("/create-entry", async (req, res) => {
  try {
    const { entries, date } = req.body;

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
    console.log("entries", parsedEntries);

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
    console.log("unpaidEntries", unpaidEntries);

    for (const entry of unpaidEntries) {
      const updatedEntry = await Entry.findOneAndUpdate(
        {
          "entry.createDate": entry.createDate,
          "entry.roomNo": entry.roomNo,
          "entry.mobileNumber": entry.mobileNumber,
        },
        {
          $set: {
            "entry.$.isPaid": true,
            "entry.$.paidDate": new Date().toLocaleDateString("en-gb"),
            "entry.$.updatedDateTime": new Date().toString(),
          },
        },
        { new: true }
      );
      console.log("updatedEntry", updatedEntry);
    }

    // Create a new Entry document
    const newEntry = new Entry({
      entry: parsedEntries,
      date,
      // user: req.user._id, // Assign the authenticated user's ID
    });

    // Save the Entry to the database
    const createdEntry = await newEntry.save();

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
    const startDate = req.params.startDate;
    const endDate = req.params.endDate;

    const entries = await Entry.find({
      date: {
        $gte: startDate,
        $lte: endDate,
      },
      // user: req.user._id, // Find the Entry by date and authenticated user's ID
    });

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

    // Update the Entry
    entry.entry = parsedEntries;
    const updatedEntry = await entry.save();

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
