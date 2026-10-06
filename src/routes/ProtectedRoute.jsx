import { Box, CircularProgress } from "@mui/material";
import { useEffect } from "react";
import { useAppSelector } from "../redux/hooks";
import { Navigate, useNavigate, useLocation } from "react-router-dom";

// Staff wale purane pages (/hotel, /restaurant, /office, /staff-salary).
// Admin yahan aaye to uska apna version (/admin/...) khulta hai.
// (Pehle admin yahan aata to /login ↔ page ke beech page baar-baar flicker karta tha.)
const ADMIN_VERSION = ["/hotel", "/restaurant", "/office", "/staff-salary"];

const ProtectedRoute = ({ children }) => {
  const { loading, isAuthenticated } = useAppSelector((state) => state.user);
  const { isAdminAuthenticated } = useAppSelector((state) => state.admin);

  const navigate = useNavigate();
  const location = useLocation();
  const adminRedirect = !isAuthenticated && isAdminAuthenticated && ADMIN_VERSION.includes(location.pathname);

  useEffect(() => {
    if (!loading && !isAuthenticated && !adminRedirect) {
      navigate("/login", { state: { from: location }, replace: true });
    }
  }, [loading, navigate, location, isAuthenticated, adminRedirect]);

  if (adminRedirect) return <Navigate to={`/admin${location.pathname}`} replace />;

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );

  return isAuthenticated ? children : null;
};

export default ProtectedRoute;
