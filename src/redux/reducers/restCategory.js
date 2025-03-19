import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  restCategory: [],
  restCategoryName: [],
  restExpenseName: [],
  singleCategoryName: "",
  loading: false,
  error: null,
};

const restCategoryReducer = createReducer(initialState, (builder) => {
  builder
    .addCase("CreateRestCategoryRequest", (state) => {
      state.loading = true;
    })
    .addCase("CreateRestCategorySuccess", (state, action) => {
      state.loading = false;
      state.restCategory = [...state.restCategory, action.payload];
    })
    .addCase("CreateRestCategoryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Categories
    .addCase("GetRestCategoryRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRestCategorySuccess", (state, action) => {
      state.loading = false;
      state.restCategory = action.payload;
    })
    .addCase("GetRestCategoryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restCategory = [];
    })
    // Get Category - categoryName
    .addCase("GetRestCategoryNameRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRestCategoryNameSuccess", (state, action) => {
      state.loading = false;
      state.restCategoryName = action.payload;
    })
    .addCase("GetRestCategoryNameFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restCategoryName = [];
    })
    // Get Expenses - expenseName
    .addCase("GetRestExpenseNameRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRestExpenseNameSuccess", (state, action) => {
      state.loading = false;
      state.restExpenseName = action.payload;
    })
    .addCase("GetRestExpenseNameFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restExpenseName = [];
    })
    // Get categoryName by expenseName (_id)
    .addCase("GetCategoryNameByExpenseRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetCategoryNameByExpenseSuccess", (state, action) => {
      state.loading = false;
      state.singleCategoryName = action.payload;
    })
    .addCase("GetCategoryNameByExpenseFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.singleCategoryName = [];
    })
    // Update Category
    .addCase("UpdateRestCategoryRequest", (state) => {
      state.loading = true;
    })
    .addCase("UpdateRestCategorySuccess", (state, action) => {
      state.loading = false;
      state.restCategory = state.restCategory.map((category) =>
        category._id === action.payload._id ? action.payload : category
      );
    })
    .addCase("UpdateRestCategoryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Remove Category
    .addCase("RemoveRestCategoryRequest", (state) => {
      state.loading = true;
    })
    .addCase("RemoveRestCategorySuccess", (state, action) => {
      state.loading = false;
      state.restCategory = state.restCategory.filter(
        (category) => category._id !== action.payload
      );
    })
    .addCase("RemoveRestCategoryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
});

export default restCategoryReducer;
