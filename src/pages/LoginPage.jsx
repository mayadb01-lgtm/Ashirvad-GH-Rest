import { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { loginUser } from "../redux/actions/userAction";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const { loading, isAuthenticated } = useAppSelector((state) => state.user);
  const { isAdminAuthenticated } = useAppSelector((state) => state.admin);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const referrer = location.state?.from;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      if (!form.email || !form.password) {
        return toast.error("Please fill in all fields");
      }
      dispatch(loginUser(form));
      setForm({ email: "", password: "" });
    } catch (error) {
      toast.error(error.response.data.message);
      console.log(error.response.data.message);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated || isAuthenticated) {
      if (referrer) {
        navigate ? navigate(referrer) : navigate("/");
      } else {
        navigate("/");
      }
    }
  }, [isAdminAuthenticated, isAuthenticated, navigate]);

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        backgroundColor: "#f4f6f8",
        padding: 2,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 450,
          width: "100%",
          padding: 4,
          borderRadius: 2,
        }}
      >
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ fontWeight: 600, color: "#1976d2" }}
        >
          Login
        </Typography>

        <Typography
          variant="body2"
          align="center"
          gutterBottom
          sx={{ color: "#666" }}
        >
          Welcome back! Please log in to continue.
        </Typography>

        <Box
          component="form"
          onSubmit={handleLogin}
          sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            name="email"
            label="Email"
            type="email"
            variant="outlined"
            fullWidth
            value={form.email}
            onChange={handleChange}
            required
          />

          <TextField
            name="password"
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            value={form.password}
            onChange={handleChange}
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            disabled={loading}
            sx={{
              padding: "10px 0",
              fontWeight: 600,
              fontSize: "16px",
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "Login"}
          </Button>
        </Box>
        <Box container justifyContent="center" sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: "#666" }}>
            User Sign Up?{" "}
            <Button
              onClick={() => navigate("/signup")}
              sx={{ color: "#1976d2", cursor: "pointer" }}
            >
              User Sign Up
            </Button>
          </Typography>
        </Box>
        <Box container justifyContent="center" sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: "#666" }}>
            User Forgot Password?{" "}
            <Button
              onClick={() => navigate("/reset-password")}
              sx={{ color: "#1976d2", cursor: "pointer" }}
            >
              Reset Password
            </Button>
          </Typography>
        </Box>
        <Box container justifyContent="center" sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: "#666" }}>
            Admin Sign Up?{" "}
            <Button
              onClick={() => navigate("/admin-signup")}
              sx={{ color: "#1976d2", cursor: "pointer" }}
            >
              Admin Sign Up
            </Button>
          </Typography>
        </Box>
        <Box container justifyContent="center" sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: "#666" }}>
            Admin Login?{" "}
            <Button
              onClick={() => navigate("/admin-login")}
              sx={{ color: "#1976d2", cursor: "pointer" }}
            >
              Admin Login
            </Button>
          </Typography>
        </Box>
        <Box container justifyContent="center" sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: "#666" }}>
            Admin Forgot Password?{" "}
            <Button
              onClick={() => navigate("/admin-reset-password")}
              sx={{ color: "#1976d2", cursor: "pointer" }}
            >
              Admin Reset Password
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default LoginPage;
