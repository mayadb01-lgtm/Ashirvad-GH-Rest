import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  restStaff: [],
  loading: false,
  error: null,
};

const restStaffReducer = createReducer(initialState, (builder) => {
  builder
    .addCase("CreateRestStaffRequest", (state) => {
      state.loading = true;
    })
    .addCase("CreateRestStaffSuccess", (state, action) => {
      state.loading = false;
      state.restStaff = [...state.restStaff, action.payload];
    })
    .addCase("CreateRestStaffFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Staff - ID, Name, Mobile
    .addCase("GetRestStaffRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRestStaffSuccess", (state, action) => {
      state.loading = false;
      state.restStaff = action.payload;
    })
    .addCase("GetRestStaffFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restStaff = [];
    })
    // Update Staff
    .addCase("UpdateRestStaffRequest", (state) => {
      state.loading = true;
    })
    .addCase("UpdateRestStaffSuccess", (state, action) => {
      state.loading = false;
      state.restStaff = state.restStaff.map((staff) =>
        staff._id === action.payload._id ? action.payload : staff
      );
    })
    .addCase("UpdateRestStaffFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Remove Staff
    .addCase("RemoveRestStaffRequest", (state) => {
      state.loading = true;
    })
    .addCase("RemoveRestStaffSuccess", (state, action) => {
      state.loading = false;
      state.restStaff = state.restStaff.filter(
        (staff) => staff._id !== action.payload
      );
    })
    .addCase("RemoveRestStaffFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
});

export default restStaffReducer;
