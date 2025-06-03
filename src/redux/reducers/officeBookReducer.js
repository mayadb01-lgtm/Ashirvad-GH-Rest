import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  officeBook: [],
  officeCategory: [],
  loading: false,
  error: null,
};

export const officeBookReducer = createReducer(initialState, (builder) => {
  builder
    .addCase("CreateOfficeEntryRequest", (state) => {
      state.loading = true;
    })
    .addCase("CreateOfficeEntrySuccess", (state, action) => {
      state.loading = false;
      state.officeBook = [...state.officeBook, action.payload];
    })
    .addCase("CreateOfficeEntryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Entries by Date
    .addCase("GetOfficeBookByDateRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetOfficeBookByDateSuccess", (state, action) => {
      state.loading = false;
      state.officeBook = action.payload;
    })
    .addCase("GetOfficeBookByDateFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.officeBook = [];
    })
    // Update Entry by Date
    .addCase("UpdateOfficeEntryRequest", (state) => {
      state.loading = true;
    })
    .addCase("UpdateOfficeEntrySuccess", (state, action) => {
      state.loading = false;
      state.officeBook = action.payload;
    })
    .addCase("UpdateOfficeEntryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Delete Entry by Date
    .addCase("DeleteOfficeEntryRequest", (state) => {
      state.loading = true;
    })
    .addCase("DeleteOfficeEntrySuccess", (state, action) => {
      state.loading = false;
      state.officeBook = action.payload;
    })
    .addCase("DeleteOfficeEntryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Entries by Date Range
    .addCase("GetOfficeBookByDateRangeRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetOfficeBookByDateRangeSuccess", (state, action) => {
      state.loading = false;
      state.officeBook = action.payload;
    })
    .addCase("GetOfficeBookByDateRangeFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.officeBook = [];
    })
    // Create a new Category - OfficeCategory
    .addCase("CreateOfficeCategoryRequest", (state) => {
      state.loading = true;
    })
    .addCase("CreateOfficeCategorySuccess", (state, action) => {
      state.loading = false;
      state.officeCategory = action.payload;
    })
    .addCase("CreateOfficeCategoryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get All Categories
    .addCase("GetOfficeAllCategoriesRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetOfficeAllCategoriesSuccess", (state, action) => {
      state.loading = false;
      state.officeCategory = action.payload;
    })
    .addCase("GetOfficeAllCategoriesFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.officeCategory = [];
    })
    // Update Category
    .addCase("UpdateOfficeCategoryRequest", (state) => {
      state.loading = true;
    })
    .addCase("UpdateOfficeCategorySuccess", (state, action) => {
      state.loading = false;
      state.officeCategory = action.payload;
    })
    .addCase("UpdateOfficeCategoryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.officeCategory = [];
    })
    // Delete Category
    .addCase("DeleteOfficeCategoryRequest", (state) => {
      state.loading = true;
    })
    .addCase("DeleteOfficeCategorySuccess", (state, action) => {
      state.loading = false;
      state.officeCategory = action.payload;
    })
    .addCase("DeleteOfficeCategoryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.officeCategory = [];
    });
});

export default officeBookReducer;
