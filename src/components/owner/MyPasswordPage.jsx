// 🔑 Super Admin: apna login password aur dashboard password badalna (purana password daal kar)
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

const PwCard = ({ title, sub, min, oldLabel, onSave }) => {
  const [cur, setCur] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (pw.length < min) return setErr(`New password must be at least ${min} characters.`);
    if (pw !== pw2) return setErr("Both new passwords are not the same.");
    setBusy(true);
    try {
      const msg = await onSave(cur, pw);
      toast.success(msg || "Password changed");
      setCur(""); setPw(""); setPw2("");
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Could not change the password. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Paper variant="outlined" component="form" onSubmit={submit} sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6" fontWeight={800}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{sub}</Typography>
        </Box>
        <TextField label={oldLabel} type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" required fullWidth />
        <TextField label={`New password (min ${min})`} type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" required fullWidth />
        <TextField label="Type new password again" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required fullWidth />
        {err && <Alert severity="error">{err}</Alert>}
        <Button type="submit" variant="contained" disabled={busy || !cur || pw.length < min || !pw2} sx={{ alignSelf: "flex-start" }}>
          {busy ? <CircularProgress size={20} color="inherit" /> : "Change password"}
        </Button>
      </Stack>
    </Paper>
  );
};

const MyPasswordPage = () => (
  <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 560, mx: "auto", display: "grid", gap: 2 }}>
    <Box>
      <Typography variant="h5" fontWeight={800}>My passwords</Typography>
      <Typography variant="body2" color="text.secondary">
        Change your Super Admin login password or your dashboard password. You need the old password. Nobody (not even this app) can see your passwords.
      </Typography>
    </Box>
    <PwCard
      title="Login password"
      sub="Used with your email on the admin login page."
      min={8}
      oldLabel="Current login password"
      onSave={async (current, password) => (await axios.post(`${API}/admin/change-password`, { current, password })).data?.message}
    />
    <PwCard
      title="Dashboard password"
      sub="The extra password asked when you open the dashboard. Forgot the old one? Lock the dashboard (log out), then use “Forgot dashboard password?” on the password screen."
      min={4}
      oldLabel="Current dashboard password"
      onSave={async (current, password) => {
        await axios.post(`${API}/dash-lock/set`, { current, password });
        return "Dashboard password changed";
      }}
    />
  </Box>
);

export default MyPasswordPage;
