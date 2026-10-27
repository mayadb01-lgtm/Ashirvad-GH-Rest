// 🔐 Super Admin: har user ko kitna access — kaun sa business, kitne din peeche ki entry, kaun si report, kitne din ki report
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Paper, Skeleton, Stack, Switch, TextField, Typography } from "@mui/material";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const MODULES = [
  { value: "gh", label: "Guest House", color: "#0F766E" },
  { value: "rest", label: "Restaurant", color: "#B45309" },
  { value: "office", label: "Office Book", color: "#4338CA" },
  { value: "banquet", label: "Banquet", color: "#BE185D" },
];
const ENTRY_DAYS = [
  [0, "Only today"],
  [1, "Today + 1 day back"],
  [3, "Last 3 days"],
  [7, "Last 7 days"],
  [15, "Last 15 days"],
  [30, "Last 30 days"],
  [90, "Last 90 days"],
  ["any", "Any date"],
];
const REPORT_DAYS = [
  [7, "Last 7 days"],
  [15, "Last 15 days"],
  [30, "Last 30 days"],
  [90, "Last 3 months"],
  [180, "Last 6 months"],
  [365, "Last 1 year"],
  ["any", "No limit"],
];
const LEGACY = { gh: ["gh"], rest: ["rest"], office: ["office", "banquet"], manager: ["gh", "rest", "office", "banquet"] };
const PRESETS = {
  staff: { label: "Staff (today only)", v: (a) => ({ ...a, entryDays: 0, reports: [], reportDays: 30, canEdit: false }) },
  manager: { label: "Manager (all business)", v: (a) => ({ ...a, modules: MODULES.map((m) => m.value), entryDays: 30, canEdit: true }) },
};
const toSel = (v) => (v === null || v === undefined ? "any" : v);
const fromSel = (v) => (v === "any" ? null : Number(v));

// Purana department → shuruaati form (jab tak naya access save na ho)
const startOf = (u) =>
  u.access
    ? { modules: u.access.modules || [], entryDays: u.access.entryDays ?? null, reports: u.access.reports || [], reportDays: u.access.reportDays ?? null, classic: u.access.classic !== false, canEdit: u.access.canEdit === true }
    : { modules: LEGACY[u.department] || [], entryDays: u.department === "manager" ? null : 0, reports: [], reportDays: 30, classic: true, canEdit: false };

