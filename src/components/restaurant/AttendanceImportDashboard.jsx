// Face attendance machine ki "Attendance Summary" (CSV / Excel) → Staff Salary sheet ki attendance.
// Machine ka "Paid Day" (Present + aadha din) hi attendance banta hai. Sirf owner/admin.
import { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Checkbox, Chip, FormControlLabel, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import SaveIcon from "@mui/icons-material/Save";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const MAP_KEY = "attendance-machine-map"; // machine code → staffId (is browser mein yaad)
const ROLE_WORDS = new Set(["waiter", "chapati", "gh", "helper", "ustad", "masi", "ben", "bhai", "kaka", "cashier", "tandoori", "manager", "captain", "tgt", "cleaning", "staff", "pg", "ashirvad", "valsad", "pani", "smruti"]);

const words = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1);
const coreWords = (s) => words(s).filter((w) => !ROLE_WORDS.has(w));
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
};
const near = (a, b) => a === b || (a.length >= 4 && b.length >= 4 && lev(a, b) <= 1) || a.replace(/\s/g, "") === b.replace(/\s/g, "");
// Machine naam vs app naam: kitna milta hai (0 = bilkul nahi)
const score = (machineName, staffName) => {
  const m = coreWords(machineName);
  const s = coreWords(staffName);
  const allM = words(machineName).join("");
  const allS = words(staffName).join("");
  if (allM && (allM === allS || (allM.length >= 5 && allS.startsWith(allM)) || (allS.length >= 5 && allM.startsWith(allS)))) return 95;
  if (!m.length || !s.length) return 0;
  const joinedM = m.join("");
  const joinedS = s.join("");
  if (joinedM === joinedS) return 100;
  let hit = 0;
  s.forEach((w) => m.some((x) => near(x, w)) && hit++);
  let sc = (hit / s.length) * 60 + (hit / m.length) * 30;
  if (near(m[0], s[0])) sc += 15;
  return Math.round(sc);
};

// CSV / Excel padho: header row dhoondo ("Employee Name" + "Paid Day")
const parseSheet = (rows) => {
  let period = null;
  for (const r of rows.slice(0, 6)) {
    const t = (r || []).join(" ");
    const m = t.match(/(\d{2})\/(\d{2})\/(\d{4})\s*To\s*(\d{2})\/(\d{2})\/(\d{4})/i);
    if (m) period = { from: dayjs(`${m[3]}-${m[2]}-${m[1]}`), to: dayjs(`${m[6]}-${m[5]}-${m[4]}`) };
  }
  const hIdx = rows.findIndex((r) => (r || []).some((c) => /employee name/i.test(String(c))) && (r || []).some((c) => /paid day/i.test(String(c))));
  if (hIdx === -1) throw new Error('File mein "Employee Name" aur "Paid Day" column nahi mile. Machine se "Attendance Summary" report CSV/Excel mein nikalo.');
  const head = rows[hIdx].map((c) => String(c || "").trim().toLowerCase());
  const col = (name) => head.findIndex((h) => h === name);
  const ci = { code: col("code"), name: col("employee name"), present: col("present day"), half: col("half day"), absent: col("absent"), paid: col("paid day"), work: col("work hour") };
  // Overtime "Hour" column: "Overtime" group ke baad wala pehla "Hour"
  const groups = rows[hIdx - 1] || [];
  const otStart = groups.findIndex((g) => /^overtime$/i.test(String(g || "").trim()));
  const otHour = otStart >= 0 ? otStart + 1 : -1;
  const out = [];
  for (const r of rows.slice(hIdx + 1)) {
    if (!r || !r[ci.name]) continue;
    const n = (i) => (i >= 0 ? Number(String(r[i] ?? "").replace(/[^\d.]/g, "")) || 0 : 0);
    out.push({
      code: String(r[ci.code] ?? "").trim(),
      name: String(r[ci.name]).replace(/\s+/g, " ").trim(),
      present: n(ci.present),
      half: n(ci.half),
      absent: n(ci.absent),
      paidDay: n(ci.paid),
      otHours: otHour >= 0 ? String(r[otHour] ?? "").trim() : "",
    });
  }
  return { period, rows: out };
};

const readMap = () => {
  try {
    return JSON.parse(localStorage.getItem(MAP_KEY) || "{}");
  } catch {
    return {};
  }
};

