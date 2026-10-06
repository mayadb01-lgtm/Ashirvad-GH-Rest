// Owner: Room list rate badlo. Purani entries par asar nahi, sirf aage ki entry mein naya rate.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Checkbox, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, TextField, Typography } from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import axios from "axios";
import toast from "react-hot-toast";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

const RoomRatesDashboard = () => {
  const [rooms, setRooms] = useState([]);
  const [draft, setDraft] = useState({}); // roomNumber -> new rate (string)
  const [picked, setPicked] = useState({});
  const [bulk, setBulk] = useState("");
  const [types, setTypes] = useState({}); // roomNumber -> new type
  const [bulkType, setBulkType] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () =>
    axios
      .get(`${API}/room`)
      .then(({ data }) => {
        setRooms(data?.data || []);
        setDraft({});
        setTypes({});
        setPicked({});
      })
      .catch(() => toast.error("Could not load rooms"));
  useEffect(() => {
    load();
  }, []);

  const rateChanged = (r) => draft[r.roomNumber] !== undefined && draft[r.roomNumber] !== "" && Number(draft[r.roomNumber]) !== r.roomCost;
  const typeChanged = (r) => !!types[r.roomNumber] && types[r.roomNumber] !== r.roomType;
  const changed = useMemo(() => rooms.filter((r) => rateChanged(r) || typeChanged(r)), // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms, draft, types]);
  const typeOptions = useMemo(() => [...new Set(["2 Bed", "3 Bed", "Deluxe", ...rooms.map((r) => r.roomType).filter(Boolean)])], [rooms]);

  const applyBulk = () => {
    const v = Number(bulk);
    if (!v && !bulkType) return toast.error("Enter a rate or choose a type first");
    const nums = Object.keys(picked).filter((k) => picked[k]);
    if (!nums.length) return toast.error("Select rooms first");
    if (v) setDraft((d) => ({ ...d, ...Object.fromEntries(nums.map((n) => [n, String(v)])) }));
    if (bulkType) setTypes((t) => ({ ...t, ...Object.fromEntries(nums.map((n) => [n, bulkType])) }));
  };

  const save = async () => {
    if (!changed.length) return;
    const list = changed
      .map((r) => [`${r.roomNumber}:`, typeChanged(r) ? `${r.roomType} → ${types[r.roomNumber]}` : "", rateChanged(r) ? `${inr(r.roomCost)} → ${inr(draft[r.roomNumber])}` : ""].filter(Boolean).join(" "))
      .join("\n");
    if (!window.confirm(`Save these changes?\n\n${list}\n\nPast entries will not change.`)) return;
    setSaving(true);
    let ok = 0;
    for (const r of changed) {
      try {
        await axios.put(`${API}/room/update-rate/${r.roomNumber}`, {
          roomCost: rateChanged(r) ? Number(draft[r.roomNumber]) : r.roomCost,
          ...(typeChanged(r) ? { roomType: types[r.roomNumber] } : {}),
        });
        ok++;
      } catch (e) {
        toast.error(`Room ${r.roomNumber}: ${e?.response?.data?.message || "could not save"}`);
      }
    }
    setSaving(false);
    if (ok) toast.success(`Saved for ${ok} room${ok === 1 ? "" : "s"}`);
    load();
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Typography variant="h5" fontWeight={800}>
        Room Rates
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Type and list rate for each room (the rate fills in automatically at check-in and can be edited). Past entries do not change; the new rate applies to future entries only.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
        <TextField size="small" type="number" label="New rate for selected rooms" value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <TextField size="small" select label="Type for selected rooms" value={bulkType} onChange={(e) => setBulkType(e.target.value)} sx={{ minWidth: 180 }}>
          <MenuItem value="">(no change)</MenuItem>
          {typeOptions.map((t) => (
            <MenuItem key={t} value={t}>
              {t}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="outlined" onClick={applyBulk}>
          Apply to selected rooms
        </Button>
        <Button variant="contained" startIcon={<SaveIcon />} disabled={!changed.length || saving} onClick={save}>
          Save ({changed.length})
        </Button>
      </Stack>
      {changed.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{changed.length} room(s) changed but not saved yet.</Alert>}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  checked={rooms.length > 0 && rooms.every((r) => picked[r.roomNumber])}
                  onChange={(e) => setPicked(Object.fromEntries(rooms.map((r) => [r.roomNumber, e.target.checked])))}
                />
              </TableCell>
              {["Room", "Type", "Current rate", "New rate"].map((h) => (
                <TableCell key={h} sx={{ fontWeight: 700 }}>
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rooms.map((r) => {
              const isChanged = changed.some((c) => c.roomNumber === r.roomNumber);
              return (
                <TableRow key={r.roomNumber} hover sx={{ bgcolor: isChanged ? "#FFFBEB" : undefined }}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={!!picked[r.roomNumber]} onChange={(e) => setPicked((p) => ({ ...p, [r.roomNumber]: e.target.checked }))} />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{r.roomNumber}</TableCell>
                  <TableCell>
                    <TextField select size="small" value={types[r.roomNumber] || r.roomType} onChange={(e) => setTypes((t) => ({ ...t, [r.roomNumber]: e.target.value }))} sx={{ minWidth: 120 }}>
                      {typeOptions.map((t) => (
                        <MenuItem key={t} value={t}>
                          {t}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  <TableCell>{inr(r.roomCost)}</TableCell>
                  <TableCell>
                    <TextField
                      size="small"
                      type="number"
                      value={draft[r.roomNumber] ?? ""}
                      placeholder={String(r.roomCost)}
                      onChange={(e) => setDraft((d) => ({ ...d, [r.roomNumber]: e.target.value }))}
                      sx={{ width: 130 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default RoomRatesDashboard;
