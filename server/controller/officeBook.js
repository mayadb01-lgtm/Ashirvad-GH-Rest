import { Router } from "express";
import dayjs from "dayjs";
import OfficeBook, { OfficeCategory } from "../model/officeBook.js";
const router = Router();

// Create a new Entry
router.post("/create-entry", async (req, res) => {
  try {
    const reqBody = req.body;

    const officeIn = JSON.parse(reqBody.officeIn);
    const officeOut = JSON.parse(reqBody.officeOut);

    const validateEntries = (entries) =>
      entries.every(
        (item) =>
          item.amount &&
          item._id &&
          item.categoryName &&
          item.expenseName &&
          item.modeOfPayment
      );

    if (officeIn && !validateEntries(officeIn)) {
      return res.status(400).json({
        success: false,
        message: "Office In - Validation Failed",
      });
    }

    if (officeOut && !validateEntries(officeOut)) {
      return res.status(400).json({
        success: false,
        message: "Office Out - Validation Failed",
      });
    }

    const entry = await OfficeBook.create({
      officeIn,
      officeOut,
      createDate: reqBody.createDate || "",
      modeOfPayment: reqBody.modeOfPayment || "",
      fullname_id: reqBody?.fullname_id || "",
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

// Get Entry by Date
router.get("/get-entry/:date", async (req, res) => {
  try {
    const createDate = req.params.date;
    const entry = await OfficeBook.findOne({
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

// Update Entry by Date
router.put("/update-entry/:date", async (req, res) => {
  try {
    const createDate = req.params.date;
    const reqBody = req.body;

    const officeIn = JSON.parse(reqBody.officeIn);
    const officeOut = JSON.parse(reqBody.officeOut);

    const validateEntries = (entries) =>
      entries.every(
        (item) =>
          item.amount &&
          item.fullname &&
          item.categoryName &&
          item.expenseName &&
          item.modeOfPayment &&
          item.createDate
      );

    if (officeIn && !validateEntries(officeIn)) {
      return res.status(400).json({
        success: false,
        message: "Office In - Validation Failed",
      });
    }

    if (officeOut && !validateEntries(officeOut)) {
      return res.status(400).json({
        success: false,
        message: "Office Out - Validation Failed",
      });
    }

    const entry = await OfficeBook.findOneAndUpdate(
      { createDate },
      {
        officeIn: officeIn?.map((item) => {
          return {
            ...item,
            entryCreateDate: reqBody.entryCreateDate || "",
            updatedDate: reqBody.updatedDate || "",
          };
        }),
        officeOut: officeOut?.map((item) => {
          return {
            ...item,
            entryCreateDate: reqBody.entryCreateDate || "",
            updatedDate: reqBody.updatedDate || "",
          };
        }),
        createDate: createDate || "",
        entryCreateDate: reqBody.entryCreateDate || "",
        updatedDate: reqBody.updatedDate || "",
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

//  Delete Entry by Date
router.delete("/delete-entry/:date", async (req, res) => {
  try {
    const createDate = req.params.date;
    const entry = await OfficeBook.findOneAndDelete({ createDate });

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

    const entries = await OfficeBook.find({
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

// OfficeCategory Controller
// Create a new Category// Create a new Category
router.post("/create-category", async (req, res) => {
  try {
    const reqBody = req.body;

    const existingCategory = await OfficeCategory.findOne({
      categoryName: reqBody.categoryName,
    });
    if (existingCategory) {
      return res
        .status(400)
        .json({ success: false, message: "Category name already exists" });
    }

    const category = await OfficeCategory.create({
      categoryName: reqBody.categoryName,
      categoryDescription: reqBody.categoryDescription,
      expense: reqBody.expense,
    });

    return res.status(200).json({ success: true, data: category });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get all Categories

router.get("/get-categories", async (req, res) => {
  try {
    const categories = await OfficeCategory.find();
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get category names only
router.get("/get-category-name", async (req, res) => {
  try {
    const categories = await OfficeCategory.find({}, { categoryName: 1 });
    res.status(200).json({
      success: true,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get All Expenses - Flattened
router.get("/get-expenses", async (req, res) => {
  try {
    const categories = await OfficeCategory.find({}, { expense: 1 });

    const allExpenses = categories.flatMap((category) =>
      category.expense.map((exp) => ({
        _id: exp._id,
        expenseName: exp.expenseName,
      }))
    );

    res.status(200).json({
      success: true,
      data: allExpenses,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get a category name by expense ID
router.get("/get-category-name/:id", async (req, res) => {
  try {
    const category = await OfficeCategory.findOne({
      "expense._id": req.params.id,
    });

    res.status(200).json({
      success: true,
      data: category?.categoryName || "",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Category
router.put("/update-category/:id", async (req, res) => {
  try {
    const { categoryName, categoryDescription, expense } = req.body;
    const existingCategory = await OfficeCategory.findById(req.params.id);

    if (!existingCategory) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    existingCategory.categoryName =
      categoryName ?? existingCategory.categoryName;
    existingCategory.categoryDescription =
      categoryDescription ?? existingCategory.categoryDescription;
    existingCategory.expense = expense ?? existingCategory.expense;

    const updatedCategory = await existingCategory.save();

    return res.status(200).json({ success: true, data: updatedCategory });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Delete Category
router.delete("/delete-category/:id", async (req, res) => {
  try {
    const categoryToDelete = await OfficeCategory.findById(req.params.id);

    if (!categoryToDelete) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    await categoryToDelete.deleteOne();

    return res.status(200).json({ success: true, data: categoryToDelete });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Get Office Book Category Upaad by Month and Year// Get Office Staff Upaad by Month (Month, Year)
router.get(
  "/get-category-upaad-by-month-and-year/:month/:year",
  async (req, res) => {
    try {
      const month = parseInt(req.params.month, 10);
      const year = parseInt(req.params.year, 10);
      const startDate = dayjs(`${year}-${month}-01`).startOf("month").toDate();
      const endDate = dayjs(`${year}-${month}-01`).endOf("month").toDate();

      const entries = await OfficeBook.find(
        {
          entryCreateDate: {
            $gte: startDate,
            $lte: endDate,
          },
        },
        {
          officeOut: 1,
        }
      );

      const officeBookCategoryUpaadEntries = entries.flatMap((entry) =>
        entry.officeOut.filter(
          (item) =>
            item.categoryName &&
            item.categoryName.match(/upad|upaad|Upad|Upaad|staff|Staff/i)
        )
      );

      const officeBookCategoryUpaad = officeBookCategoryUpaadEntries.reduce(
        (acc, item) => {
          const staffName = item.fullname_id?.trim();

          if (!staffName) {
            return acc;
          }

          acc[staffName] = (acc[staffName] || 0) + (item.amount || 0);

          return acc;
        },
        {}
      );

      res.status(200).json({
        success: true,
        data: officeBookCategoryUpaad,
      });
    } catch (error) {
      console.error("Get Office Staff Upaad Error:", error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// Get Office Book Category Upaad by Month Range (Start Month, End Month) - grouped by Month
router.get(
  "/get-category-upaad-by-month-range/:startDate/:endDate",
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

      const entries = await OfficeBook.find(
        {
          entryCreateDate: {
            $gte: start.startOf("day").toDate(),
            $lte: end.endOf("day").toDate(),
          },
        },
        {
          officeOut: 1,
          entryCreateDate: 1,
        }
      );

      // Group by "YYYY-MM" first, keeping staffName totals inside each month
      const officeBookCategoryUpaadByMonth = entries.reduce((acc, entry) => {
        const monthKey = dayjs(entry.entryCreateDate).format("YYYY-MM");

        const matchingItems = (entry.officeOut || []).filter(
          (item) =>
            item.categoryName &&
            item.categoryName.match(/upad|upaad|Upad|Upaad|staff|Staff/i)
        );

        if (matchingItems.length === 0) {
          return acc;
        }

        if (!acc[monthKey]) {
          acc[monthKey] = {};
        }

        matchingItems.forEach((item) => {
          const staffName = item.fullname_id?.trim();
          if (!staffName) return;

          acc[monthKey][staffName] =
            (acc[monthKey][staffName] || 0) + (item.amount || 0);
        });

        return acc;
      }, {});

      console.log(
        "Office Book Category Upaad by Month Range:",
        officeBookCategoryUpaadByMonth
      );

      res.status(200).json({
        success: true,
        data: officeBookCategoryUpaadByMonth,
      });
    } catch (error) {
      console.error(
        "Get Office Book Category Upaad by Month Range Error:",
        error
      );
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;
