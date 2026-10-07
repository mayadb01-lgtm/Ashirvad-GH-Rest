// 🔐 Login log (sirf Super Admin): kaun, kab, kahan se login / logout / galat password
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { Alert, Box, Chip, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const EVENTS = {
  login: { label: "Logged in", color: "success" },
  logout: { label: "Logged out", color: "default" },
  failed: { label: "Wrong password", color: "error" },
  otp_sent: { label: "Code sent", color: "info" },
  otp_failed: { label: "Wrong code", color: "error" },
  disabled: { label: "Login while account off", color: "warning" },
  reset: { label: "Password changed", color: "warning" },
  blocked: { label: "Blocked attempt", color: "error" },
};

const LoginLogDashboard = () => {
  const [from, setFrom] = useState(dayjs().subtract(7, "day").format("YYYY-MM-DD"));
  const [to, setTo] = useState(dayjs().format("YYYY-MM-DD"));
  const [rows, setRows] = useState(null);
  const [who, setWho] = useState("all");
  const [ev, setEv] = useState("all");

  useEffect(() => {
    setRows(null);
    axios
      .get(`${API}/staff-accounts/login-log`, { params: { from, to } })
      .then(({ data }) => setRows(data.data))
      .catch((e) => {
        setRows([]);
        toast.error(e?.response?.data?.message || "Could not load");
      });
  }, [from, to]);

  const people = useMemo(() => [...new Set((rows || []).map((r) => r.email || r.name).filter(Boolean))].sort(), [rows]);
  const shown = (rows || []).filter((r) => (who === "all" || (r.email || r.name) === who) && (ev === "all" || r.event === ev));
  const bad = (rows || []).filter((r) => ["failed", "otp_failed", "blocked", "disabled"].includes(r.event)).length;
  const logins = (rows || []).filter((r) => r.event === "login").length;

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1200, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800}>
        Login log
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Every login, logout, wrong password and password change — for you (Super Admin) and all staff. Kept for 400 days.
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => e.target.value && setTo(e.target.value)} InputLabelProps={{ shrink: true }} />
        <TextField select size="small" label="Person" value={who} onChange={(e) => setWho(e.target.value)} sx={{ minWidth: 220 }}>
          <MenuItem value="all">Everyone</MenuItem>
          {people.map((p) => (
            <MenuItem key={p} value={p}>
              {p}
            </MenuItem>
          ))}
        </TextField>
        <TextField select size="small" label="What" value={ev} onChange={(e) => setEv(e.target.value)} sx={{ minWidth: 200 }}>
          <MenuItem value="all">Everything</MenuItem>
          {Object.entries(EVENTS).map(([k, v]) => (
            <MenuItem key={k} value={k}>
              {v.label}
            </MenuItem>
          ))}
        </TextField>
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Paper variant="outlined" sx={{ p: 1.5, minWidth: 150 }}>
          <Typography variant="caption" color="text.secondary">Logins</Typography>
          <Typography variant="h6" fontWeight={800}>{logins}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, minWidth: 150 }}>
          <Typography variant="caption" color="text.secondary">People</Typography>
          <Typography variant="h6" fontWeight={800}>{people.length}</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 1.5, minWidth: 150, borderColor: bad ? "error.main" : undefined }}>
          <Typography variant="caption" color="text.secondary">Wrong / blocked tries</Typography>
          <Typography variant="h6" fontWeight={800} color={bad ? "error.main" : undefined}>{bad}</Typography>
        </Paper>
      </Stack>
      {bad > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          There were {bad} wrong or blocked login tries. If you see many for one email or from an unknown device, change that password.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              {["When", "Who", "Type", "What happened", "Device", "IP", "Note"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((r) => {
              const e = EVENTS[r.event] || { label: r.event, color: "default" };
              return (
                <TableRow key={r._id} hover>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{dayjs(r.at).format("DD-MM-YYYY hh:mm A")}</TableCell>
                  <TableCell>
                    <b>{r.name || "—"}</b>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {r.email}
                    </Typography>
                  </TableCell>
                  <TableCell>{r.kind === "admin" ? "Super Admin" : "Staff"}</TableCell>
                  <TableCell>
                    <Chip size="small" label={e.label} color={e.color} variant={e.color === "default" ? "outlined" : "filled"} />
                  </TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{r.device || "—"}</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{r.ip || "—"}</TableCell>
                  <TableCell>
                    <Typography variant="caption">{r.note}</Typography>
                  </TableCell>
                </TableRow>
              );
            })}
            {rows && !shown.length && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography color="text.secondary">Nothing in these dates.</Typography>
                </TableCell>
              </TableRow>
            )}
            {!rows && (
              <TableRow>
                <TableCell colSpan={7}>Loading…</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default LoginLogDashboard;
