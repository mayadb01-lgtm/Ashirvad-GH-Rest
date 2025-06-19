import axios from "axios";
import toast from "react-hot-toast";

export const getGHRoomsFromSeed = () => async (dispatch) => {
  try {
    dispatch({ type: "GetRoomsRequest" });
    const { data } = await axios.get(
      `${import.meta.env.VITE_REACT_APP_SERVER_URL}/room`
    );
    console.log("Rooms fetched successfully", data);
    dispatch({ type: "GetRoomsSuccess", payload: data.data });
  } catch (error) {
    dispatch({
      type: "GetRoomsFailure",
      payload: error?.response?.data?.message,
    });
    toast.error(error?.response?.data?.message);
    console.log("Error Catch", error?.response?.data?.message);
  }
};
