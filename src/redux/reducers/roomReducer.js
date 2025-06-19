import { createReducer } from "@reduxjs/toolkit";

const initialState = {
  rooms: [],
  loading: false,
  error: null,
};

const roomReducer = createReducer(initialState, (builder) => {
  builder
    .addCase("GetRoomsRequest", (state) => {
      state.loading = true;
    })
    .addCase("GetRoomsSuccess", (state, action) => {
      state.loading = false;
      state.rooms = action.payload;
    })
    .addCase("GetRoomsFailure", (state, action) => {
      state.loading = false;
      state.error = action.payload;
    });
});

export default roomReducer;
