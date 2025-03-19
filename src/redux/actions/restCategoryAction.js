import axios from "axios";
import toast from "react-hot-toast";

// Create Category Entry
export const createRestCategory = (categoryData) => async (dispatch) => {
  try {
    dispatch({ type: "CreateRestCategoryRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restCategory/create-category`,
      categoryData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Category created successfully", data);
    dispatch({ type: "CreateRestCategorySuccess", payload: data.data });
    toast.success("Category created successfully");
  } catch (error) {
    dispatch({
      type: "CreateRestCategoryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Category - All
export const getRestCategory = () => async (dispatch) => {
  try {
    dispatch({ type: "GetRestCategoryRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restCategory/get-categories`
    );
    console.log("Category fetched successfully", data);
    dispatch({ type: "GetRestCategorySuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetRestCategoryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Category - categoryName
export const getRestCategoryName = () => async (dispatch) => {
  try {
    dispatch({ type: "GetRestCategoryNameRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restCategory/get-category-name/`
    );
    console.log("Category fetched successfully", data);
    dispatch({ type: "GetRestCategoryNameSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetRestCategoryNameFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Expense - expenseName - get-expenses
export const getRestExpenseName = () => async (dispatch) => {
  try {
    dispatch({ type: "GetRestExpenseNameRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restCategory/get-expenses`
    );
    console.log("Expense fetched successfully", data);
    dispatch({ type: "GetRestExpenseNameSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetRestExpenseNameFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Category - categoryName - by expenseName
export const getCategoryNameByExpense = (id) => async (dispatch) => {
  try {
    dispatch({ type: "GetCategoryNameByExpenseRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restCategory/get-category-name/${id}`
    );
    console.log("Category fetched successfully", data);
    dispatch({ type: "GetCategoryNameByExpenseSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetCategoryNameByExpenseFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Update Category
export const updateRestCategory = (id, categoryData) => async (dispatch) => {
  try {
    dispatch({ type: "UpdateRestCategoryRequest" });
    const { data } = await axios.put(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restCategory/update-category/${id}`,
      categoryData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Category updated successfully", data);
    dispatch({ type: "UpdateRestCategorySuccess", payload: data.data });
    toast.success("Category updated successfully");
  } catch (error) {
    dispatch({
      type: "UpdateRestCategoryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Remove Category
export const removeRestCategory = (id) => async (dispatch) => {
  try {
    dispatch({ type: "RemoveRestCategoryRequest" });
    const { data } = await axios.delete(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restCategory/delete-category/${id}`
    );
    console.log("Category removed successfully", data);
    dispatch({ type: "RemoveRestCategorySuccess", payload: data.data });
    toast.success("Category removed successfully");
  } catch (error) {
    dispatch({
      type: "RemoveRestCategoryFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};
