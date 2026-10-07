import { useEffect, useState } from "react";
import { Box, TextField, Button, Typography } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { loadAdmin } from "../redux/actions/adminAction";
import toast from "react-hot-toast";
import AuthShell, { AuthLinks } from "../components/AuthShell";
import PasswordField from "../components/PasswordField";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

// 🔐 Super Admin login: password → (email set ho to) email par aaya 6 ankon ka code
const AdminLoginPage = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const [otp, setOtp] = useState(null); // { otpId, sentTo }
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
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
    if (!form.email || !form.password) return toast.error("Please fill in all fields");
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/admin/login-admin`, form, { withCredentials: true });
      if (data.otpRequired) {
        setOtp({ otpId: data.otpId, sentTo: data.sentTo });
        setCode("");
        toast.success(`Code sent to ${data.sentTo}`);
      } else {
        dispatch(loadAdmin());
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return toast.error("Enter the 6-digit code from your email");
    setBusy(true);
    try {
      await axios.post(`${API}/admin/verify-otp`, { email: form.email, otpId: otp.otpId, code: code.trim() }, { withCredentials: true });
      dispatch(loadAdmin());
    } catch (error) {
      toast.error(error?.response?.data?.message || "Wrong code");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) navigate(referrer || "/");
  }, [isAdminAuthenticated, navigate, referrer]);

  return (
    <AuthShell
      title="Super Admin login"
      subtitle={otp ? `Enter the code sent to ${otp.sentTo}` : "For the dashboard and reports."}
      footer={
        <AuthLinks
          links={[
            ["Staff login", () => navigate("/login")],
            ["Forgot admin password?", () => navigate("/admin-reset-password")],
          ]}
        />
      }
    >
      {!otp ? (
        <Box component="form" onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField name="email" label="Email" type="email" fullWidth value={form.email} onChange={handleChange} required autoComplete="email" />
          <PasswordField name="password" label="Password" type="password" fullWidth value={form.password} onChange={handleChange} required autoComplete="current-password" />
          <Button type="submit" variant="contained" size="large" fullWidth disabled={busy} sx={{ mt: 0.5, bgcolor: "#0F172A", "&:hover": { bgcolor: "#1E293B" } }}>
            {busy ? "Checking…" : "Login"}
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleVerify} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoFocus
            fullWidth
            autoComplete="one-time-code"
          />
          <Typography variant="caption" color="text.secondary">
            The code is valid for 10 minutes. Not received? Check spam, or go back and log in again.
          </Typography>
          <Button type="submit" variant="contained" size="large" fullWidth disabled={busy} sx={{ bgcolor: "#0F172A", "&:hover": { bgcolor: "#1E293B" } }}>
            {busy ? "Checking…" : "Verify & login"}
          </Button>
          <Button onClick={() => setOtp(null)} disabled={busy}>
            Back
          </Button>
        </Box>
      )}
    </AuthShell>
  );
};

export default AdminLoginPage;
