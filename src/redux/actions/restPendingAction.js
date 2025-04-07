import axios from "axios";
import toast from "react-hot-toast";

// Create Pending User
export const createPendingUser = (pendingUserData) => async (dispatch) => {
  try {
    dispatch({ type: "CreateRestStaffRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restPending/create-pending-user`,
      pendingUserData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Pending User created successfully", data);
    dispatch({ type: "CreateRestStaffSuccess", payload: data.data });
    toast.success("Pending User created successfully");
  } catch (error) {
    dispatch({
      type: "CreateRestStaffFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Pending User
export const getPendingUser = () => async (dispatch) => {
  try {
    dispatch({ type: "GetRestPendingRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restPending/get-all-pending-users`
    );
    console.log("Pending User fetched successfully", data);
    dispatch({ type: "GetRestPendingSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetRestPendingFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get All Pending Users - fullname
export const getAllPendingUsers = () => async (dispatch) => {
  try {
    dispatch({ type: "GetRestPendingUsersFullNameRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restPending/get-all-pending-users-fullname`
    );
    console.log("Pending User fetched successfully", data);
    dispatch({
      type: "GetRestPendingUsersFullNameSuccess",
      payload: data.data,
    });
  } catch (error) {
    dispatch({
      type: "GetRestPendingUsersFullNameFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Remove Pending User
export const removePendingUser = (id) => async (dispatch) => {
  try {
    dispatch({ type: "RemoveRestPendingRequest" });
    const { data } = await axios.delete(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restPending/remove-pending-user/${id}`
    );
    console.log("Pending User removed successfully", data);
    dispatch({ type: "RemoveRestPendingSuccess", payload: data.data });
    toast.success("Pending User removed successfully");
  } catch (error) {
    dispatch({
      type: "RemoveRestPendingFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Update Pending User
export const updatePendingUser = (id, pendingUserData) => async (dispatch) => {
  try {
    dispatch({ type: "UpdateRestPendingRequest" });
    const { data } = await axios.put(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restPending/update-pending-user/${id}`,
      pendingUserData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Pending User updated successfully", data);
    dispatch({ type: "UpdateRestPendingSuccess", payload: data.data });
    toast.success("Pending User updated successfully");
  } catch (error) {
    dispatch({
      type: "UpdateRestPendingFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};
