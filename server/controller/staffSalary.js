import { Router } from "express";
import dayjs from "dayjs";
import StaffSalary from "../model/staffSalary.js";
import RestEntry from "../model/restEntry.js";
import OfficeBook from "../model/officeBook.js";
const router = Router();

// Category and Expense Names are fixed - used as the matching condition for
// "Salary and Overtime" entries in both the Restaurant Expense Table and the
// Office Table (Office Out).
const SALARY_AND_OVERTIME_CATEGORY = "Staff";

const isSalaryOrOvertimeExpense = (categoryName, expenseName) =>
  categoryName?.trim() === SALARY_AND_OVERTIME_CATEGORY;

// Create Salary Sheet
router.post("/create-salary-sheet", async (req, res) => {
  try {
    // Body
    const { month, year, rows, remarks } = req.body;

    // Validate Body
    if (!month || !year || !rows) {
      return res.status(400).json({
        success: false,
        message: "month, year, rows and remarks are required",
      });
    }
    // Skip - Month and Year Validation
    // Validate Rows
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "rows must be a non-empty array",
      });
    }
    // Validate Remarks
    if (typeof remarks !== "string") {
      return res.status(400).json({
        success: false,
        message: "remarks must be a string",
      });
    }

    // Only persist editable fields; calculated fields are derived on the client
    const editableRows = rows.map(
      ({
        staffId,
        fullname,
        perDayPay,
        attendance,
        salaryPaid,
        salaryPaidAmount,
      }) => ({
        staffId,
        fullname,
        perDayPay,
        attendance,
        salaryPaid: Boolean(salaryPaid),
        salaryPaidAmount: Number(salaryPaidAmount) || 0,
      })
    );

    // Create Salary Sheet
    const salarySheet = await StaffSalary.create({
      month,
      year,
      rows: editableRows,
      remarks,
    });

    // Return Response
    res.status(200).json({
      success: true,
      data: salarySheet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Salary Sheet by Month and Year
router.get("/get-salary-sheet/:month/:year", async (req, res) => {
  try {
    const month = Number(req.params.month);
    const year = Number(req.params.year);

    const salarySheet = await StaffSalary.findOne({ month, year });

    if (!salarySheet) {
      return res.status(404).json({
        success: false,
        message: "Salary sheet not found for the given month and year",
      });
    }

    res.status(200).json({
      success: true,
      data: salarySheet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Salary Sheets by Month Range (Start Month, End Month)
router.get(
  "/get-salary-sheets-by-month-range/:startDate/:endDate",
  async (req, res) => {
    try {
      const start = dayjs(req.params.startDate, "DD-MM-YYYY").startOf("month");
      const end = dayjs(req.params.endDate, "DD-MM-YYYY").startOf("month");

      // Build an explicit list of { month, year } pairs for every month in the
      // range so the query stays correct across year boundaries.
      const monthYearPairs = [];
      let cursor = start;
      while (cursor.isBefore(end) || cursor.isSame(end, "month")) {
        monthYearPairs.push({
          month: cursor.month() + 1,
          year: cursor.year(),
        });
        cursor = cursor.add(1, "month");
      }

      const salarySheets = monthYearPairs.length
        ? await StaffSalary.find({ $or: monthYearPairs }).sort({
            year: 1,
            month: 1,
          })
        : [];

      res.status(200).json({
        success: true,
        data: salarySheets,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Update Salary Sheet rows by Month and Year
router.put("/update-salary-sheet/:month/:year", async (req, res) => {
  try {
    const month = Number(req.params.month);
    const year = Number(req.params.year);
    const { rows, remarks } = req.body;

    // Only persist editable fields; calculated fields are derived on the client
    const editableRows = rows.map(
      ({
        staffId,
        fullname,
        perDayPay,
        attendance,
        salaryPaid,
        salaryPaidAmount,
      }) => ({
        staffId,
        fullname,
        perDayPay,
        attendance,
        salaryPaid: Boolean(salaryPaid),
        salaryPaidAmount: Number(salaryPaidAmount) || 0,
      })
    );

    const salarySheet = await StaffSalary.findOneAndUpdate(
      { month, year },
      {
        rows: editableRows,
        remarks: remarks || "",
        updatedDate: new Date().toLocaleDateString(),
        updatedDateTime: new Date(),
      },
      { new: true }
    );

    if (!salarySheet) {
      return res.status(404).json({
        success: false,
        message: "Salary sheet not found for the given month and year",
      });
    }

    res.status(200).json({
      success: true,
      data: salarySheet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete Salary Sheet by Month and Year
router.delete("/delete-salary-sheet/:month/:year", async (req, res) => {
  try {
    const month = Number(req.params.month);
    const year = Number(req.params.year);

    const salarySheet = await StaffSalary.findOneAndDelete({ month, year });

    res.status(200).json({
      success: true,
      data: salarySheet,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get Salary and Overtime by Month Range (Start Date, End Date - DD-MM-YYYY)
// NOTE: This is informational-only data (not persisted, not used in any
// salary/balance calculation). "Salary and Overtime" is paid out via two
// sources, both matched by their fixed Category + Expense Name:
//   1. Restaurant Expense Table (RestEntry.expenses)
//   2. Office Table - Office Out (OfficeBook.officeOut)
// Both are attributed to a staff member via fullname_id and summed together,
// grouped by "YYYY-MM" -> { staffId: amount }, matching the shape used by
// staffTotalUpaad / officeBookCategoryUpaad above.
router.get(
  "/get-salary-and-overtime-by-month-range/:startDate/:endDate",
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

      const start = dayjs(req.params.startDate, "DD-MM-YYYY");
      const end = dayjs(req.params.endDate, "DD-MM-YYYY");

      const dateRangeQuery = {
        entryCreateDate: {
          $gte: start.startOf("day").toDate(),
          $lte: end.endOf("day").toDate(),
        },
      };

      const [restEntries, officeEntries] = await Promise.all([
        RestEntry.find(dateRangeQuery, {
          expenses: 1,
          entryCreateDate: 1,
        }),
        OfficeBook.find(dateRangeQuery, {
          officeOut: 1,
          entryCreateDate: 1,
        }),
      ]);

      // Group by "YYYY-MM" first, keeping staffId totals inside each month
      const salaryAndOvertimeByMonth = {};

      const addToMonth = (entryCreateDate, items) => {
        const monthKey = dayjs(entryCreateDate).format("YYYY-MM");

        items.forEach((item) => {
          if (!isSalaryOrOvertimeExpense(item.categoryName, item.expenseName))
            return;

          const staffId = item.fullname_id?.trim();
          if (!staffId) return;

          if (!salaryAndOvertimeByMonth[monthKey]) {
            salaryAndOvertimeByMonth[monthKey] = {};
          }

          salaryAndOvertimeByMonth[monthKey][staffId] =
            (salaryAndOvertimeByMonth[monthKey][staffId] || 0) +
            (item.amount || 0);
        });
      };

      restEntries.forEach((entry) =>
        addToMonth(entry.entryCreateDate, entry.expenses || [])
      );
      officeEntries.forEach((entry) =>
        addToMonth(entry.entryCreateDate, entry.officeOut || [])
      );

      res.status(200).json({
        success: true,
        data: salaryAndOvertimeByMonth,
      });
    } catch (error) {
      console.error("Get Salary and Overtime by Month Range Error:", error);
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
