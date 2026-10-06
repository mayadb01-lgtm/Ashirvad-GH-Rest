// Owner: kaun staff kis business ki entry karega, aur kiska account band hai
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Chip,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const DEPTS = [
  { value: "none", label: "No access", color: "#94A3B8" },
  { value: "gh", label: "Guest House", color: "#0F766E" },
  { value: "rest", label: "Restaurant", color: "#B45309" },
  { value: "office", label: "Office Book", color: "#4338CA" },
];

const StaffAccessDashboard = () => {
  const [users, setUsers] = useState(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/staff-accounts`)
      .then(({ data }) => setUsers(data.data))
      .catch((e) => setError(e?.response?.data?.message || "Could not load staff list"));
  }, []);

  const save = async (u, patch) => {
    setSaving(u._id);
    const before = users;
    setUsers((list) => list.map((x) => (x._id === u._id ? { ...x, ...patch } : x)));
    try {
      await axios.put(`${API}/staff-accounts/${u._id}`, patch);
      toast.success(`${u.name}: saved`);
    } catch (e) {
      setUsers(before);
      toast.error(e?.response?.data?.message || "Could not save");
    } finally {
      setSaving("");
    }
  };

  const noAccess = users?.filter((u) => u.isActive && u.department === "none" && !u.isSuperUser).length || 0;

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 900, mx: "auto" }}>
      <Typography variant="h5" fontWeight={800}>
        Staff Access
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Staff can only view/edit <b>today's entries</b> for their own business. Past dates, reports and other businesses' data
        are blocked for staff on the server.
      </Typography>

      {noAccess > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {noAccess} staff {noAccess === 1 ? "member has" : "members have"} no access yet. They cannot enter anything after login until you choose a department.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {!users && !error && [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={72} sx={{ mb: 1 }} />)}

      <Stack spacing={1}>
        {users?.map((u) => {
          const dept = DEPTS.find((d) => d.value === u.department) || DEPTS[0];
          return (
            <Paper key={u._id} variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${u.isActive ? dept.color : "#CBD5E1"}`, opacity: u.isActive ? 1 : 0.6 }}>
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontWeight={700} noWrap>
                      {u.name}
                    </Typography>
                    {u.isSuperUser && <Chip size="small" label="Super user · full access" color="secondary" variant="outlined" />}
                    {!u.isActive && <Chip size="small" label="Disabled" />}
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {u.email} · created {u.createdAt ? dayjs(u.createdAt).format("DD-MM-YYYY") : "—"}
                  </Typography>
                </Box>
                <TextField
                  select
                  size="small"
                  label="Business access"
                  value={u.department}
                  onChange={(e) => save(u, { department: e.target.value })}
                  disabled={saving === u._id || u.isSuperUser}
                  sx={{ minWidth: 200 }}
                >
                  {DEPTS.map((d) => (
                    <MenuItem key={d.value} value={d.value}>
                      {d.label}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" alignItems="center">
                  <Switch checked={u.isActive} onChange={(e) => save(u, { isActive: e.target.checked })} disabled={saving === u._id} />
                  <Typography variant="body2" sx={{ width: 52 }}>
                    {u.isActive ? "Active" : "Off"}
                  </Typography>
                </Stack>
              </Stack>
            </Paper>
          );
        })}
      </Stack>
      {users && users.length === 0 && <Alert severity="info">No staff accounts yet.</Alert>}
      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        When a staff member leaves, switch the account "Off". It stops working immediately; past entries stay as they are.
      </Typography>
    </Box>
  );
};

export default StaffAccessDashboard;
