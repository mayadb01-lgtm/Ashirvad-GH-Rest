// 🔒 Staff ke liye: Home page aur purane pages nahi, seedha aaj ki entry (/entry)
// Admin aur Super User ke liye sab pehle jaisa.
import { Navigate } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";

const useIsPlainStaff = () => {
  const { isAuthenticated, user } = useAppSelector((s) => s.user);
  const { isAdminAuthenticated } = useAppSelector((s) => s.admin);
  return isAuthenticated && !isAdminAuthenticated && !user?.isSuperUser;
};

// "/" (Home) pe lagao
export const HomeGate = ({ children }) => (useIsPlainStaff() ? <Navigate to="/entry" replace /> : children);

// Purane staff pages (/hotel, /restaurant, /office, /staff-salary) pe lagao
export const LegacyGate = ({ children }) => (useIsPlainStaff() ? <Navigate to="/entry" replace /> : children);

export default HomeGate;
