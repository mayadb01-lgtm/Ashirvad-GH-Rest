import { useEffect, useState } from "react";
import { Box, TextField, Button } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { loginUser } from "../redux/actions/userAction";
import toast from "react-hot-toast";
import AuthShell, { AuthLinks } from "../components/AuthShell";

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
    <AuthShell
      title="Login"
      subtitle="Apne staff account se login karo."
      footer={
        <AuthLinks
          links={[
            ["Naya staff account", () => navigate("/signup")],
            ["Password bhool gaye?", () => navigate("/reset-password")],
            ["Owner / Admin login", () => navigate("/admin-login")],
          ]}
        />
      }
    >
      <Box component="form" onSubmit={handleLogin} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <TextField name="email" label="Email" type="email" fullWidth value={form.email} onChange={handleChange} required autoComplete="email" />
        <TextField name="password" label="Password" type="password" fullWidth value={form.password} onChange={handleChange} required autoComplete="current-password" />
        <Button type="submit" variant="contained" size="large" fullWidth disabled={loading} sx={{ mt: 0.5 }}>
          {loading ? "Login ho raha hai…" : "Login"}
        </Button>
      </Box>
    </AuthShell>
  );
};

export default LoginPage;
