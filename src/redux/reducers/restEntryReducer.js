import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  restEntries: [],
  restPendingNameOptions: [],
  loading: false,
  error: null,
};

const restEntryReducer = createReducer(initialState, (builder) => {
  builder
    .addCase("CreateRestEntriesRequest", (state) => {
      state.loading = true;
    })
    .addCase("CreateRestEntriesSuccess", (state, action) => {
      state.loading = false;
      state.restEntries = [...state.restEntries, action.payload];
    })
    .addCase("CreateRestEntriesFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Entries By Date
    .addCase("GetRestEntriesByDateRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRestEntriesByDateSuccess", (state, action) => {
      state.loading = false;
      state.restEntries = action.payload;
    })
    .addCase("GetRestEntriesByDateFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restEntries = [];
    })
    // Get Entries By Date Range
    .addCase("GetRestEntriesByDateRangeRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRestEntriesByDateRangeSuccess", (state, action) => {
      state.loading = false;
      state.restEntries = action.payload;
    })
    .addCase("GetRestEntriesByDateRangeFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restEntries = [];
    })
    // Update Entry
    .addCase("UpdateRestEntryRequest", (state) => {
      state.loading = true;
    })
    .addCase("UpdateRestEntrySuccess", (state, action) => {
      state.loading = false;
      state.restEntries = action.payload;
    })
    .addCase("UpdateRestEntryFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Upaad Entry By Date Range
    .addCase("GetUpadByDateRangeRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetUpadByDateRangeSuccess", (state, action) => {
      state.loading = false;
      state.restEntries = action.payload;
    })
    .addCase("GetUpadByDateRangeFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restEntries = [];
    })
    // Get Expense Entry By Date
    .addCase("GetExpensesByDateRangeRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetExpensesByDateRangeSuccess", (state, action) => {
      state.loading = false;
      state.restEntries = action.payload;
    })
    .addCase("GetExpensesByDateRangeFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restEntries = [];
    })
    // Pending Entries - Name Options - Get Last 7 Days GH Entries - Users
    .addCase("GetPendingEntriesLastSevenDaysRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetPendingEntriesLastSevenDaysSuccess", (state, action) => {
      state.loading = false;
      state.restPendingNameOptions = action.payload;
    })
    .addCase("GetPendingEntriesLastSevenDaysFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restPendingNameOptions = [];
    })
    // Get Entries by Payment Method - Date Range
    .addCase("GetRestEntryByPaymentMethodRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRestEntryByPaymentMethodSuccess", (state, action) => {
      state.loading = false;
      state.restEntries = action.payload;
    })
    .addCase("GetRestEntryByPaymentMethodFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restEntries = [];
    });
});

export default restEntryReducer;
