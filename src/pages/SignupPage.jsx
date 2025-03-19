import { useEffect, useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { createUser } from "../redux/actions/userAction";
import toast from "react-hot-toast";

const SignupPage = () => {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const { loading, isAuthenticated } = useAppSelector((state) => state.user);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, navigate]);

  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      if (!form.name || !form.email || !form.password) {
        return toast.error("Please fill in all fields");
      }
      dispatch(createUser(form));

      navigate("/");
      setForm({ name: "", email: "", password: "" });
    } catch (err) {
      toast.error(err.response.data.message);
    }
  };

  if (loading) {
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
        <CircularProgress />
      </Box>
    );
  }

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
          Signup
        </Typography>

        <Typography
          variant="body2"
          align="center"
          gutterBottom
          sx={{ color: "#666" }}
        >
          Create your account to get started
        </Typography>

        <Box
          component="form"
          onSubmit={handleSignup}
          sx={{ mt: 3, display: "flex", flexDirection: "column", gap: 2 }}
        >
          <TextField
            name="name"
            label="Name"
            variant="outlined"
            fullWidth
            value={form.name}
            onChange={handleChange}
            required
          />

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
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Signup"
            )}
          </Button>
        </Box>

        <Box container justifyContent="center" sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ color: "#666" }}>
            User Login?{" "}
            <Button
              onClick={() => navigate("/login")}
              sx={{ color: "#1976d2", cursor: "pointer" }}
            >
              User Login
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
              User Reset Password
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

export default SignupPage;
