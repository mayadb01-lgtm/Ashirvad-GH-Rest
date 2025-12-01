import {
  Box,
  CircularProgress,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useAppSelector } from "../redux/hooks";
import { useNavigate, useLocation } from "react-router-dom";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import ShieldIcon from "@mui/icons-material/Shield";

const ADMIN_EXTRA_PASSWORD = import.meta.env.VITE_ADMIN_EXTRA_PASSWORD;

const ProtectedAdminRoute = ({ children }) => {
  const { loading, isAdminAuthenticated } = useAppSelector(
    (state) => state.admin
  );
  const navigate = useNavigate();
  const location = useLocation();

  const [passedExtra, setPassedExtra] = useState(false);
  const [inputPassword, setInputPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !isAdminAuthenticated) {
      navigate("/admin-login", { state: { from: location }, replace: true });
    }
  }, [loading, navigate, location, isAdminAuthenticated]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate brief validation delay for better UX
    setTimeout(() => {
      if (inputPassword === ADMIN_EXTRA_PASSWORD) {
        setPassedExtra(true);
      } else {
        setError("Incorrect password. Please try again.");
      }
      setIsSubmitting(false);
    }, 400);
  };

  if (loading)
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        }}
      >
        <CircularProgress sx={{ color: "#fff" }} size={60} />
      </Box>
    );

  if (!isAdminAuthenticated) return null;

  if (!passedExtra) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          padding: 3,
        }}
      >
        <Paper
          elevation={24}
          sx={{
            padding: { xs: 4, sm: 6 },
            borderRadius: 4,
            maxWidth: 480,
            width: "100%",
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
            border: "1px solid rgba(255, 255, 255, 0.18)",
          }}
        >
          <Box sx={{ textAlign: "center", mb: 4 }}>
            <Box
              sx={{
                display: "inline-flex",
                padding: 2.5,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                mb: 2,
              }}
            >
              <ShieldIcon sx={{ fontSize: 48, color: "#fff" }} />
            </Box>
            <Typography
              variant="h4"
              fontWeight="700"
              sx={{
                mb: 1,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Extra Security Layer
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: 15 }}
            >
              Enter the additional password to access admin panel
            </Typography>
          </Box>

          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              type={showPassword ? "text" : "password"}
              label="Extra Password"
              variant="outlined"
              value={inputPassword}
              onChange={(e) => {
                setInputPassword(e.target.value);
                setError("");
              }}
              error={!!error}
              helperText={error}
              autoFocus
              disabled={isSubmitting}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlinedIcon sx={{ color: "#667eea" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 3,
                "& .MuiOutlinedInput-root": {
                  "&:hover fieldset": {
                    borderColor: "#667eea",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#667eea",
                  },
                },
              }}
            />

            <Button
              type="submit"
              variant="contained"
              fullWidth
              disabled={isSubmitting || !inputPassword}
              sx={{
                py: 1.5,
                fontSize: 16,
                fontWeight: 600,
                textTransform: "none",
                borderRadius: 2,
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                boxShadow: "0 4px 15px 0 rgba(102, 126, 234, 0.4)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg, #764ba2 0%, #667eea 100%)",
                  boxShadow: "0 6px 20px 0 rgba(102, 126, 234, 0.6)",
                },
                "&:disabled": {
                  background: "#ccc",
                },
              }}
            >
              {isSubmitting ? (
                <CircularProgress size={24} sx={{ color: "#fff" }} />
              ) : (
                "Verify & Continue"
              )}
            </Button>
          </form>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              textAlign: "center",
              mt: 3,
              fontSize: 13,
            }}
          >
            🔒 This is an additional security measure for sensitive admin
            operations
          </Typography>
        </Paper>
      </Box>
    );
  }

  return children;
};

export default ProtectedAdminRoute;
