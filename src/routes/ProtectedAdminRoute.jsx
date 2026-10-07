import { Box, CircularProgress } from "@mui/material";
import { useEffect } from "react";
import { useAppSelector } from "../redux/hooks";
import { useNavigate, useLocation } from "react-router-dom";

// 🔐 Sirf Super Admin. Pehle yahan ek "extra password" tha jo app ke code mein hi likha tha (koi bhi padh sakta tha) —
// ab uski jagah login ke waqt email OTP hai, aur reports ka asli taala server par hai.
const ProtectedAdminRoute = ({ children }) => {
  const { loading, isAdminAuthenticated } = useAppSelector((state) => state.admin);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isAdminAuthenticated) {
      navigate("/admin-login", { state: { from: location }, replace: true });
    }
  }, [loading, navigate, location, isAdminAuthenticated]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
        <CircularProgress sx={{ color: "#fff" }} size={60} />
      </Box>
    );

  if (!isAdminAuthenticated) return null;
  return children;
};

export default ProtectedAdminRoute;
