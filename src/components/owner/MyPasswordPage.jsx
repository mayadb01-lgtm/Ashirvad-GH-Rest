// 🔑 Super Admin: apna login password aur dashboard password badalna (purana password daal kar)
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Alert, Box, Button, CircularProgress, IconButton, Paper, Stack, TextField, Typography } from "@mui/material";
import DeleteOutline from "@mui/icons-material/DeleteOutline";
import { useEffect } from "react";
import { useMe } from "../../utils/staffMe";

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

// 👁️ View-only account: sirf reports, rupaye kam (server par hisaab: utils/viewScale.js)
const ViewAccounts = () => {
  const [list, setList] = useState(null);
  const [f, setF] = useState({ name: "", email: "", password: "", percent: 20 });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const load = () => axios.get(`${API}/admin/view-accounts`).then(({ data }) => setList(data.data)).catch(() => setList([]));
  useEffect(() => { load(); }, []);
  const create = async (e) => {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      await axios.post(`${API}/admin/view-accounts`, f);
      toast.success("View-only account created");
      setF({ name: "", email: "", password: "", percent: 20 });
      load();
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Could not create the account");
    } finally {
      setBusy(false);
    }
  };
  const setPct = async (a, percent) => {
    try {
      await axios.put(`${API}/admin/view-accounts/${a._id}`, { percent });
      toast.success("Updated");
      load();
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Could not update");
    }
  };
  const remove = async (a) => {
    if (!window.confirm(`Remove the view-only account ${a.email}?`)) return;
    try {
      await axios.delete(`${API}/admin/view-accounts/${a._id}`);
      toast.success("Removed");
      load();
    } catch (e2) {
      toast.error(e2?.response?.data?.message || "Could not remove");
    }
  };
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
      <Stack spacing={1.5}>
        <Box>
          <Typography variant="h6" fontWeight={800}>View-only account</Typography>
          <Typography variant="body2" color="text.secondary">
            A separate login that can only open reports. Every rupee figure is shown lower by the % you choose. Your own login and the real data never change.
          </Typography>
        </Box>
        {(list || []).map((a) => (
          <Stack key={a._id} direction="row" spacing={1} alignItems="center" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1 }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>{a.name}</Typography>
              <Typography variant="caption" color="text.secondary" noWrap>{a.email}</Typography>
            </Box>
            <TextField size="small" type="number" label="% lower" defaultValue={a.percent} sx={{ width: 96 }} inputProps={{ min: 0, max: 90 }} onBlur={(e) => Number(e.target.value) !== a.percent && setPct(a, Number(e.target.value))} />
            <IconButton aria-label="Remove" onClick={() => remove(a)}><DeleteOutline /></IconButton>
          </Stack>
        ))}
        <Box component="form" onSubmit={create} sx={{ display: "grid", gap: 1.5 }}>
          <TextField size="small" label="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <TextField size="small" label="Email (any, for login)" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="off" />
          <TextField size="small" label="Password (min 8)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required autoComplete="new-password" />
          <TextField size="small" label="Show figures lower by (%)" type="number" value={f.percent} onChange={(e) => setF({ ...f, percent: e.target.value })} inputProps={{ min: 0, max: 90 }} />
          {err && <Alert severity="error">{err}</Alert>}
          <Button type="submit" variant="contained" disabled={busy || !f.email || f.password.length < 8} sx={{ alignSelf: "flex-start" }}>
            {busy ? <CircularProgress size={20} color="inherit" /> : "Create view-only account"}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
};

const MyPasswordPage = () => {
  const me = useMe();
  if (me?.viewOnly) return <Alert severity="info" sx={{ m: 2 }}>This account can only view reports.</Alert>;
  return (
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
    {me?.isOwnerAdmin && <ViewAccounts />}
  </Box>
  );
};

export default MyPasswordPage;
