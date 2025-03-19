import axios from "axios";
import toast from "react-hot-toast";

// Create Staff Entry
export const createRestStaff = (staffData) => async (dispatch) => {
  try {
    dispatch({ type: "CreateRestStaffRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restStaff/create-staff`,
      staffData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Staff created successfully", data);
    dispatch({ type: "CreateRestStaffSuccess", payload: data.data });
    toast.success("Staff created successfully");
  } catch (error) {
    dispatch({
      type: "CreateRestStaffFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Get Staff - ID, Name, Mobile
export const getRestStaff = () => async (dispatch) => {
  try {
    dispatch({ type: "GetRestStaffRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restStaff/get-staff-id-name-mobile`
    );
    console.log("Staff fetched successfully", data);
    dispatch({ type: "GetRestStaffSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetRestStaffFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Update Staff
export const updateRestStaff = (id, staffData) => async (dispatch) => {
  try {
    dispatch({ type: "UpdateRestStaffRequest" });
    const { data } = await axios.put(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restStaff/update-staff/${id}`,
      staffData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Staff updated successfully", data);
    dispatch({ type: "UpdateRestStaffSuccess", payload: data.data });
    toast.success("Staff updated successfully");
  } catch (error) {
    dispatch({
      type: "UpdateRestStaffFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Remove Staff
export const removeRestStaff = (id) => async (dispatch) => {
  try {
    dispatch({ type: "RemoveRestStaffRequest" });
    await axios.delete(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/restStaff/remove-staff/${id}`
    );
    console.log("Staff removed successfully");
    dispatch({ type: "RemoveRestStaffSuccess", payload: id });
    toast.success("Staff removed successfully");
  } catch (error) {
    dispatch({
      type: "RemoveRestStaffFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};
