// 👥 Staff Performance & Attendance: ranking, peak din par kaun gayab, aadatein, advance ka khatra, agle hafte ki chetavni.
// Data: machine ki din-wise hazri (import) + salary sheet + advance (Restaurant/Office) + restaurant ki bikri. Sirf padhta hai,
// sirf din-wise hazri / role / shift / settings naye collection mein save hote hain.
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SettingsIcon from "@mui/icons-material/Tune";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import { analyse, dayLabel, ROLES, warningText } from "../../utils/staffAnalytics";
import { bestStaff, parseAttendance } from "../../utils/attendanceParse";
import { useMe } from "../../utils/staffMe";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const BIZ = import.meta.env.VITE_REACT_APP_BUSINESS_NAME || "Hotel";
const C = { ink: "#0F172A", muted: "#64748B", line: "#E2E8F0", good: "#16A34A", warn: "#CA8A04", bad: "#DC2626", teal: "#0F766E" };
const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const pct = (x) => (x === null || x === undefined ? "—" : `${Math.round(x * 100)}%`);
const tone = (s) => (s === null ? "default" : s >= 80 ? "success" : s >= 60 ? "warning" : "error");
const barColor = (x) => (x >= 0.9 ? C.good : x >= 0.75 ? C.warn : C.bad);
const isoToday = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
const isoBack = (n) => new Date(Date.now() + 330 * 60000 - n * 86400000).toISOString().slice(0, 10);
const RANGES = [
  ["30", "Last 30 days"],
  ["90", "Last 3 months"],
  ["180", "Last 6 months"],
  ["365", "Last 12 months"],
];
const MAP_KEY = "staff-days-map"; // machine ka code/naam → staffId (is browser mein yaad)
const readMap = () => {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) || "{}");
  } catch {
    return {};
  }
};

const Card = ({ title, sub, children, right }) => (
  <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, mb: 2 }}>
    <Stack direction="row" alignItems="flex-start" spacing={1}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={800}>{title}</Typography>
        {sub && (
          <Typography variant="caption" color={C.muted} component="div" sx={{ mb: 1 }}>
            {sub}
          </Typography>
        )}
      </Box>
      {right}
    </Stack>
    {children}
  </Paper>
);
const Kpi = ({ label, value, note, color }) => (
  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, flex: "1 1 180px" }}>
    <Typography variant="caption" fontWeight={700} color={C.muted} sx={{ textTransform: "uppercase", letterSpacing: ".04em" }}>
      {label}
    </Typography>
    <Typography variant="h5" fontWeight={800} sx={{ color: color || C.ink, lineHeight: 1.3 }}>
      {value}
    </Typography>
    <Typography variant="caption" color={C.muted}>
      {note}
    </Typography>
  </Paper>
);
const Bar = ({ v, w = 90 }) => (
  <Box sx={{ display: "inline-block", width: w, height: 7, borderRadius: 9, bgcolor: "#E2E8F0", overflow: "hidden", verticalAlign: "middle", ml: 1 }}>
    <Box sx={{ width: `${Math.round(Math.max(0, Math.min(1, v || 0)) * 100)}%`, height: "100%", bgcolor: barColor(v || 0) }} />
  </Box>
);

