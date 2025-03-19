import { Box, CircularProgress } from "@mui/material";
import { useEffect } from "react";
import { useAppSelector } from "../redux/hooks";
import { useNavigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const { loading, isAuthenticated } = useAppSelector((state) => state.user);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading) {
      if (!isAuthenticated) {
        navigate("/login", { state: { from: location }, replace: true });
      }
    }
  }, [loading, navigate, location, isAuthenticated]);

  if (loading)
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <CircularProgress />
    </Box>;

  return isAuthenticated ? children : null;
};

export default ProtectedRoute;
