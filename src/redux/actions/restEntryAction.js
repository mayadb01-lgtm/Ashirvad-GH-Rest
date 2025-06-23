import axios from "axios";
import toast from "react-hot-toast";

// Create Restaurant Entry
export const createRestEntry = (restEntryData) => async (dispatch) => {
  try {
    dispatch({ type: "CreateRestEntriesRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/create-entry`,
      restEntryData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Restaurant Entry created successfully", data);
    dispatch({ type: "CreateRestEntriesSuccess", payload: data.data });
    toast.success("Restaurant Entry created successfully");
  } catch (error) {
    dispatch({
      type: "CreateRestEntriesFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error);
  }
};

// Get Restaurant Entry by Date
export const getRestEntryByDate = (date) => async (dispatch) => {
  try {
    dispatch({ type: "GetRestEntriesByDateRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/get-entry/${date}`
    );
    console.log("Rest Entries fetched successfully", data);
    dispatch({ type: "GetRestEntriesByDateSuccess", payload: data.data });
    if (data.data.grandTotal > 0) {
      toast.success("Restaurant Entries fetched successfully");
    }
  } catch (error) {
    dispatch({
      type: "GetRestEntriesByDateFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Delete Restaurant Entry by Date
export const deleteRestEntryByDate = (date) => async (dispatch) => {
  try {
    dispatch({ type: "DeleteRestEntryRequest" });
    const { data } = await axios.delete(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/delete-entry/${date}`
    );
    console.log("Restaurant Entry deleted successfully", data);
    dispatch({ type: "DeleteRestEntrySuccess", payload: data.data });
    toast.success("Restaurant Entry deleted successfully");
  } catch (error) {
    dispatch({
      type: "DeleteRestEntryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Restaurant Entry by Date Range
export const getRestEntriesByDateRange =
  (startDate, endDate) => async (dispatch) => {
    try {
      dispatch({ type: "GetRestEntriesByDateRangeRequest" });
      const { data } = await axios.get(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/get-entries/${startDate}/${endDate}`
      );
      console.log("Rest Entries fetched successfully", data);
      dispatch({
        type: "GetRestEntriesByDateRangeSuccess",
        payload: data.data,
      });
    } catch (error) {
      dispatch({
        type: "GetRestEntriesByDateRangeFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

// Update Restaurant Entry by Date
export const updateRestEntryByDate =
  (date, restEntryData) => async (dispatch) => {
    try {
      dispatch({ type: "UpdateRestEntryRequest" });
      const { data } = await axios.put(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/update-entry/${date}`,
        restEntryData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Restaurant Entry updated successfully", data);
      dispatch({ type: "UpdateRestEntrySuccess", payload: data.data });
      toast.success("Restaurant Entry updated successfully");
    } catch (error) {
      dispatch({
        type: "UpdateRestEntryFailure",
        payload: error?.response?.data?.message || "An unknown error occurred",
      });

      toast.error(
        error?.response?.data?.message || "An unknown error occurred"
      );
    }
  };

// Get Upad by Date Range
export const getUpadByDateRange = (startDate, endDate) => async (dispatch) => {
  try {
    dispatch({ type: "GetUpadByDateRangeRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/get-upad-entries/${startDate}/${endDate}`
    );
    console.log("Upad fetched successfully", data);
    dispatch({ type: "GetUpadByDateRangeSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetUpadByDateRangeFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Aapvana By Date Range
export const getAapvanaByDateRange =
  (startDate, endDate) => async (dispatch) => {
    try {
      dispatch({ type: "GetAapvanaByDateRangeRequest" });
      const { data } = await axios.get(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/get-aapvana-entries/${startDate}/${endDate}`
      );
      console.log("Aapvana fetched successfully", data);
      dispatch({ type: "GetAapvanaByDateRangeSuccess", payload: data.data });
    } catch (error) {
      dispatch({
        type: "GetAapvanaByDateRangeFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

// Get Levana by Date Range
export const getLevanaByDateRange =
  (startDate, endDate) => async (dispatch) => {
    try {
      dispatch({ type: "GetLevanaByDateRangeRequest" });
      const { data } = await axios.get(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/get-levana-entries/${startDate}/${endDate}`
      );
      console.log("Levana fetched successfully", data);
      dispatch({ type: "GetLevanaByDateRangeSuccess", payload: data.data });
    } catch (error) {
      dispatch({
        type: "GetLevanaByDateRangeFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

// Get Expenses by Date Range
export const getExpensesByDateRange =
  (startDate, endDate) => async (dispatch) => {
    try {
      dispatch({ type: "GetExpensesByDateRangeRequest" });
      const { data } = await axios.get(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/get-expenses-entries/${startDate}/${endDate}`
      );
      console.log("Expenses fetched successfully", data);
      dispatch({ type: "GetExpensesByDateRangeSuccess", payload: data.data });
    } catch (error) {
      dispatch({
        type: "GetExpensesByDateRangeFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

// Get Name options from GH - Last 7 Days
export const getRestStaffGHLastSevenDays = () => async (dispatch) => {
  try {
    dispatch({ type: "GetPendingEntriesLastSevenDaysRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/aggregation/get-pending-rest`
    );
    console.log("GH Name with Staff Options fetched successfully", data);
    dispatch({
      type: "GetPendingEntriesLastSevenDaysSuccess",
      payload: data.data,
    });
  } catch (error) {
    dispatch({
      type: "GetPendingEntriesLastSevenDaysFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Entry by Payment Method - Date Range
export const getRestEntryByPaymentMethod =
  (startDate, endDate) => async (dispatch) => {
    try {
      dispatch({ type: "GetRestEntryByPaymentMethodRequest" });
      const { data } = await axios.get(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restEntry/get-entries-by-payment-method/${startDate}/${endDate}`
      );
      console.log("Entry by Payment Method fetched successfully", data);
      dispatch({
        type: "GetRestEntryByPaymentMethodSuccess",
        payload: data.data,
      });
    } catch (error) {
      dispatch({
        type: "GetRestEntryByPaymentMethodFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };
