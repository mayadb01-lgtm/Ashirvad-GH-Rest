import axios from "axios";
import toast from "react-hot-toast";

// Get Salary Sheet by Month and Year
export const getSalarySheet = (month, year) => async (dispatch) => {
  try {
    dispatch({ type: "GetSalarySheetRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/staffSalary/get-salary-sheet/${month}/${year}`
    );
    console.log("Salary Sheet fetched successfully", data);
    dispatch({ type: "GetSalarySheetSuccess", payload: data.data });
  } catch (error) {
    if (error?.response?.status === 404) {
      dispatch({ type: "GetSalarySheetNotFound" });
    } else {
      dispatch({
        type: "GetSalarySheetFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  }
};

// Get Previous Month Salary Sheet (used to look up previous month's salary paid amount)
export const getPreviousMonthSalarySheet =
  (month, year) => async (dispatch) => {
    try {
      dispatch({ type: "GetPreviousSalarySheetRequest" });
      const { data } = await axios.get(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/staffSalary/get-salary-sheet/${month}/${year}`
      );
      dispatch({ type: "GetPreviousSalarySheetSuccess", payload: data.data });
    } catch (error) {
      if (error?.response?.status === 404) {
        dispatch({ type: "GetPreviousSalarySheetNotFound" });
      } else {
        dispatch({
          type: "GetPreviousSalarySheetFailure",
          payload: error?.response?.data?.message,
        });
        console.log("Error Catch", error?.response?.data?.message);
      }
    }
  };

// Get Salary Sheets by Month Range (Start Date, End Date - DD-MM-YYYY)
export const getSalarySheetsByMonthRange =
  (startDate, endDate) => async (dispatch) => {
    try {
      dispatch({ type: "GetSalarySheetsByMonthRangeRequest" });
      const { data } = await axios.get(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/staffSalary/get-salary-sheets-by-month-range/${startDate}/${endDate}`
      );
      console.log("Salary Sheets fetched successfully", data);
      dispatch({
        type: "GetSalarySheetsByMonthRangeSuccess",
        payload: data.data,
      });
    } catch (error) {
      dispatch({
        type: "GetSalarySheetsByMonthRangeFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

// Create Salary Sheet
export const createSalarySheet = (salaryData) => async (dispatch) => {
  try {
    dispatch({ type: "CreateSalarySheetRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/staffSalary/create-salary-sheet`,
      salaryData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Salary Sheet created successfully", data);
    dispatch({ type: "CreateSalarySheetSuccess", payload: data.data });
    toast.success("Salary sheet created successfully");
  } catch (error) {
    dispatch({
      type: "CreateSalarySheetFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(
      error?.response?.data?.message ??
        error?.message ??
        "An unknown error occurred."
    );
    console.log("Error Catch", error);
  }
};

// Update Salary Sheet by Month and Year
export const updateSalarySheet =
  (month, year, salaryData) => async (dispatch) => {
    try {
      dispatch({ type: "UpdateSalarySheetRequest" });
      const { data } = await axios.put(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/staffSalary/update-salary-sheet/${month}/${year}`,
        salaryData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Salary Sheet updated successfully", data);
      dispatch({ type: "UpdateSalarySheetSuccess", payload: data.data });
      toast.success("Salary sheet updated successfully");
    } catch (error) {
      dispatch({
        type: "UpdateSalarySheetFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(
        error?.response?.data?.message ??
          error?.message ??
          "An unknown error occurred."
      );
      console.log("Error Catch", error);
    }
  };

// Delete Salary Sheet by Month and Year
export const deleteSalarySheet = (month, year) => async (dispatch) => {
  try {
    dispatch({ type: "DeleteSalarySheetRequest" });
    const { data } = await axios.delete(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/staffSalary/delete-salary-sheet/${month}/${year}`
    );
    console.log("Salary Sheet deleted successfully", data);
    dispatch({ type: "DeleteSalarySheetSuccess", payload: data.data });
    toast.success("Salary sheet deleted successfully");
  } catch (error) {
    dispatch({
      type: "DeleteSalarySheetFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(
      error?.response?.data?.message ??
        error?.message ??
        "An unknown error occurred."
    );
    console.log("Error Catch", error?.response?.data?.message);
  }
};
