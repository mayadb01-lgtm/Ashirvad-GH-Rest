import axios from "axios";
import toast from "react-hot-toast";

// Register User
export const createUser = (userData) => async (dispatch) => {
  try {
    dispatch({ type: "RegisterUserRequest" });
    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/user/create-user`,
      userData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    dispatch({ type: "RegisterUserSuccess", payload: data.user });
    toast.success("User created successfully");
  } catch (error) {
    dispatch({
      type: "RegisterUserFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Login User
export const loginUser = (userData) => async (dispatch) => {
  try {
    dispatch({ type: "LoginUserRequest" });

    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/user/login-user`,
      userData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      }
    );
    dispatch({ type: "LoginUserSuccess", payload: data.user });
    // toast.success("Logged in successfully");
  } catch (error) {
    dispatch({
      type: "LoginUserFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Load User
export const loadUser = () => async (dispatch) => {
  try {
    dispatch({ type: "LoadUserRequest" });

    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/user/getuser`,
      {
        withCredentials: true,
      }
    );
    dispatch({ type: "LoadUserSuccess", payload: data.user });
    toast.success("User loaded successfully");
  } catch (error) {
    dispatch({
      type: "LoadUserFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Logout User
export const logoutUser = () => async (dispatch) => {
  try {
    dispatch({ type: "LogoutUserRequest" });

    await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/user/logout-user`,
      {
        withCredentials: true,
      }
    );

    dispatch({ type: "LogoutUserSuccess" });
    toast.success("Logged out successfully");
  } catch (error) {
    dispatch({
      type: "LogoutUserFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};

// Reset Password
export const resetPassword = (userData) => async (dispatch) => {
  try {
    dispatch({ type: "ResetPasswordRequest" });

    const { data } = await axios.post(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/user/reset-password`,
      userData,
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    dispatch({ type: "ResetPasswordSuccess", payload: data.user });
    toast.success("Password reset successfully");
  } catch (error) {
    dispatch({
      type: "ResetPasswordFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};
