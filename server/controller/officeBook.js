import { Router } from "express";
import dayjs from "dayjs";
import OfficeBook, { OfficeCategory } from "../model/officeBook.js";
import initPendingCategory from "../utils/initPendingCategory.js";
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
          item.fullname &&
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
      createDate: reqBody.createDate,
      modeOfPayment: reqBody.modeOfPayment,
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

    const entry = await OfficeBook.findOneAndUpdate(
      { createDate },
      {
        officeIn,
        officeOut,
        modeOfPayment: reqBody.modeOfPayment,
        fullname_id: reqBody?.fullname_id || "",
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
// Create a new Category
router.post("/create-category", async (req, res) => {
  try {
    const reqBody = req.body;

    // Do not allow creating Pending
    if (reqBody.categoryName === "Pending") {
      return res.status(400).json({
        success: false,
        message: "Pending category cannot be created manually",
      });
    }

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
    let categories = await OfficeCategory.find();

    // If no categories found
    if (categories.length === 0) {
      await initPendingCategory();
      categories = await OfficeCategory.find(); // refetch after creating
    } else if (!categories.some((c) => c.categoryName === "Pending")) {
      await initPendingCategory();
      categories = await OfficeCategory.find();
    }

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
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

    if (existingCategory.categoryName === "Pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot update the pending category",
      });
    }

    // Prevent setting categoryName to "Pending"
    if (categoryName === "Pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot set categoryName to Pending",
      });
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

    if (categoryToDelete.categoryName === "Pending") {
      return res.status(400).json({
        success: false,
        message: "Pending Category Cannot Be Deleted",
      });
    }

    await categoryToDelete.deleteOne();

    return res.status(200).json({ success: true, data: categoryToDelete });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
