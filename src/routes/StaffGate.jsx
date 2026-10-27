// 🔒 Staff ke liye: Home page aur purane pages nahi, seedha aaj ki entry (/entry)
// Admin aur Super User ke liye sab pehle jaisa.
import { useEffect, useState } from "react";
import axios from "axios";
import { Navigate, useLocation } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";
import NotFound from "../pages/NotFound";
import { loginUnlocked } from "../utils/gate";
import { useMe, CLASSIC_MODULE } from "../utils/staffMe";

const useIsPlainStaff = () => {
  const { isAuthenticated, user } = useAppSelector((s) => s.user);
  const { isAdminAuthenticated } = useAppSelector((s) => s.admin);
  return isAuthenticated && !isAdminAuthenticated && !user?.isSuperUser && !user?.isEntryAdmin;
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
  // Bahar wala: seedha 404 (login ka raasta bhi na dikhe). Is device par darwaza khula hai to login page.
  if (state === "out") return loginUnlocked() ? <Navigate to="/login" replace /> : <NotFound />;
  return plainStaff ? <Navigate to="/entry" replace /> : children;
};

// Purane staff pages (/hotel, /restaurant, /office, /staff-salary) pe lagao.
// Staff: sirf tab jab Super Admin ne "Classic view" diya ho aur ye page uske business ka ho (server bhi yahi check karta hai).
const StaffClassic = ({ children }) => {
  const me = useMe();
  const { pathname } = useLocation();
  if (me === undefined) return null;
  const mod = CLASSIC_MODULE[pathname];
  const ok = !!me && me.isActive !== false && me.classic && mod && (me.modules || []).includes(mod);
  return ok ? children : <Navigate to="/entry" replace />;
};
export const LegacyGate = ({ children }) => (useIsPlainStaff() ? <StaffClassic>{children}</StaffClassic> : children);

export default HomeGate;
