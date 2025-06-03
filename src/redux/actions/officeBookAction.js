import axios from "axios";
import toast from "react-hot-toast";

// Create Office Book Entry
export const createOfficeBook = (officeBookData) => async (dispatch) => {
  try {
    dispatch({ type: "CreateOfficeEntryRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/officeBook/create-entry`,
      officeBookData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Office Book created successfully", data);
    dispatch({ type: "CreateOfficeEntrySuccess", payload: data.data });
    toast.success("Office Book created successfully");
  } catch (error) {
    dispatch({
      type: "CreateOfficeEntryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Office Book by Date
export const getOfficeBookByDate = (date) => async (dispatch) => {
  try {
    dispatch({ type: "GetOfficeBookByDateRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/officeBook/get-entry/${date}`
    );
    console.log("Office Book fetched successfully", data);
    dispatch({ type: "GetOfficeBookByDateSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetOfficeBookByDateFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Update Office Book by Date
export const updateOfficeBookByDate =
  (date, officeBookData) => async (dispatch) => {
    try {
      dispatch({ type: "UpdateOfficeEntryRequest" });
      const { data } = await axios.put(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/officeBook/update-entry/${date}`,
        officeBookData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Office Book updated successfully", data);
      dispatch({ type: "UpdateOfficeEntrySuccess", payload: data.data });
      toast.success("Office Book updated successfully");
    } catch (error) {
      dispatch({
        type: "UpdateOfficeEntryFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

//   Delete Office Book by Date
export const deleteOfficeBookByDate = (date) => async (dispatch) => {
  try {
    dispatch({ type: "DeleteOfficeEntryRequest" });
    const { data } = await axios.delete(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/officeBook/delete-entry/${date}`
    );
    console.log("Office Book deleted successfully", data);
    dispatch({ type: "DeleteOfficeEntrySuccess", payload: data.data });
    toast.success("Office Book deleted successfully");
  } catch (error) {
    dispatch({
      type: "DeleteOfficeEntryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Office Book by Date Range
export const getOfficeBookByDateRange =
  (startDate, endDate) => async (dispatch) => {
    try {
      dispatch({ type: "GetOfficeBookByDateRangeRequest" });
      const { data } = await axios.get(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/officeBook/get-entries/${startDate}/${endDate}`
      );
      console.log("Office Book fetched successfully", data);
      dispatch({ type: "GetOfficeBookByDateRangeSuccess", payload: data.data });
    } catch (error) {
      dispatch({
        type: "GetOfficeBookByDateRangeFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

// OfficeCategory Action

// Create Office Category
export const createOfficeCategory =
  (officeCategoryData) => async (dispatch) => {
    try {
      dispatch({ type: "CreateOfficeCategoryRequest" });
      const { data } = await axios.post(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/officeBook/create-category`,
        officeCategoryData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Office Category created successfully", data);
      dispatch({ type: "CreateOfficeCategorySuccess", payload: data.data });
      toast.success("Office Category created successfully");
    } catch (error) {
      dispatch({
        type: "CreateOfficeCategoryFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

// Get Office All Categories
export const getOfficeAllCategories = () => async (dispatch) => {
  try {
    dispatch({ type: "GetOfficeAllCategoriesRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/officeBook/get-categories`
    );
    console.log("Office All Categories fetched successfully", data);
    dispatch({ type: "GetOfficeAllCategoriesSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetOfficeAllCategoriesFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Update Office Category
export const updateOfficeCategory =
  (id, officeCategoryData) => async (dispatch) => {
    try {
      dispatch({ type: "UpdateOfficeCategoryRequest" });
      const { data } = await axios.put(
        `${import.meta.env.VITE_REACT_APP_SERVER_URL}/officeBook/update-category/${id}`,
        officeCategoryData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
      console.log("Office Category updated successfully", data);
      dispatch({ type: "UpdateOfficeCategorySuccess", payload: data.data });
      toast.success("Office Category updated successfully");
    } catch (error) {
      dispatch({
        type: "UpdateOfficeCategoryFailure",
        payload: error?.response?.data?.message,
      });
      toast.error(error?.response?.data?.message);
      console.log("Error Catch", error?.response?.data?.message);
    }
  };

// Delete Office Category
export const deleteOfficeCategory = (id) => async (dispatch) => {
  try {
    dispatch({ type: "DeleteOfficeCategoryRequest" });
    const { data } = await axios.delete(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/officeBook/delete-category/${id}`
    );
    console.log("Office Category deleted successfully", data);
    dispatch({ type: "DeleteOfficeCategorySuccess", payload: data.data });
    toast.success("Office Category deleted successfully");
  } catch (error) {
    dispatch({
      type: "DeleteOfficeCategoryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};
