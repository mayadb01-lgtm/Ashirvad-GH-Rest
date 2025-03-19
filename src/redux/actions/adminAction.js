import axios from "axios";
import toast from "react-hot-toast";

// Create Admin
export const createAdmin = (adminData) => async (dispatch) => {
  try {
    dispatch({ type: "CreateAdminRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/admin/create-admin`,
      adminData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    console.log("Admin created successfully", data);
    dispatch({ type: "CreateAdminSuccess", payload: data.admin });
    toast.success("Admin created successfully");
  } catch (error) {
    dispatch({
      type: "CreateAdminFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Login Admin
export const loginAdmin = (adminData) => async (dispatch) => {
  try {
    dispatch({ type: "LoginAdminRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/admin/login-admin`,
      adminData,
      {
        withCredentials: true,
      }
    );
    dispatch({ type: "LoginAdminSuccess", payload: data.admin });
    toast.success("Admin logged in successfully");
  } catch (error) {
    dispatch({
      type: "LoginAdminFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Load Admin
export const loadAdmin = () => async (dispatch) => {
  try {
    dispatch({ type: "LoadAdminRequest" });

    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/admin/getadmin`,
      {
        withCredentials: true,
      }
    );
    console.log("Admin loaded successfully", data);
    dispatch({ type: "LoadAdminSuccess", payload: data.admin });
    toast.success("Admin loaded successfully");
  } catch (error) {
    dispatch({
      type: "LoadAdminFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Log out Admin
export const logoutAdmin = () => async (dispatch) => {
  try {
    dispatch({ type: "LogoutAdminRequest" });

    await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/admin/logout-admin`,
      {
        withCredentials: true,
      }
    );
    dispatch({ type: "LogoutAdminSuccess" });
    toast.success("Admin logged out successfully");
  } catch (error) {
    dispatch({
      type: "LogoutAdminFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Reset Password
export const resetAdminPassword = (adminData) => async (dispatch) => {
  try {
    dispatch({ type: "ResetAdminPasswordRequest" });

    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/admin/reset-password`,
      adminData,
      {
        withCredentials: true,
      }
    );
    dispatch({ type: "ResetAdminPasswordSuccess", payload: data.admin });
    toast.success("Password updated successfully");
  } catch (error) {
    dispatch({
      type: "ResetAdminPasswordFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};
