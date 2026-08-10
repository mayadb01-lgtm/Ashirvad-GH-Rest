import { Router } from "express";
import dayjs from "dayjs";
import StaffSalary from "../model/staffSalary.js";
import RestStaff from "../model/restStaff.js";
const router = Router();

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

export default router;
