import { Router } from "express";
import RestCategory from "../model/restCategory.js";
const router = Router();

// Create a new Category
router.post("/create-category", async (req, res) => {
  try {
    const reqBody = req.body;

    // Check if category name already exists
    const existingCategory = await RestCategory.findOne({
      categoryName: reqBody.categoryName,
    });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: "Category name already exists",
      });
    }

    const category = await RestCategory.create({
      categoryName: reqBody.categoryName,
      categoryDescription: reqBody.categoryDescription,
      expense: reqBody.expense,
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

// Get all Categories
router.get("/get-categories", async (req, res) => {
  try {
    const categories = await RestCategory.find();

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

// Get a Category - categoryName
router.get("/get-category-name", async (req, res) => {
  try {
    const categories = await RestCategory.find({}, { categoryName: 1 });

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

// Get All Expenses - Flattened Response
router.get("/get-expenses", async (req, res) => {
  try {
    const categories = await RestCategory.find({}, { expense: 1 });

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
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get a categoryName by expenseName
router.get("/get-category-name/:id", async (req, res) => {
  try {
    const category = await RestCategory.findOne({
      "expense._id": req.params.id,
    });

    res.status(200).json({
      success: true,
      data: category?.categoryName || "",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update a Category
router.put("/update-category/:id", async (req, res) => {
  try {
    const reqBody = req.body;

    const category = await RestCategory.findByIdAndUpdate(
      req.params.id,
      {
        categoryName: reqBody.categoryName,
        categoryDescription: reqBody.categoryDescription,
        expense: reqBody.expense,
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
    const category = await RestCategory.findByIdAndDelete(req.params.id);

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
