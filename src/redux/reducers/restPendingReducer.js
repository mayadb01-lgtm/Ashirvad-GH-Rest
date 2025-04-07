import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  restPending: [],
  loading: false,
  error: null,
};

const restPendingReducer = createReducer(initialState, (builder) => {
  builder
    .addCase("CreateRestPendingRequest", (state) => {
      state.loading = true;
    })
    .addCase("CreateRestPendingSuccess", (state, action) => {
      state.loading = false;
      state.restPending = [...state.restPending, action.payload];
    })
    .addCase("CreateRestPendingFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Pending
    .addCase("GetRestPendingRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRestPendingSuccess", (state, action) => {
      state.loading = false;
      state.restPending = action.payload;
    })
    .addCase("GetRestPendingFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restPending = [];
    })
    // Update Pending
    .addCase("UpdateRestPendingRequest", (state) => {
      state.loading = true;
    })
    .addCase("UpdateRestPendingSuccess", (state, action) => {
      state.loading = false;
      state.restPending = state.restPending.map((pending) =>
        pending._id === action.payload._id ? action.payload : pending
      );
    })
    .addCase("UpdateRestPendingFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Remove Pending
    .addCase("RemoveRestPendingRequest", (state) => {
      state.loading = true;
    })
    .addCase("RemoveRestPendingSuccess", (state, action) => {
      state.loading = false;
      state.restPending = state.restPending.filter(
        (pending) => pending._id !== action.payload
      );
    })
    .addCase("RemoveRestPendingFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    })
    // Get Pending Users - fullname
    .addCase("GetRestPendingUsersFullNameRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRestPendingUsersFullNameSuccess", (state, action) => {
      state.loading = false;
      state.restPending = action.payload;
    })
    .addCase("GetRestPendingUsersFullNameFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
      state.restPending = [];
    });
});

export default restPendingReducer;