const StaffAccessDashboard = () => {
  const [users, setUsers] = useState(null);
  const [reports, setReports] = useState([]);
  const [forms, setForms] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const [nw, setNw] = useState({ name: "", email: "", password: "" });

  const load = () =>
    axios
      .get(`${API}/staff-accounts`)
      .then(({ data }) => {
        setUsers(data.data);
        setReports(data.reports || []);
        setForms(Object.fromEntries(data.data.map((u) => [u._id, startOf(u)])));
      })
      .catch((e) => setError(e?.response?.data?.message || "Could not load staff list"));
  useEffect(() => {
    load();
  }, []);

  // Naya staff account (Super Admin khud banata hai)
  const addStaff = async () => {
    try {
      const { data } = await axios.post(`${API}/staff-accounts`, nw);
      toast.success(data.message);
      setNw({ name: "", email: "", password: "" });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not create");
    }
  };
  const setF = (id, patch) => setForms((f) => ({ ...f, [id]: { ...f[id], ...patch } }));
  const toggle = (id, field, v) => setForms((f) => {
    const list = f[id][field] || [];
    return { ...f, [id]: { ...f[id], [field]: list.includes(v) ? list.filter((x) => x !== v) : [...list, v] } };
  });

  const saveAccess = async (u) => {
    setSaving(u._id);
    try {
      const { data } = await axios.put(`${API}/staff-accounts/${u._id}/access`, forms[u._id]);
      toast.success(data.message || "Saved");
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, access: data.data } : x)));
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save");
    } finally {
      setSaving("");
    }
  };
  const setActive = async (u, isActive) => {
    try {
      await axios.put(`${API}/staff-accounts/${u._id}`, { isActive });
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, isActive } : x)));
      toast.success(`${u.name}: ${isActive ? "active" : "switched off"}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save");
    }
  };
  // Super Admin staff ka naya password set kare (staff khud reset nahi kar sakta)
  // ⭐ Staff ko Admin banao / hatao (poori entry power; Dashboard aur staff access phir bhi sirf malik ke paas)
  const setEntryAdmin = async (u, isEntryAdmin) => {
    try {
      await axios.put(`${API}/staff-accounts/${u._id}`, { isEntryAdmin });
      setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, isEntryAdmin } : x)));
      toast.success(`${u.name}: ${isEntryAdmin ? "is now Admin" : "Admin removed"}`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save");
    }
  };

  const setPassword = async (u) => {
    const pw = window.prompt(`New password for ${u.name} (min 6 characters):`);
    if (pw === null) return;
    if (pw.length < 6) return toast.error("Password must be at least 6 characters");
    try {
      const { data } = await axios.put(`${API}/staff-accounts/${u._id}/password`, { password: pw });
      toast.success(data.message || "Password set");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not set the password");
    }
  };

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1000, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800}>
        Staff access
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        You are the <b>Super Admin</b>: you see everything. For every staff / manager, choose which business they can enter, how many days back
        they can see or change entries, which reports they can open and how old the report data can be. Nobody except you can delete. All of this
        is checked on the server.
      </Typography>
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2 }}>
        <Typography variant="caption" fontWeight={800} color="text.secondary">
          ADD STAFF / MANAGER
        </Typography>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 0.5 }}>
          <TextField size="small" label="Name" value={nw.name} onChange={(e) => setNw({ ...nw, name: e.target.value })} />
          <TextField size="small" label="Email (login ID)" value={nw.email} onChange={(e) => setNw({ ...nw, email: e.target.value })} />
          <TextField size="small" label="Password (min 6)" value={nw.password} onChange={(e) => setNw({ ...nw, password: e.target.value })} />
          <Button variant="contained" onClick={addStaff} disabled={!nw.name || !nw.email || nw.password.length < 6}>
            Add
          </Button>
        </Stack>
      </Paper>
      {error && <Alert severity="error">{error}</Alert>}
      {!users && !error && [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={120} sx={{ mb: 1 }} />)}

      <Stack spacing={1.5}>
        {users?.map((u) => {
          const f = forms[u._id] || startOf(u);
          const dirty = JSON.stringify(f) !== JSON.stringify(startOf(u));
          return (
            <Paper key={u._id} variant="outlined" sx={{ p: 1.5, opacity: u.isActive ? 1 : 0.6, borderLeft: `4px solid ${f.modules.length ? "#0F766E" : "#CBD5E1"}` }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ mb: 1 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={800} noWrap>
                      {u.name}
                    </Typography>
                    {u.isSuperUser && <Chip size="small" label="Super user · full access" color="secondary" variant="outlined" />}
                    {u.isEntryAdmin && <Chip size="small" label="Admin" color="warning" />}
                    {!u.access && !u.isEntryAdmin && <Chip size="small" label="Old setting" variant="outlined" />}
                    {!u.isActive && <Chip size="small" label="Off" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {u.email} · created {u.createdAt ? dayjs(u.createdAt).format("DD-MM-YYYY") : "—"}
                  </Typography>
                </Box>
                {Object.entries(PRESETS).map(([k, p]) => (
                  <Button key={k} size="small" variant="outlined" onClick={() => setF(u._id, p.v(f))}>
                    {p.label}
                  </Button>
                ))}
                <Button size="small" onClick={() => setPassword(u)}>
                  Set password
                </Button>
                {!u.isSuperUser && (
                  <Stack direction="row" alignItems="center">
                    <Switch color="warning" checked={u.isEntryAdmin === true} onChange={(e) => setEntryAdmin(u, e.target.checked)} />
                    <Typography variant="body2" fontWeight={u.isEntryAdmin ? 800 : 400} sx={{ width: 50 }}>
                      Admin
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" alignItems="center">
                  <Switch checked={u.isActive} onChange={(e) => setActive(u, e.target.checked)} />
                  <Typography variant="body2" sx={{ width: 44 }}>
                    {u.isActive ? "Active" : "Off"}
                  </Typography>
                </Stack>
              </Stack>

              {u.isEntryAdmin && (
                <Alert severity="warning" sx={{ mb: 1, py: 0 }}>
                  <b>Admin:</b> all 4 businesses, any date, edit &amp; delete, Manager. The entry settings below are ignored while Admin is on. Reports = only the ones ticked below. No owner Dashboard, no staff access.
                </Alert>
              )}
              <Typography variant="caption" fontWeight={800} color="text.secondary">
                ENTRY — which business
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                {MODULES.map((m) => (
                  <FormControlLabel key={m.value} control={<Checkbox size="small" checked={f.modules.includes(m.value)} onChange={() => toggle(u._id, "modules", m.value)} />} label={m.label} />
                ))}
                <TextField select size="small" label="Entries — how far back" value={toSel(f.entryDays)} onChange={(e) => setF(u._id, { entryDays: fromSel(e.target.value) })} sx={{ minWidth: 200 }}>
                  {ENTRY_DAYS.map(([v, l]) => (
                    <MenuItem key={v} value={v}>
                      {l}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
              <Stack direction="row" alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 0.5 }}>
                <FormControlLabel
                  control={<Switch size="small" checked={f.classic !== false} onChange={(e) => setF(u._id, { classic: e.target.checked })} />}
                  label={<Typography variant="body2"><b>Classic view</b> — old entry pages too (Guest House / Restaurant / Office, only the ticked businesses)</Typography>}
                />
                <FormControlLabel
                  control={<Switch size="small" checked={f.canEdit === true} onChange={(e) => setF(u._id, { canEdit: e.target.checked })} />}
                  label={<Typography variant="body2"><b>Edit entries</b> — can change a day after it is submitted (only inside the allowed days)</Typography>}
                />
                {f.classic !== false && !f.modules.some((m) => ["gh", "rest", "office"].includes(m)) && (
                  <Typography variant="caption" color="text.secondary">Tick Guest House, Restaurant or Office for this to show.</Typography>
                )}
              </Stack>

              <Typography variant="caption" fontWeight={800} color="text.secondary">
                REPORTS — which ones
              </Typography>
              <Stack direction="row" flexWrap="wrap" useFlexGap>
                {reports.map((r) => (
                  <FormControlLabel key={r.key} control={<Checkbox size="small" checked={f.reports.includes(r.key)} onChange={() => toggle(u._id, "reports", r.key)} />} label={r.label} />
                ))}
              </Stack>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1 }}>
                <TextField select size="small" label="Report data — how old" value={toSel(f.reportDays)} onChange={(e) => setF(u._id, { reportDays: fromSel(e.target.value) })} sx={{ minWidth: 200 }} disabled={!f.reports.length}>
                  {REPORT_DAYS.map(([v, l]) => (
                    <MenuItem key={v} value={v}>
                      {l}
                    </MenuItem>
                  ))}
                </TextField>
                <Box sx={{ flex: 1 }} />
                <Button variant="contained" onClick={() => saveAccess(u)} disabled={saving === u._id || (!dirty && !!u.access)}>
                  {saving === u._id ? "Saving…" : "Save access"}
                </Button>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
      {users && users.length === 0 && <Alert severity="info">No staff accounts yet.</Alert>}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        When someone leaves, switch the account "Off" — it stops working immediately; past entries stay. Monthly reports (P&L, Cashflow…) start from
        the month of the allowed date.
      </Typography>
    </Box>
  );
};

export default StaffAccessDashboard;
