import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  salarySheet: null,
  salarySheets: [],
  salarySheetNotFound: false,
  previousSalarySheet: null,
  previousSalarySheetNotFound: false,
  loading: false,
  error: null,
};

const staffSalaryReducer = createReducer(initialState, (builder) => {
  builder
    // Get Salary Sheet
    .addCase("GetSalarySheetRequest", (state) => {
      state.loading = true;
      state.salarySheetNotFound = false;
    })
    .addCase("GetSalarySheetSuccess", (state, action) => {
      state.loading = false;
      state.salarySheet = action.payload;
      state.salarySheetNotFound = false;
    })
    .addCase("GetSalarySheetNotFound", (state) => {
      state.loading = false;
      state.salarySheet = null;
      state.salarySheetNotFound = true;
    })
    .addCase("GetSalarySheetFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Previous Month Salary Sheet
    .addCase("GetPreviousSalarySheetRequest", (state) => {
      state.loading = true;
      state.previousSalarySheetNotFound = false;
    })
    .addCase("GetPreviousSalarySheetSuccess", (state, action) => {
      state.loading = false;
      state.previousSalarySheet = action.payload;
      state.previousSalarySheetNotFound = false;
    })
    .addCase("GetPreviousSalarySheetNotFound", (state) => {
      state.loading = false;
      state.previousSalarySheet = null;
      state.previousSalarySheetNotFound = true;
    })
    .addCase("GetPreviousSalarySheetFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Salary Sheets by Month Range
    .addCase("GetSalarySheetsByMonthRangeRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetSalarySheetsByMonthRangeSuccess", (state, action) => {
      state.loading = false;
      state.salarySheets = action.payload;
    })
    .addCase("GetSalarySheetsByMonthRangeFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.salarySheets = [];
    })
    // Create Salary Sheet
    .addCase("CreateSalarySheetRequest", (state) => {
      state.loading = true;
    })
    .addCase("CreateSalarySheetSuccess", (state, action) => {
      state.loading = false;
      state.salarySheet = action.payload;
      state.salarySheetNotFound = false;
    })
    .addCase("CreateSalarySheetFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Update Salary Sheet
    .addCase("UpdateSalarySheetRequest", (state) => {
      state.loading = true;
    })
    .addCase("UpdateSalarySheetSuccess", (state, action) => {
      state.loading = false;
      state.salarySheet = action.payload;
    })
    .addCase("UpdateSalarySheetFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Delete Salary Sheet
    .addCase("DeleteSalarySheetRequest", (state) => {
      state.loading = true;
    })
    .addCase("DeleteSalarySheetSuccess", (state) => {
      state.loading = false;
      state.salarySheet = null;
    })
    .addCase("DeleteSalarySheetFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
});

export default staffSalaryReducer;
