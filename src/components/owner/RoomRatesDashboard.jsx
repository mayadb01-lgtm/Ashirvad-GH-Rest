// Owner: Room list rate badlo. Purani entries par asar nahi, sirf aage ki entry mein naya rate.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Checkbox, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, TextField, Typography } from "@mui/material";
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
  const [saving, setSaving] = useState(false);

  const load = () =>
    axios
      .get(`${API}/room`)
      .then(({ data }) => {
        setRooms(data?.data || []);
        setDraft({});
        setPicked({});
      })
      .catch(() => toast.error("Rooms load nahi hue"));
  useEffect(() => {
    load();
  }, []);

  const changed = useMemo(
    () => rooms.filter((r) => draft[r.roomNumber] !== undefined && draft[r.roomNumber] !== "" && Number(draft[r.roomNumber]) !== r.roomCost),
    [rooms, draft]
  );

  const applyBulk = () => {
    const v = Number(bulk);
    if (!v) return toast.error("Pehle rate likho");
    const nums = Object.keys(picked).filter((k) => picked[k]);
    if (!nums.length) return toast.error("Rooms pe tick lagao");
    setDraft((d) => ({ ...d, ...Object.fromEntries(nums.map((n) => [n, String(v)])) }));
  };

  const save = async () => {
    if (!changed.length) return;
    const list = changed.map((r) => `${r.roomNumber}: ${inr(r.roomCost)} → ${inr(draft[r.roomNumber])}`).join("\n");
    if (!window.confirm(`Ye rates save karne hain?\n\n${list}\n\nPurani entries nahi badlengi.`)) return;
    setSaving(true);
    let ok = 0;
    for (const r of changed) {
      try {
        await axios.put(`${API}/room/update-rate/${r.roomNumber}`, { roomCost: Number(draft[r.roomNumber]) });
        ok++;
      } catch (e) {
        toast.error(`Room ${r.roomNumber}: ${e?.response?.data?.message || "save nahi hua"}`);
      }
    }
    setSaving(false);
    if (ok) toast.success(`${ok} room ka rate save ho gaya`);
    load();
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Typography variant="h5" fontWeight={800}>
        Room Rates
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Room ka list rate (entry mein default rate). Purani entries nahi badalti, sirf aage ki entry mein naya rate aayega.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
        <TextField size="small" type="number" label="Tick wale rooms ka naya rate" value={bulk} onChange={(e) => setBulk(e.target.value)} />
        <Button variant="outlined" onClick={applyBulk}>
          Tick wale rooms pe lagao
        </Button>
        <Button variant="contained" startIcon={<SaveIcon />} disabled={!changed.length || saving} onClick={save}>
          Save ({changed.length})
        </Button>
      </Stack>
      {changed.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{changed.length} room ka rate badla hai, abhi save nahi hua.</Alert>}

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
              {["Room", "Type", "Abhi ka rate", "Naya rate"].map((h) => (
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
                  <TableCell>{r.roomType}</TableCell>
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