const AttendanceImportDashboard = () => {
  const [staff, setStaff] = useState([]);
  const [file, setFile] = useState("");
  const [period, setPeriod] = useState(null);
  const [rows, setRows] = useState([]); // machine rows + match
  const [sheet, setSheet] = useState(undefined); // undefined = load nahi hua, null = is mahine ki sheet nahi
  const [skipZero, setSkipZero] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    axios
      .get(`${API}/restStaff/get-staff-id-name-mobile`)
      .then(({ data }) => setStaff((data.data || []).map((s) => ({ ...s, label: s.fullname.trim() + (s.staffStatus === "Inactive" ? " (band)" : "") }))))
      .catch(() => toast.error("Staff list load nahi hui"));
  }, []);

  const month = period ? period.from.month() + 1 : null;
  const year = period ? period.from.year() : null;

  useEffect(() => {
    if (!month) return;
    setSheet(undefined);
    axios
      .get(`${API}/staffSalary/get-salary-sheet/${month}/${year}`)
      .then(({ data }) => setSheet(data.data))
      .catch((e) => (e?.response?.status === 404 ? setSheet(null) : toast.error("Salary sheet load nahi hui")));
  }, [month, year]);

  const onFile = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (/\.pdf$/i.test(f.name)) {
      toast.error("PDF se number theek se nahi padhe jaate. Machine software se yahi report CSV ya Excel mein export karo.");
      return;
    }
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: "array", raw: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false });
      const parsed = parseSheet(raw);
      if (!parsed.period) throw new Error('File mein "Date : 01/08/2026 To 31/08/2026" jaisi line nahi mili, mahina pata nahi chala.');
      const saved = readMap();
      // 1) pehle yaad wale match, 2) phir sabse achhe naam-match, har staff sirf ek baar
      const assigned = parsed.rows.map((r) => {
        const m = staff.find((s) => s._id === saved[r.code]);
        return m ? { match: m, how: "yaad" } : { match: null, how: "" };
      });
      const used = new Set(assigned.filter((a) => a.match).map((a) => a.match._id));
      const pairs = [];
      parsed.rows.forEach((r, i) => {
        if (assigned[i].match) return;
        staff.forEach((st) => {
          const sc = score(r.name, st.fullname) + (st.staffStatus === "Inactive" ? -5 : 0);
          if (sc >= 55) pairs.push({ i, st, sc });
        });
      });
      pairs.sort((a, b) => b.sc - a.sc);
      pairs.forEach(({ i, st }) => {
        if (assigned[i].match || used.has(st._id)) return;
        assigned[i] = { match: st, how: "auto" };
        used.add(st._id);
      });
      setRows(parsed.rows.map((r, i) => ({ ...r, ...assigned[i] })));
      setPeriod(parsed.period);
      setFile(f.name);
      toast.success(`${parsed.rows.length} staff ki attendance padhi (${parsed.period.from.format("MMMM YYYY")})`);
    } catch (err) {
      toast.error(err.message || "File padhi nahi ja saki");
    }
  };

  const setMatch = (i, s) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, match: s, how: s ? "haath se" : "" } : r)));

  const toApply = useMemo(() => rows.filter((r) => r.match && !(skipZero && r.paidDay === 0)), [rows, skipZero]);
  const dupes = useMemo(() => {
    const c = {};
    toApply.forEach((r) => (c[r.match._id] = (c[r.match._id] || 0) + 1));
    return new Set(Object.keys(c).filter((k) => c[k] > 1));
  }, [toApply]);
  const currentAtt = (staffId) => sheet?.rows?.find((x) => String(x.staffId) === String(staffId))?.attendance;

  const save = async () => {
    if (!toApply.length) return toast.error("Koi staff match nahi hua");
    if (dupes.size) return toast.error("Ek hi staff do machine naam se juda hai. Laal wali line theek karo.");
    const label = period.from.format("MMMM YYYY");
    if (!window.confirm(`${label} ki Staff Salary sheet mein ${toApply.length} staff ki attendance machine ke "Paid Day" se bhar di jaayegi.\n\nPaisa (salary paid) wale khaane nahi badlenge. Aage badhein?`)) return;
    setSaving(true);
    try {
      const byId = Object.fromEntries(toApply.map((r) => [String(r.match._id), r]));
      let payloadRows;
      if (sheet) {
        payloadRows = sheet.rows.map((x) => (byId[String(x.staffId)] ? { ...x, attendance: byId[String(x.staffId)].paidDay } : x));
        const have = new Set(sheet.rows.map((x) => String(x.staffId)));
        toApply.filter((r) => !have.has(String(r.match._id))).forEach((r) =>
          payloadRows.push({ staffId: r.match._id, fullname: r.match.fullname, perDayPay: r.match.perDayPay || 0, attendance: r.paidDay, salaryPaid: false, salaryPaidAmount: 0 })
        );
        await axios.put(`${API}/staffSalary/update-salary-sheet/${month}/${year}`, { rows: payloadRows, remarks: sheet.remarks || "" });
      } else {
        const active = staff.filter((s) => s.staffStatus !== "Inactive" || byId[String(s._id)]);
        payloadRows = active.map((s) => ({ staffId: s._id, fullname: s.fullname, perDayPay: s.perDayPay || 0, attendance: byId[String(s._id)]?.paidDay || 0, salaryPaid: false, salaryPaidAmount: 0 }));
        await axios.post(`${API}/staffSalary/create-salary-sheet`, { month, year, rows: payloadRows, remarks: `Attendance machine se (${file})` });
      }
      // machine code → staff yaad rakho, agle mahine apne aap match ho
      const map = readMap();
      toApply.forEach((r) => r.code && (map[r.code] = r.match._id));
      try {
        localStorage.setItem(MAP_KEY, JSON.stringify(map));
      } catch {
        /* ignore */
      }
      toast.success(`${label}: ${toApply.length} staff ki attendance save ho gayi`);
      const { data } = await axios.get(`${API}/staffSalary/get-salary-sheet/${month}/${year}`);
      setSheet(data.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Save nahi hua");
    } finally {
      setSaving(false);
    }
  };

  const unmatched = rows.filter((r) => !r.match && !(skipZero && r.paidDay === 0)).length;

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Typography variant="h5" fontWeight={800}>
        Attendance machine import
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Face machine ki &quot;Attendance Summary&quot; report (CSV ya Excel) daalo → us mahine ki Staff Salary sheet mein har staff ki attendance (Paid Day) bhar jaayegi.
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
          Report file chuno (CSV / Excel)
          <input hidden type="file" accept=".csv,.xlsx,.xls,.pdf" onChange={onFile} />
        </Button>
        {file && <Chip label={file} />}
        {period && <Chip color="primary" label={`Mahina: ${period.from.format("MMMM YYYY")}`} />}
      </Stack>

      {!rows.length && (
        <Alert severity="info">
          Machine software mein <b>14. Attendance Summary</b> report kholo → mahina chuno → <b>Export: CSV ya Excel</b>. PDF mat lena, usse number theek se nahi padhe jaate.
        </Alert>
      )}

      {rows.length > 0 && (
        <>
          {sheet === null && <Alert severity="warning" sx={{ mb: 2 }}>{period.from.format("MMMM YYYY")} ki salary sheet abhi bani nahi hai. Save karne pe nayi sheet banegi (saare chalu staff, attendance machine se).</Alert>}
          {sheet && <Alert severity="info" sx={{ mb: 2 }}>{period.from.format("MMMM YYYY")} ki salary sheet pehle se hai. Sirf match hue staff ki attendance badlegi, baaki sab waisa hi.</Alert>}
          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
            <FormControlLabel control={<Checkbox checked={skipZero} onChange={(e) => setSkipZero(e.target.checked)} />} label="Machine pe 0 din wale chhodo (jo machine use nahi karte)" />
            <Typography variant="body2">
              <b>{toApply.length}</b> staff save honge · {unmatched > 0 ? <b style={{ color: "#B91C1C" }}>{unmatched} ka match baaki</b> : "sab match"}
            </Typography>
            <Button variant="contained" startIcon={<SaveIcon />} disabled={saving || sheet === undefined || !toApply.length} onClick={save}>
              Salary sheet mein save karo
            </Button>
          </Stack>
          <TableContainer sx={{ maxHeight: 640 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {["Machine naam", "Present", "Half", "Absent", "Paid Day", "OT ghante", "App ka staff (match)", "Abhi sheet mein"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700 }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r, i) => {
                  const skipped = skipZero && r.paidDay === 0;
                  const dup = r.match && dupes.has(String(r.match._id));
                  return (
                    <TableRow key={`${r.code}-${i}`} sx={{ opacity: skipped ? 0.45 : 1, bgcolor: dup ? "#FEF2F2" : !r.match && !skipped ? "#FFFBEB" : undefined }}>
                      <TableCell>
                        <b>{r.name}</b>
                        <Typography variant="caption" color="text.secondary" display="block">
                          Code {r.code}
                        </Typography>
                      </TableCell>
                      <TableCell>{r.present}</TableCell>
                      <TableCell>{r.half}</TableCell>
                      <TableCell>{r.absent}</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>{r.paidDay}</TableCell>
                      <TableCell>{r.otHours || "-"}</TableCell>
                      <TableCell sx={{ minWidth: 240 }}>
                        <Autocomplete
                          size="small"
                          options={staff}
                          value={r.match}
                          onChange={(_, v) => setMatch(i, v)}
                          getOptionLabel={(o) => o?.label || ""}
                          isOptionEqualToValue={(a, b) => a._id === b._id}
                          renderInput={(p) => <TextField {...p} placeholder={skipped ? "(chhoda)" : "Staff chuno"} error={!!dup} helperText={dup ? "Do baar juda hai" : r.how ? `match: ${r.how}` : ""} />}
                        />
                      </TableCell>
                      <TableCell>{r.match ? currentAtt(r.match._id) ?? "-" : ""}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary">
            Peela = match nahi hua (haath se chuno) · Laal = ek staff do baar · Ek baar save karne ke baad agle mahine yahi match apne aap ho jaayega (isi computer/phone pe).
          </Typography>
        </>
      )}
    </Box>
  );
};

export default AttendanceImportDashboard;
