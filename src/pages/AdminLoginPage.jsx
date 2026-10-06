import { useEffect, useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { loginAdmin } from "../redux/actions/adminAction"; // Action for admin login
import toast from "react-hot-toast";
import AuthShell, { AuthLinks } from "../components/AuthShell";
import PasswordField from "../components/PasswordField";

const AdminLoginPage = () => {
  const [form, setForm] = useState({ email: "", password: "" });
  const { loading, isAdminAuthenticated } = useAppSelector(
    (state) => state.admin
  );
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
      dispatch(loginAdmin(form));
    } catch (error) {
      console.error(error);
      toast.error(error.response?.data?.message || "Login failed");
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      if (referrer) {
        navigate ? navigate(referrer) : navigate("/");
      } else {
        navigate("/");
      }
    }
  }, [isAdminAuthenticated, navigate]);

  return (
    <AuthShell
      title="Owner / Admin login"
      subtitle="Dashboard aur reports ke liye."
      footer={
        <AuthLinks
          links={[
            ["Staff login", () => navigate("/login")],
            ["Admin password bhool gaye?", () => navigate("/admin-reset-password")],
            ["Naya admin (referral code)", () => navigate("/admin-signup")],
          ]}
        />
      }
    >
      <Box component="form" onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField name="email" label="Email" type="email" fullWidth value={form.email} onChange={handleChange} required autoComplete="email" />
        <PasswordField name="password" label="Password" type="password" fullWidth value={form.password} onChange={handleChange} required autoComplete="current-password" />
        <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 0.5, bgcolor: "#0F172A", "&:hover": { bgcolor: "#1E293B" } }}>
          {loading ? "Login ho raha hai…" : "Admin login"}
        </Button>
      </Box>
    </AuthShell>
  );
};

export default AdminLoginPage;