/* ───────── Import: machine ki din-wise file ───────── */
const ImportDialog = ({ open, onClose, staff, onSaved }) => {
  const [file, setFile] = useState("");
  const [sheets, setSheets] = useState([]); // [aoa]
  const [ym, setYm] = useState(null);
  const [map, setMap] = useState({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) {
      setFile("");
      setSheets([]);
      setYm(null);
    }
  }, [open]);

  const parsed = useMemo(() => {
    let best = { kind: null, records: [], needsMonth: false, ym: null };
    sheets.forEach((aoa) => {
      const r = parseAttendance(aoa, ym || undefined);
      if (r.records.length > best.records.length || (!best.records.length && r.needsMonth)) best = r;
    });
    return best;
  }, [sheets, ym]);

  // machine ke log (naam + code) → kitne din
  const people = useMemo(() => {
    const o = {};
    parsed.records.forEach((r) => {
      const k = r.code ? `${r.code}|${r.name}` : r.name;
      const x = (o[k] ||= { key: k, name: r.name, code: r.code, P: 0, A: 0, other: 0 });
      if (r.st === "P" || r.st === "H") x.P++;
      else if (r.st === "A") x.A++;
      else x.other++;
    });
    return Object.values(o).sort((a, b) => a.name.localeCompare(b.name));
  }, [parsed]);
  useEffect(() => {
    const saved = readMap();
    const m = {};
    people.forEach((p) => {
      m[p.key] = saved[p.key] || saved[p.name] || bestStaff(p.name, staff) || "";
    });
    setMap(m);
  }, [people, staff]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const buf = await f.arrayBuffer();
      const wb = /\.csv$/i.test(f.name) ? XLSX.read(new TextDecoder().decode(buf), { type: "string", cellDates: true }) : XLSX.read(buf, { cellDates: true });
      setSheets(wb.SheetNames.map((n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: "" })));
      setFile(f.name);
      setYm(null);
    } catch (err) {
      toast.error("Could not read this file: " + err.message);
    }
  };
  const save = async () => {
    const rows = parsed.records.filter((r) => map[r.code ? `${r.code}|${r.name}` : r.name]).map((r) => ({ s: map[r.code ? `${r.code}|${r.name}` : r.name], date: r.date, st: r.st, in: r.in || "", out: r.out || "" }));
    if (!rows.length) return toast.error("Choose the staff for at least one name");
    setBusy(true);
    try {
      let saved = 0;
      for (let i = 0; i < rows.length; i += 5000) {
        const { data } = await axios.post(`${API}/staff-insights/days`, { rows: rows.slice(i, i + 5000), file });
        saved += data.saved || 0;
      }
      try {
        localStorage.setItem(MAP_KEY, JSON.stringify({ ...readMap(), ...map }));
      } catch {
        /* ignore */
      }
      toast.success(`${saved} attendance days saved`);
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };
  const dates = parsed.records.map((r) => r.date).sort();
  const monthVal = ym ? `${ym.y}-${String(ym.m).padStart(2, "0")}` : parsed.ym ? `${parsed.ym.y}-${String(parsed.ym.m).padStart(2, "0")}` : "";

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={800}>Import day-wise attendance (machine file)</DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 2 }}>
          From the face-attendance machine software, export the <b>day-wise</b> report (names like &quot;Monthly Attendance Register&quot;, &quot;Attendance Detail&quot;, &quot;Monthly Status Report&quot; or &quot;Daily log&quot;) as Excel or CSV. Old months can also be imported. Importing the same days again just updates them.
        </Alert>
        <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
          Choose file
          <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
        </Button>
        {file && (
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>{file}</b> · {parsed.kind ? `${parsed.records.length} day records · ${dates[0]} to ${dates[dates.length - 1]}` : "format not understood yet"}
          </Typography>
        )}
        {file && (parsed.needsMonth || parsed.kind === "grid" || parsed.kind === "blocks") && (
          <TextField type="month" size="small" label="Month of this file" value={monthVal} onChange={(e) => setYm(e.target.value ? { y: +e.target.value.slice(0, 4), m: +e.target.value.slice(5, 7) } : null)} sx={{ mt: 2 }} InputLabelProps={{ shrink: true }} helperText={parsed.needsMonth ? "The file shows only day numbers (1-31). Choose its month." : "Check the month is right."} />
        )}
        {file && !parsed.kind && !parsed.needsMonth && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Could not understand this file. Please send this file to Claude so the import can be adjusted for your machine.
          </Alert>
        )}
        {people.length > 0 && (
          <TableContainer sx={{ mt: 2, maxHeight: 380 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Name in machine</TableCell>
                  <TableCell align="right">Present</TableCell>
                  <TableCell align="right">Absent</TableCell>
                  <TableCell>Staff in app</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {people.map((p) => (
                  <TableRow key={p.key} sx={{ bgcolor: map[p.key] ? undefined : "#FFF7ED" }}>
                    <TableCell>
                      {p.name}
                      {p.code && (
                        <Typography component="span" variant="caption" color={C.muted}>
                          {" "}
                          · {p.code}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">{p.P}</TableCell>
                    <TableCell align="right">{p.A}</TableCell>
                    <TableCell>
                      <TextField select size="small" value={map[p.key] || ""} onChange={(e) => setMap((m) => ({ ...m, [p.key]: e.target.value }))} sx={{ minWidth: 220 }}>
                        <MenuItem value="">— skip —</MenuItem>
                        {staff.map((s) => (
                          <MenuItem key={s._id} value={s._id}>
                            {s.name}
                            {!s.active ? " (inactive)" : ""}
                          </MenuItem>
                        ))}
                      </TextField>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={busy || !parsed.records.length}>
          {busy ? "Saving…" : `Save ${Object.values(map).filter(Boolean).length} staff`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ───────── Settings: role, shift, kam se kam log, score ke weight ───────── */
const SettingsDialog = ({ open, onClose, data, onSaved }) => {
  const [roles, setRoles] = useState({});
  const [shift, setShift] = useState({});
  const [need, setNeed] = useState({});
  const [w, setW] = useState({ att: 40, peak: 30, punct: 15, adv: 15 });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open && data) {
      setRoles(data.meta?.roles || {});
      setShift(data.meta?.shift || {});
      setNeed(data.meta?.need || {});
      setW({ att: 40, peak: 30, punct: 15, adv: 15, ...(data.meta?.weights || {}) });
    }
  }, [open, data]);
  const active = (data?.staff || []).filter((s) => s.active);
  const save = async () => {
    setBusy(true);
    try {
      await axios.put(`${API}/staff-insights/meta`, { roles, shift, need, weights: w });
      toast.success("Saved");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle fontWeight={800}>Staff settings</DialogTitle>
      <DialogContent dividers>
        <Typography fontWeight={800}>Score weights</Typography>
        <Typography variant="caption" color={C.muted}>
          What matters more for you. Total does not need to be 100.
        </Typography>
        {[
          ["att", "Attendance"],
          ["peak", "Busy (peak) day attendance"],
          ["punct", "On time (late / left early)"],
          ["adv", "Advance discipline"],
        ].map(([k, l]) => (
          <Stack key={k} direction="row" spacing={2} alignItems="center">
            <Typography variant="body2" sx={{ width: 220 }}>
              {l}
            </Typography>
            <Slider size="small" value={w[k]} min={0} max={100} step={5} onChange={(_, v) => setW((x) => ({ ...x, [k]: v }))} sx={{ flex: 1 }} />
            <Typography variant="body2" fontWeight={700} sx={{ width: 40 }}>
              {w[k]}
            </Typography>
          </Stack>
        ))}
        <Typography fontWeight={800} sx={{ mt: 2 }}>
          Minimum people needed on a busy day (per role)
        </Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mt: 1 }}>
          {ROLES.map((r) => (
            <TextField key={r} size="small" type="number" label={r} value={need[r] ?? ""} onChange={(e) => setNeed((n) => ({ ...n, [r]: e.target.value === "" ? 0 : +e.target.value }))} sx={{ width: 110 }} inputProps={{ min: 0, max: 50 }} />
          ))}
        </Stack>
        <Typography fontWeight={800} sx={{ mt: 2 }}>
          Role and shift time of each staff
        </Typography>
        <Typography variant="caption" color={C.muted}>
          Shift time is used to find late coming and leaving early (machine in/out time). Leave empty if not needed.
        </Typography>
        <TableContainer sx={{ maxHeight: 340, mt: 1 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Staff</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Shift start</TableCell>
                <TableCell>Shift end</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {active.map((s) => (
                <TableRow key={s._id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>
                    <TextField select size="small" value={roles[s._id] || ""} onChange={(e) => setRoles((r) => ({ ...r, [s._id]: e.target.value }))} sx={{ minWidth: 130 }}>
                      <MenuItem value="">—</MenuItem>
                      {ROLES.map((r) => (
                        <MenuItem key={r} value={r}>
                          {r}
                        </MenuItem>
                      ))}
                    </TextField>
                  </TableCell>
                  {["start", "end"].map((k) => (
                    <TableCell key={k}>
                      <TextField type="time" size="small" value={shift[s._id]?.[k] || ""} onChange={(e) => setShift((x) => ({ ...x, [s._id]: { start: "", end: "", ...(x[s._id] || {}), [k]: e.target.value } }))} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={save} disabled={busy}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ───────── Report card (ek staff) ───────── */
const ReportCard = ({ row, onClose }) => {
  if (!row) return null;
  const max = Math.max(1, ...row.monthly.map((m) => Math.max(m.adv, m.earned)));
  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={800}>
        {row.name} {row.role && <Chip size="small" label={row.role} sx={{ ml: 1 }} />} {row.score !== null && <Chip size="small" color={tone(row.score)} label={`Score ${row.score}`} sx={{ ml: 1 }} />}
      </DialogTitle>
      <DialogContent dividers>
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1} sx={{ mb: 2 }}>
          <Chip label={`Attendance ${pct(row.attRate)}`} />
          <Chip label={`Busy-day absent ${row.peakAbs}/${row.peakRec}`} color={row.peakAbs >= 3 ? "error" : "default"} />
          <Chip label={`Late ${row.late} · Left early ${row.early}`} />
          <Chip label={`Advance ${inr(row.advTotal)} (${Math.round(row.advRatio * 100)}% of earning)`} color={row.advLevel === "High" ? "error" : row.advLevel === "Watch" ? "warning" : "success"} />
          {row.loss && <Chip color="error" variant="outlined" label={`Sale ~${inr(row.loss)} lower on busy days when absent`} />}
        </Stack>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Month</TableCell>
              <TableCell align="right">Days present</TableCell>
              <TableCell align="right">Busy-day absent</TableCell>
              <TableCell>Advance vs earned</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {row.monthly.map((m) => (
              <TableRow key={m.m}>
                <TableCell>{m.m}</TableCell>
                <TableCell align="right">{m.att === null ? "—" : `${m.att}${m.of ? "/" + m.of : ""}`}</TableCell>
                <TableCell align="right" sx={{ color: m.peakAbs ? C.bad : undefined, fontWeight: m.peakAbs ? 700 : 400 }}>
                  {m.peakAbs}
                </TableCell>
                <TableCell>
                  <Box sx={{ position: "relative", width: 160, height: 14, bgcolor: "#F1F5F9", borderRadius: 1 }}>
                    <Box sx={{ position: "absolute", inset: 0, width: `${(m.earned / max) * 100}%`, bgcolor: "#BBF7D0", borderRadius: 1 }} />
                    <Box sx={{ position: "absolute", top: 3, height: 8, width: `${(m.adv / max) * 100}%`, bgcolor: m.earned && m.adv / m.earned > 0.6 ? C.bad : C.warn, borderRadius: 1 }} />
                  </Box>
                  <Typography variant="caption" color={C.muted}>
                    {inr(m.adv)} / {inr(m.earned)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {row.patterns.length > 0 && (
          <Box sx={{ mt: 2 }}>
            {row.patterns.map((p) => (
              <Chip key={p.text} size="small" label={p.text} color={p.level === "bad" ? "error" : "warning"} sx={{ mr: 0.5, mb: 0.5 }} />
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => window.print()}>Print / PDF</Button>
        <Button variant="contained" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

/* ───────── Main ───────── */
const StaffInsightsDashboard = () => {
  const me = useMe();
  const owner = !!me?.isOwnerAdmin && !me?.viewOnly;
  const [range, setRange] = useState("90");
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [imp, setImp] = useState(false);
  const [set, setSet] = useState(false);
  const [card, setCard] = useState(null);
  const load = useCallback(() => {
    setErr("");
    axios
      .get(`${API}/staff-insights`, { params: { from: isoBack(Number(range) - 1), to: isoToday() } })
      .then(({ data }) => setData(data))
      .catch((e) => setErr(e?.response?.data?.message || "Could not load"));
  }, [range]);
  useEffect(() => {
    document.title = `${BIZ} · Staff performance`;
    load();
  }, [load]);
  const a = useMemo(() => (data ? analyse(data) : null), [data]);

  const toggleDay = async (row, date) => {
    if (!owner) return;
    const cur = row.rec[date]?.st;
    const st = cur === "A" ? "L" : cur === "L" ? "A" : null;
    if (!st) return;
    try {
      await axios.put(`${API}/staff-insights/day`, { s: row.id, date, st });
      toast.success(st === "L" ? "Marked as informed leave" : "Marked as absent");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not change");
    }
  };

  if (err) return <Alert severity="error">{err}</Alert>;
  if (!a) return <Box sx={{ display: "grid", placeItems: "center", height: "50vh" }}><CircularProgress /></Box>;
  const { team, ranked, rows, peak } = a;
  const heatRows = rows.filter((r) => r.active && r.peakRec).sort((x, y) => y.peakAbs - x.peakAbs).slice(0, 14);
  const heatDays = peak.list.slice(-16);
  const withPatterns = rows.filter((r) => r.active && r.patterns.length);
  const advRows = rows.filter((r) => r.active && r.advTotal > 0).sort((x, y) => y.advRatio - x.advRatio).slice(0, 10);
  const upRisk = a.upcoming.filter((u) => u.risks.length);

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: 1500, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h5" fontWeight={800}>
            👥 Staff Performance & Attendance
          </Typography>
          <Typography variant="caption" color={C.muted}>
            Attendance machine (day-wise) + salary sheets + advance (Restaurant + Office) + restaurant sale · {data.from} to {data.to}
          </Typography>
        </Box>
        <ToggleButtonGroup size="small" exclusive value={range} onChange={(_, v) => v && setRange(v)}>
          {RANGES.map(([v, l]) => (
            <ToggleButton key={v} value={v} sx={{ textTransform: "none" }}>
              {l}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
        {owner && (
          <>
            <Button variant="contained" startIcon={<UploadFileIcon />} onClick={() => setImp(true)}>
              Import attendance
            </Button>
            <Button variant="outlined" startIcon={<SettingsIcon />} onClick={() => setSet(true)}>
              Roles & settings
            </Button>
          </>
        )}
      </Stack>

      {!a.hasDaily && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No day-wise attendance yet for this period — ranking uses salary-sheet attendance and advance only. <b>Import attendance</b> (machine&apos;s day-wise file) to see busy-day absence, leave habits, late coming and next-week warnings.
        </Alert>
      )}
      {!Object.keys(data.meta?.roles || {}).length && owner && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Set each staff&apos;s <b>role</b> (Cook, Waiter…) in <b>Roles & settings</b> to see which work will be short on busy days.
        </Alert>
      )}

      <Stack direction="row" flexWrap="wrap" useFlexGap spacing={1.5} sx={{ mb: 2 }}>
        <Kpi label="Team attendance" value={pct(team.att)} note={`${rows.filter((r) => r.active).length} active staff`} />
        <Kpi label="Busy-day attendance" value={pct(team.peakAtt)} color={team.peakAtt !== null && team.normalAtt !== null && team.peakAtt < team.normalAtt - 0.03 ? C.bad : undefined} note={team.peakAtt !== null && team.normalAtt !== null ? `Normal days ${pct(team.normalAtt)}` : "Needs day-wise attendance"} />
        <Kpi label="Absences on busy days" value={team.peakAbsences} note={`${team.peakCount} busy days (top 20% sale)`} />
        <Kpi label="Advance in period" value={inr(team.advTotal)} color={team.advHigh ? C.bad : undefined} note={`${team.advHigh} staff above 60% of earning`} />
        <Kpi label="Best staff" value={team.best ? `${team.best.name.split(" ")[0]} · ${team.best.score}` : "—"} note={team.best ? `${team.best.peakAbs} busy-day absences` : ""} />
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1.4fr 1fr" }, gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Card title="🏆 Staff ranking (score out of 100)" sub={`Attendance ${a.weights.att} · Busy-day attendance ${a.weights.peak} · On time ${a.weights.punct} · Advance discipline ${a.weights.adv} — click a name for the report card`}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Staff</TableCell>
                    <TableCell>Attendance</TableCell>
                    <TableCell align="right">Busy-day absent</TableCell>
                    <TableCell align="right">Late / early</TableCell>
                    <TableCell align="right">Advance / earning</TableCell>
                    <TableCell align="right">Score</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ranked.map((r) => (
                    <TableRow key={r.id} hover sx={{ cursor: "pointer" }} onClick={() => setCard(r)}>
                      <TableCell>{r.rank}</TableCell>
                      <TableCell>
                        <b>{r.name}</b>
                        {r.role && (
                          <Typography component="span" variant="caption" color={C.muted}>
                            {" "}
                            · {r.role}
                          </Typography>
                        )}
                        {r.isNew && <Chip size="small" label="New" sx={{ ml: 0.5, height: 18 }} />}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>
                        {r.attText}
                        <Bar v={r.attRate} />
                      </TableCell>
                      <TableCell align="right" sx={{ color: r.peakAbs >= 3 ? C.bad : undefined, fontWeight: r.peakAbs >= 3 ? 800 : 400 }}>
                        {r.peakRec ? r.peakAbs : "—"}
                        {r.loss && (
                          <Typography variant="caption" display="block" color={C.bad}>
                            ~{inr(r.loss)} less sale
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{r.punctRate === null ? "—" : `${r.late} / ${r.early}`}</TableCell>
                      <TableCell align="right">{r.advTotal ? `${Math.round(r.advRatio * 100)}%` : "0"}</TableCell>
                      <TableCell align="right">
                        <Chip size="small" color={tone(r.score)} label={r.score} sx={{ fontWeight: 800 }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>

          <Card title="🔥 Busy days — who was absent" sub={`Busy day = top 20% sale days of the restaurant in this period. Red A = absent${owner ? " (click A to mark it as informed leave L, click again to undo)" : ""}`}>
            {!heatRows.length || !heatDays.length ? (
              <Typography variant="body2" color={C.muted}>
                Needs day-wise attendance.
              </Typography>
            ) : (
              <Box sx={{ overflowX: "auto" }}>
                <Box sx={{ display: "grid", gridTemplateColumns: `130px repeat(${heatDays.length}, minmax(34px, 1fr))`, gap: "3px", fontSize: 11, minWidth: 130 + heatDays.length * 37 }}>
                  <Box />
                  {heatDays.map((d) => (
                    <Tooltip key={d} title={`Sale ${inr(data.sales[d])}`}>
                      <Box sx={{ textAlign: "center", color: C.muted, fontWeight: 700, lineHeight: 1.1 }}>{dayLabel(d).replace(" ", "\n").split("\n").map((t, i) => <div key={i}>{t}</div>)}</Box>
                    </Tooltip>
                  ))}
                  {heatRows.map((r) => (
                    <Box key={r.id} sx={{ display: "contents" }}>
                      <Box sx={{ fontWeight: 700, alignSelf: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</Box>
                      {heatDays.map((d) => {
                        const st = r.rec[d]?.st;
                        const bg = st === "A" ? "#F87171" : st === "L" ? "#FDE68A" : st === "H" ? "#FEF3C7" : st === "P" ? "#BBF7D0" : "#F1F5F9";
                        return (
                          <Box key={d} onClick={() => toggleDay(r, d)} sx={{ height: 24, borderRadius: "5px", bgcolor: bg, display: "grid", placeItems: "center", color: st === "A" ? "#fff" : C.ink, fontWeight: 800, cursor: owner && (st === "A" || st === "L") ? "pointer" : "default" }}>
                            {st === "A" || st === "L" || st === "H" ? st : st === "WO" ? "off" : ""}
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            {a.shortages.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography fontWeight={800} variant="body2">
                  Work short on busy days (role-wise)
                </Typography>
                {a.shortages.slice(-8).reverse().map((s) => (
                  <Typography key={s.date + s.role} variant="body2" color={C.bad}>
                    {dayLabel(s.date)} — {s.role}: {s.have} of {s.need} came · sale {inr(s.sale)}
                  </Typography>
                ))}
              </Box>
            )}
          </Card>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          <Card
            title="⚠️ Next 14 days — busy days & who may be absent"
            sub="Busy days guessed from the last 120 days' sale by weekday; chance from each staff's past absence on that weekday"
            right={
              upRisk.length > 0 && (
                <Button size="small" color="success" startIcon={<WhatsAppIcon />} href={`https://wa.me/?text=${encodeURIComponent(warningText(BIZ, a.upcoming))}`} target="_blank" rel="noreferrer">
                  Send
                </Button>
              )
            }
          >
            {!a.upcoming.length && (
              <Typography variant="body2" color={C.muted}>
                No clear busy day ahead.
              </Typography>
            )}
            {a.upcoming.map((u) => (
              <Box key={u.date} sx={{ p: 1.2, mb: 1, borderRadius: 2, bgcolor: u.risks.length ? "#FFF7ED" : "#F8FAFC", border: `1px solid ${u.risks.length ? "#FED7AA" : C.line}` }}>
                <Typography variant="body2">
                  <b>{dayLabel(u.date)}</b> · expected sale ~{inr(u.expected)} (+{u.lift}%)
                </Typography>
                {u.risks.length ? (
                  u.risks.slice(0, 5).map((r) => (
                    <Typography key={r.id} variant="body2" color={r.p >= 0.5 ? C.bad : C.warn}>
                      {r.name}
                      {r.role ? ` (${r.role})` : ""} — {Math.round(r.p * 100)}% chance absent
                    </Typography>
                  ))
                ) : (
                  <Typography variant="caption" color={C.muted}>
                    No high-risk staff.
                  </Typography>
                )}
              </Box>
            ))}
          </Card>

          {a.rewards.length > 0 && (
            <Card title="🎁 Reward suggestion" sub="Top staff with score 80+ (2 / 1.5 / 1 day's pay). Give it as you like — nothing is saved.">
              {a.rewards.map((r, i) => (
                <Stack key={r.id} direction="row" spacing={1} sx={{ py: 0.5 }}>
                  <Typography sx={{ width: 24 }}>{["🥇", "🥈", "🥉"][i]}</Typography>
                  <Typography fontWeight={700} sx={{ flex: 1 }}>
                    {r.name}
                  </Typography>
                  <Typography color={C.muted}>score {r.score}</Typography>
                  <Typography fontWeight={800}>{r.amount ? inr(r.amount) : "—"}</Typography>
                </Stack>
              ))}
            </Card>
          )}

          <Card title="📅 Leave habits" sub="Found automatically from day-wise attendance">
            {!withPatterns.length && (
              <Typography variant="body2" color={C.muted}>
                {a.hasDaily ? "No bad habits found 👍" : "Needs day-wise attendance."}
              </Typography>
            )}
            {withPatterns.map((r) => (
              <Stack key={r.id} direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ py: 0.6, borderBottom: `1px solid #F1F5F9` }}>
                <Typography fontWeight={700} sx={{ width: 110 }} noWrap>
                  {r.name}
                </Typography>
                {r.patterns.map((p) => (
                  <Chip key={p.text} size="small" label={p.text} color={p.level === "bad" ? "error" : "warning"} variant="outlined" />
                ))}
              </Stack>
            ))}
          </Card>

          <Card title="💸 Advance risk" sub="Advance taken in this period vs salary earned · months with advance">
            {!advRows.length && (
              <Typography variant="body2" color={C.muted}>
                No advance in this period.
              </Typography>
            )}
            {advRows.map((r) => (
              <Stack key={r.id} direction="row" spacing={1} alignItems="center" sx={{ py: 0.6, borderBottom: `1px solid #F1F5F9` }}>
                <Typography fontWeight={700} sx={{ width: 110 }} noWrap>
                  {r.name}
                </Typography>
                <Box sx={{ flex: 1, height: 9, borderRadius: 9, bgcolor: "#E2E8F0", overflow: "hidden" }}>
                  <Box sx={{ width: `${Math.min(100, Math.round(r.advRatio * 100))}%`, height: "100%", bgcolor: r.advLevel === "High" ? C.bad : r.advLevel === "Watch" ? C.warn : C.good }} />
                </Box>
                <Typography variant="body2" sx={{ minWidth: 150, textAlign: "right" }}>
                  {inr(r.advTotal)} / {inr(r.earned)}
                </Typography>
                <Chip size="small" color={r.advLevel === "High" ? "error" : r.advLevel === "Watch" ? "warning" : "success"} label={`${r.advLevel} · ${r.advMonths}/${r.monthsCount}`} />
              </Stack>
            ))}
          </Card>
        </Box>
      </Box>

      <ImportDialog open={imp} onClose={() => setImp(false)} staff={data.staff} onSaved={load} />
      <SettingsDialog open={set} onClose={() => setSet(false)} data={data} onSaved={load} />
      <ReportCard row={card} onClose={() => setCard(null)} />
    </Box>
  );
};

export default StaffInsightsDashboard;
