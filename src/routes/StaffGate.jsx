// 🔒 Staff ke liye: Home page aur purane pages nahi, seedha aaj ki entry (/entry)
// Admin aur Super User ke liye sab pehle jaisa.
import { useEffect, useState } from "react";
import axios from "axios";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";

const useIsPlainStaff = () => {
  const { isAuthenticated, user } = useAppSelector((s) => s.user);
  const { isAdminAuthenticated } = useAppSelector((s) => s.admin);
  return isAuthenticated && !isAdminAuthenticated && !user?.isSuperUser;
};

// "/" (Home) pe lagao:
// - login nahi hai → seedha Login page (welcome page bahar walon ko nahi dikhta)
// - staff → /entry
// - admin → Home (pehle jaisa)
export const HomeGate = ({ children }) => {
  const plainStaff = useIsPlainStaff();
  const [state, setState] = useState("checking"); // checking | in | out
  useEffect(() => {
    let alive = true;
    axios
      .get(`${import.meta.env.VITE_REACT_APP_SERVER_URL}/quick/me`)
      .then(() => alive && setState("in"))
      .catch(() => alive && setState("out"));
    return () => {
      alive = false;
    };
  }, []);
  if (state === "checking") return null;
  if (state === "out") return <Navigate to="/login" replace />;
  return plainStaff ? <Navigate to="/entry" replace /> : children;
};

// Purane staff pages (/hotel, /restaurant, /office, /staff-salary) pe lagao
export const LegacyGate = ({ children }) => (useIsPlainStaff() ? <Navigate to="/entry" replace /> : children);

export default HomeGate;
