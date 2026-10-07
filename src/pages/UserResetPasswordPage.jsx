import { Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import AuthShell, { AuthLinks } from "../components/AuthShell";

// 🔒 Staff password ab sirf Super Admin badalta hai (Dashboard → Staff access). Referral code wala tarika band.
const UserResetPasswordPage = () => {
  const navigate = useNavigate();
  return (
    <AuthShell title="Forgot password?" subtitle="Staff passwords are reset by the owner." footer={<AuthLinks links={[["Back to staff login", () => navigate("/login")]]} />}>
      <Typography>Please ask the owner. They can set a new password for you from Staff access.</Typography>
    </AuthShell>
  );
};

export default UserResetPasswordPage;
