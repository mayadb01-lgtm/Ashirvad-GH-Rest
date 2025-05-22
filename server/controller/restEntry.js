import { Router } from "express";
import RestEntry from "../model/restEntry.js";
import dayjs from "dayjs";
const router = Router();

// Create a new Entry
router.post("/create-entry", async (req, res) => {
  try {
    const reqBody = req.body;

    const upad = JSON.parse(reqBody.upad);
    const pending = JSON.parse(reqBody.pending);
    const expenses = JSON.parse(reqBody.expenses);
    const pendingUsers = JSON.parse(reqBody.pendingUsers);

    const entry = await RestEntry.create({
      upad,
      pending,
      expenses,
      pendingUsers,
      extraAmount: reqBody.extraAmount,
      totalUpad: reqBody.totalUpad,
      totalPending: reqBody.totalPending,
      totalExpenses: reqBody.totalExpenses,
      totalCard: reqBody.totalCard,
      totalPP: reqBody.totalPP,
      totalCash: reqBody.totalCash,
      grandTotal: reqBody.grandTotal,
      computerAmount: reqBody.computerAmount,
      date: reqBody.date,
      createDate: reqBody.createDate,
      updatedDateTime: reqBody.updatedDateTime,
    });

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Entry By Date
router.get("/get-entry/:date", async (req, res) => {
  try {
    const createDate = req.params.date;
    const entry = await RestEntry.findOne({
      createDate,
    });

    if (!entry) {
      return res.status(200).json({
        success: true,
        data: [],
      });
    }

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update Entry
router.put("/update-entry/:date", async (req, res) => {
  try {
    const createDate = req.params.date;
    const reqBody = req.body;

    const upad = JSON.parse(reqBody.upad);
    const pending = JSON.parse(reqBody.pending);
    const expenses = JSON.parse(reqBody.expenses);

    const entry = await RestEntry.findOneAndUpdate(
      { createDate },
      {
        upad,
        pending,
        expenses,
        extraAmount: reqBody.extraAmount,
        totalUpad: reqBody.totalUpad,
        totalPending: reqBody.totalPending,
        totalExpenses: reqBody.totalExpenses,
        totalCard: reqBody.totalCard,
        totalPP: reqBody.totalPP,
        totalCash: reqBody.totalCash,
        grandTotal: reqBody.grandTotal,
        date: reqBody.date,
        createDate: reqBody.createDate,
        updatedDateTime: reqBody.updatedDateTime,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: entry,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete Entry
router.delete("/delete-entry/:date", async (req, res) => {
  try {
    const createDate = req.params.date;
    const entry = await RestEntry.findOneAndDelete({ createDate });

    res.status(200).json({
      success: true,
      data: entry,
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

    const entries = await RestEntry.find({
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

// Get Upad Entries by Date Range
router.get("/get-upad-entries/:startDate/:endDate", async (req, res) => {
  try {
    const start = dayjs(req.params.startDate, "DD-MM-YYYY");
    const end = dayjs(req.params.endDate, "DD-MM-YYYY");
    const entries = await RestEntry.find({
      entryCreateDate: {
        $gte: start.startOf("day").toDate(),
        $lte: end.endOf("day").toDate(),
      },
    });

    const upadEntries = entries.flatMap((entry) => entry.upad);

    res.status(200).json({
      success: true,
      data: upadEntries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Expenses Entries by Date Range
router.get("/get-expenses-entries/:startDate/:endDate", async (req, res) => {
  try {
    const start = dayjs(req.params.startDate, "DD-MM-YYYY");
    const end = dayjs(req.params.endDate, "DD-MM-YYYY");

    if (!start.isValid() || !end.isValid()) {
      return res.status(400).json({
        success: false,
        message: "Invalid date format. Please use DD-MM-YYYY.",
      });
    }

    // Fetch entries within the date range
    // const entries = await RestEntry.find({
    //   createdAt: { $gte: startDate, $lte: endDate },
    // });

    const entries = await RestEntry.find({
      entryCreateDate: {
        $gte: start.startOf("day").toDate(),
        $lte: end.endOf("day").toDate(),
      },
    }).sort({ entryCreateDate: 1 });

    const expensesEntries = entries.flatMap((entry) => entry.expenses);

    res.status(200).json({
      success: true,
      data: expensesEntries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get(
  "/get-entries-by-payment-method/:startDate/:endDate",
  async (req, res) => {
    try {
      const start = dayjs(req.params.startDate, "DD-MM-YYYY");
      const end = dayjs(req.params.endDate, "DD-MM-YYYY");

      const entries = await RestEntry.find(
        {
          entryCreateDate: {
            $gte: start.startOf("day").toDate(),
            $lte: end.endOf("day").toDate(),
          },
        },
        {
          _id: 1,
          totalCard: 1,
          totalPP: 1,
          totalCash: 1,
          grandTotal: 1,
          computerAmount: 1,
          createDate: 1,
        }
      );

      const entriesByPaymentMethod = entries.map((entry) => ({
        Card: entry.totalCard,
        PP: entry.totalPP,
        Cash: entry.totalCash,
        grandTotal: entry.grandTotal,
        computerAmount: entry.computerAmount,
        createDate: entry.createDate,
        _id: entry._id,
      }));

      res.status(200).json({
        success: true,
        data: entriesByPaymentMethod,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
