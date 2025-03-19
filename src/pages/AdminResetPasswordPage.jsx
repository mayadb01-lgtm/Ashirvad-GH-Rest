import { useState } from "react";
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
import toast from "react-hot-toast";
import { resetAdminPassword } from "../redux/actions/adminAction";

const AdminResetPasswordPage = ({ role }) => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    referralCode: "",
  });
  const { loading } = useAppSelector((state) => state.admin);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    try {
      if (!form.email || !form.password || !form.referralCode) {
        return toast.error("Please fill in all fields");
      }

      dispatch(resetAdminPassword(form));
      toast.success("Password reset successful");
      setForm({ email: "", password: "", referralCode: "" });
      navigate(role === "Admin" ? "/admin-login" : "/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred");
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
          sx={{ fontWeight: 600, color: "#d32f2f" }}
        >
          {role} Reset Password
        </Typography>

        <Typography
          variant="body2"
          align="center"
          gutterBottom
          sx={{ color: "#666" }}
        >
          Enter your details to reset your password
        </Typography>

        <Box
          component="form"
          onSubmit={handleResetPassword}
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
            label="New Password"
            type="password"
            variant="outlined"
            fullWidth
            value={form.password}
            onChange={handleChange}
            required
          />

          <TextField
            name="referralCode"
            label="Referral Code"
            variant="outlined"
            fullWidth
            value={form.referralCode}
            onChange={handleChange}
            required
          />

          <Button
            type="submit"
            variant="contained"
            color="error"
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
              `Reset ${role} Password`
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
            Admin Login?{" "}
            <Button
              onClick={() => navigate("/admin-login")}
              sx={{ color: "#1976d2", cursor: "pointer" }}
            >
              Admin Login
            </Button>
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default AdminResetPasswordPage;
