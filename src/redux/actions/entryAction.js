import axios from "axios";
import toast from "react-hot-toast";

// Create Entry
export const createEntry = (entryData) => async (dispatch) => {
  try {
    dispatch({ type: "CreateEntryRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/entry/create-entry`,
      entryData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Entry created successfully", data);
    dispatch({ type: "CreateEntrySuccess", payload: data.entry });
    toast.success("Entry created successfully");
  } catch (error) {
    dispatch({
      type: "CreateEntryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Entries by Date
export const getEntriesByDate = (date) => async (dispatch) => {
  try {
    dispatch({ type: "GetEntriesRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/entry/get-entry/${date}`
    );
    console.log("Entries fetched successfully", data);
    dispatch({ type: "GetEntriesSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetEntriesFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Entries by Date Range
export const getEntriesByDateRange =
  (startDate, endDate) => async (dispatch) => {
    try {
      dispatch({ type: "GetEntriesRequest" });
      const { data } = await axios.get(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/entry/get-entries/${startDate}/${endDate}`
      );
      console.log("Entries fetched successfully", data);
      dispatch({ type: "GetEntriesSuccess", payload: data.data });
    } catch (error) {
      dispatch({
        type: "GetEntriesFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

// Update Entry by Date
export const updateEntryByDate = (date, entryData) => async (dispatch) => {
  try {
    dispatch({ type: "UpdateEntryRequest" });
    const { data } = await axios.put(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/entry/update-entry/${date}`,
      entryData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Entry updated successfully", data);
    dispatch({ type: "UpdateEntrySuccess", payload: data.data });
    toast.success("Entry updated successfully");
  } catch (error) {
    dispatch({
      type: "UpdateEntryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get UnPaid Entries
export const getUnPaidEntries = () => async (dispatch) => {
  try {
    dispatch({ type: "GetUnPaidEntriesRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/entry/get-unpaid-entries`
    );
    console.log("UnPaid Entries fetched successfully", data);
    dispatch({ type: "GetUnPaidEntriesSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetUnPaidEntriesFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};
