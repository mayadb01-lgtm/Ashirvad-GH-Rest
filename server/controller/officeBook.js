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
          item.amount && item.fullname && item.category && item.modeOfPayment
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
          item.amount && item.fullname && item.category && item.modeOfPayment
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

    // Check if category name already exists
    const existingCategory = await OfficeCategory.findOne({
      categoryName: reqBody.categoryName,
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category name already exists",
      });
    }

    const category = await OfficeCategory.create({
      categoryName: reqBody.categoryName,
      categoryDescription: reqBody.categoryDescription,
    });

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get All Categories
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

// Update Category
router.put("/update-category/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;
    const reqBody = req.body;

    const category = await OfficeCategory.findByIdAndUpdate(
      categoryId,
      {
        categoryName: reqBody.categoryName,
        categoryDescription: reqBody.categoryDescription,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete a Category
router.delete("/delete-category/:id", async (req, res) => {
  try {
    const categoryId = req.params.id;
    const category = await OfficeCategory.findByIdAndDelete(categoryId);

    res.status(200).json({
      success: true,
      data: category,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
