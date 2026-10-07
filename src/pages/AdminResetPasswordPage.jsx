import { useState } from "react";
import { Box, TextField, Button, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import AuthShell, { AuthLinks } from "../components/AuthShell";
import PasswordField from "../components/PasswordField";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

// 🔐 Super Admin password reset: email par code → naya password (referral code wala tarika band)
const AdminResetPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [otpId, setOtpId] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const sendCode = async (e) => {
    e.preventDefault();
    if (!email.trim()) return toast.error("Enter your admin email");
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/admin/reset-password/request`, { email: email.trim() });
      setOtpId(data.otpId);
      toast.success(data.message || "Code sent");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not send the code");
    } finally {
      setBusy(false);
    }
  };

  const reset = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return toast.error("Enter the 6-digit code from your email");
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    setBusy(true);
    try {
      await axios.post(`${API}/admin/reset-password`, { email: email.trim(), otpId, code: code.trim(), password });
      toast.success("Password updated. Please log in.");
      navigate("/admin-login");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not reset the password");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Reset password"
      subtitle={otpId ? "Enter the code from your email and a new password." : ""}
      footer={<AuthLinks links={[["Back to login", () => navigate("/admin-login")]]} />}
    >
      {!otpId ? (
        <Box component="form" onSubmit={sendCode} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth required autoComplete="email" />
          <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ bgcolor: "#0F172A", "&:hover": { bgcolor: "#1E293B" } }}>
            {busy ? "Sending…" : "Send code"}
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={reset} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField label="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoFocus fullWidth autoComplete="one-time-code" />
          <PasswordField label="New password (min 8)" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth autoComplete="new-password" />
          <Typography variant="caption" color="text.secondary">
            The code is valid for 10 minutes.
          </Typography>
          <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ bgcolor: "#0F172A", "&:hover": { bgcolor: "#1E293B" } }}>
            {busy ? "Saving…" : "Set new password"}
          </Button>
        </Box>
      )}
    </AuthShell>
  );
};

export default AdminResetPasswordPage;
