import { Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AuthShell, { AuthLinks } from "../components/AuthShell";

// 🔒 Staff password ab sirf Super Admin badalta hai (Dashboard → Staff access). Referral code wala tarika band.
const UserResetPasswordPage = () => {
  const navigate = useNavigate();
  return (
    <AuthShell title="Forgot password?" footer={<AuthLinks links={[["Back to login", () => navigate("/login")]]} />}>
      <Typography>Please ask the admin to set a new password for you.</Typography>
    </AuthShell>
  );
};

export default UserResetPasswordPage;
