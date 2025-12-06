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
import toast from "react-hot-toast";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { resetPassword } from "../redux/actions/userAction";

const ResetPasswordPage = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
    referralCode: "",
  });
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { loading } = useAppSelector((state) => state.user);

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
      dispatch(resetPassword(form));
      toast.success("Password reset successful");
      setForm({ email: "", password: "", referralCode: "" });
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.message || "An error occurred");
    }
  };

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
          Reset Password
        </Typography>

        <Box
          component="form"
          onSubmit={handleResetPassword}
          autoComplete="off"
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
            autoComplete="email"
            textareaProps={{ spellCheck: "false" }}
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
            autoComplete="password"
            textareaProps={{ spellCheck: "false" }}
          />

          <TextField
            name="referralCode"
            label="Referral Code"
            variant="outlined"
            fullWidth
            value={form.referralCode}
            onChange={handleChange}
            required
            autoComplete="referral-code"
            textareaProps={{ spellCheck: "false" }}
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
              "Reset Password"
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

export default ResetPasswordPage;
