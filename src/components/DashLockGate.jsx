// 🔐 Dashboard password: Super Admin login ke baad dashboard kholne se pehle ek alag password.
// Password server par (hash) rehta hai, app ke code mein nahi. Report APIs bhi bina unlock ke 423 deti hain.
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, CircularProgress, Link, Stack, TextField, Typography } from "@mui/material";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

const DashLockGate = ({ children }) => {
  const [st, setSt] = useState(null); // { set, unlocked }
  const [mode, setMode] = useState("unlock"); // unlock | forgot
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [login, setLogin] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const check = useCallback(() => {
    axios
      .get(`${API}/dash-lock/status`)
      .then(({ data }) => setSt(data.data))
      .catch((e) => setSt(e?.response?.status === 404 ? { legacy: true } : { set: true, unlocked: false })); // purana server (route hi nahi): dashboard chalne do
  }, []);

  useEffect(() => {
    check();
    // koi report "locked" bole (jaise 12 ghante baad) → wapas password screen
    const id = axios.interceptors.response.use(
      (r) => r,
      (e) => {
        if (e?.response?.status === 423 && e.response.data?.dashLocked) setSt((s) => ({ ...(s || {}), set: true, unlocked: false }));
        return Promise.reject(e);
      }
    );
    return () => axios.interceptors.response.eject(id);
  }, [check]);

  if (!st) return <Box sx={{ display: "grid", placeItems: "center", height: "100vh" }}><CircularProgress /></Box>;
  if (st.legacy || (st.unlocked && st.set)) return children;

  const first = !st.set;
  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if ((first || mode === "forgot") && pw !== pw2) return setErr("Both passwords are not the same.");
    setBusy(true);
    try {
      if (first) await axios.post(`${API}/dash-lock/set`, { password: pw });
      else if (mode === "forgot") await axios.post(`${API}/dash-lock/set`, { password: pw, loginPassword: login });
      else await axios.post(`${API}/dash-lock/unlock`, { password: pw });
      setPw(""); setPw2(""); setLogin(""); setMode("unlock");
      setSt({ set: true, unlocked: true });
    } catch (e2) {
      setErr(e2?.response?.data?.message || "Could not check the password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const title = first ? "Set a dashboard password" : mode === "forgot" ? "Make a new dashboard password" : "Dashboard password";
  const sub = first
    ? "This extra password will be asked every time you open the dashboard. Keep it different from your login password."
    : mode === "forgot"
      ? "Enter your Super Admin login password, then choose a new dashboard password."
      : "Enter the dashboard password to continue.";

  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: "#F8FAFC", p: 2 }}>
      <Box component="form" onSubmit={submit} sx={{ width: "100%", maxWidth: 380, p: 3, borderRadius: 3, bgcolor: "#fff", border: "1px solid #E2E8F0", boxShadow: "0 10px 30px rgba(15,23,42,0.06)" }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={1.25} alignItems="center">
            <Box sx={{ width: 40, height: 40, borderRadius: "50%", bgcolor: "#EFF6FF", color: "#2563EB", display: "grid", placeItems: "center" }}><LockOutlinedIcon /></Box>
            <Typography variant="h6" fontWeight={800}>{title}</Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">{sub}</Typography>
          {mode === "forgot" && !first && (
            <TextField label="Your login password" type="password" value={login} onChange={(e) => setLogin(e.target.value)} autoComplete="current-password" required fullWidth />
          )}
          <TextField
            label={first || mode === "forgot" ? "New dashboard password" : "Dashboard password"}
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            autoFocus
            required
            fullWidth
            inputProps={{ minLength: 4, maxLength: 64 }}
            autoComplete={first || mode === "forgot" ? "new-password" : "off"}
          />
          {(first || mode === "forgot") && (
            <TextField label="Type it again" type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} required fullWidth autoComplete="new-password" />
          )}
          {err && <Alert severity="error">{err}</Alert>}
          <Button type="submit" variant="contained" size="large" disabled={busy || pw.length < 4}>
            {busy ? <CircularProgress size={22} color="inherit" /> : first ? "Save and open dashboard" : mode === "forgot" ? "Save new password" : "Open dashboard"}
          </Button>
          {!first && (
            <Link component="button" type="button" variant="body2" onClick={() => { setErr(""); setMode(mode === "forgot" ? "unlock" : "forgot"); }} sx={{ alignSelf: "center" }}>
              {mode === "forgot" ? "Back" : "Forgot dashboard password?"}
            </Link>
          )}
        </Stack>
      </Box>
    </Box>
  );
};

export default DashLockGate;
