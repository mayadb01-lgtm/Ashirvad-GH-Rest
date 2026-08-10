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
      entryCreateDate: reqBody.entryCreateDate,
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
    const pendingUsers = JSON.parse(reqBody.pendingUsers);
    const expenses = JSON.parse(reqBody.expenses);

    const entry = await RestEntry.findOneAndUpdate(
      { createDate },
      {
        upad,
        pending,
        pendingUsers,
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
        entryCreateDate: reqBody.entryCreateDate,
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

// Get Aapvana Entries by Date Range
router.get("/get-aapvana-entries/:startDate/:endDate", async (req, res) => {
  try {
    const start = dayjs(req.params.startDate, "DD-MM-YYYY");
    const end = dayjs(req.params.endDate, "DD-MM-YYYY");
    const entries = await RestEntry.find({
      entryCreateDate: {
        $gte: start.startOf("day").toDate(),
        $lte: end.endOf("day").toDate(),
      },
    });

    const aapvanaEntries = entries.flatMap((entry) => entry.pendingUsers);

    res.status(200).json({
      success: true,
      data: aapvanaEntries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Levana Entries by Date Range
router.get("/get-levana-entries/:startDate/:endDate", async (req, res) => {
  try {
    const start = dayjs(req.params.startDate, "DD-MM-YYYY");
    const end = dayjs(req.params.endDate, "DD-MM-YYYY");
    const entries = await RestEntry.find({
      entryCreateDate: {
        $gte: start.startOf("day").toDate(),
        $lte: end.endOf("day").toDate(),
      },
    });

    const levanaEntries = entries.flatMap((entry) => entry.pending);

    res.status(200).json({
      success: true,
      data: levanaEntries,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Expenses Entries by Date Range
// router.get("/get-expenses-entries/:startDate/:endDate", async (req, res) => {
//   try {
//     const start = dayjs(req.params.startDate, "DD-MM-YYYY");
//     const end = dayjs(req.params.endDate, "DD-MM-YYYY");

//     if (!start.isValid() || !end.isValid()) {
//       return res.status(400).json({
//         success: false,
//         message: "Invalid date format. Please use DD-MM-YYYY.",
//       });
//     }

//     const entries = await RestEntry.find({
//       entryCreateDate: {
//         $gte: start.startOf("day").toDate(),
//         $lte: end.endOf("day").toDate(),
//       },
//     }).sort({ entryCreateDate: 1 });

//     const expensesEntries = entries.flatMap((entry) => entry.expenses);

//     res.status(200).json({
//       success: true,
//       data: expensesEntries,
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// });

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
          entryCreateDate: 1,
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
        entryCreateDate: entry.entryCreateDate,
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

// Get Staff Upaad by Month (StaffID, Month, Year)
router.get("/get-staff-total-upaad-by-month/:month/:year", async (req, res) => {
  try {
    const month = parseInt(req.params.month, 10);
    const year = parseInt(req.params.year, 10);
    const startDate = dayjs(`${year}-${month}-01`).startOf("month").toDate();
    const endDate = dayjs(`${year}-${month}-01`).endOf("month").toDate();

    const entries = await RestEntry.find(
      {
        entryCreateDate: {
          $gte: startDate,
          $lte: endDate,
        },
      },
      {
        upad: 1,
      }
    );

    const staffUpaadEntries = entries.flatMap((entry) => entry.upad);

    const staffTotalUpaad = staffUpaadEntries.reduce((acc, upad) => {
      acc[upad._id] = (acc[upad._id] || 0) + (upad.amount || 0);
      return acc;
    }, {});

    res.status(200).json({
      success: true,
      data: staffTotalUpaad,
    });
  } catch (error) {
    console.error("Get Staff Upaad by Month Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get(
  "/get-staff-total-upaad-by-month-range/:startDate/:endDate",
  async (req, res) => {
    try {
      if (
        !dayjs(req.params.startDate, "DD-MM-YYYY", true).isValid() ||
        !dayjs(req.params.endDate, "DD-MM-YYYY", true).isValid()
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use DD-MM-YYYY.",
        });
      }

      const startDate = dayjs(req.params.startDate, "DD-MM-YYYY");
      const endDate = dayjs(req.params.endDate, "DD-MM-YYYY");

      const entries = await RestEntry.find(
        {
          entryCreateDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        {
          upad: 1,
          entryCreateDate: 1,
        }
      );

      // Group by "YYYY-MM" first, keeping staffId totals inside each month
      const staffTotalUpaadByMonth = entries.reduce((acc, entry) => {
        const monthKey = dayjs(entry.entryCreateDate).format("YYYY-MM");

        if (!acc[monthKey]) {
          acc[monthKey] = {};
        }

        (entry.upad || []).forEach((upad) => {
          acc[monthKey][upad._id] =
            (acc[monthKey][upad._id] || 0) + (upad.amount || 0);
        });

        return acc;
      }, {});

      res.status(200).json({
        success: true,
        data: staffTotalUpaadByMonth,
      });
    } catch (error) {
      console.error("Get Staff Upaad by Month Range Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

export default router;
