import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Button,
  Chip,
  FormControl,
  FormControlLabel,
  InputLabel,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Switch,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import DownloadIcon from "@mui/icons-material/Download";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import { IMPORT_MODULES } from "./importConfig";

dayjs.extend(customParseFormat);

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const STEPS = ["Choose data type", "Upload file", "Review rows", "Import"];
const DATE_INPUT_FORMATS = [
  "DD-MM-YYYY",
  "D-M-YYYY",
  "DD/MM/YYYY",
  "D/M/YYYY",
  "DD.MM.YYYY",
  "YYYY-MM-DD",
  "DD-MM-YY",
  "DD/MM/YY",
];

// Excel serial number / text → DD-MM-YYYY (or null)
const toDDMMYYYY = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  if (typeof value === "number") {
    const p = XLSX.SSF.parse_date_code(value);
    if (!p) return null;
    return dayjs(new Date(p.y, p.m - 1, p.d)).format("DD-MM-YYYY");
  }
  const d = dayjs(String(value).trim(), DATE_INPUT_FORMATS, true);
  return d.isValid() ? d.format("DD-MM-YYYY") : null;
};

const normHeader = (h) =>
  String(h || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const DataImportDashboard = () => {
  const [moduleKey, setModuleKey] = useState("gh");
  const [refData, setRefData] = useState({ rooms: [], restCats: [], officeCats: [] });
  const [refLoading, setRefLoading] = useState(true);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState([]); // parsed + validated rows
  const [missingHeaders, setMissingHeaders] = useState([]);
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [duplicateMode, setDuplicateMode] = useState("skip");
  const [busy, setBusy] = useState(false);
  const [serverResult, setServerResult] = useState(null);
  const fileInput = useRef(null);

  const config = IMPORT_MODULES[moduleKey];

  // Reference data for client-side validation + template "Valid Values" sheet
  useEffect(() => {
    const load = async () => {
      setRefLoading(true);
      try {
        const [rooms, restCats, officeCats] = await Promise.all([
          axios.get(`${API}/room`),
          axios.get(`${API}/restCategory/get-categories`),
          axios.get(`${API}/officeBook/get-categories`),
        ]);
        setRefData({
          rooms: rooms.data.data || [],
          restCats: restCats.data.data || [],
          officeCats: officeCats.data.data || [],
        });
      } catch {
        toast.error("Could not load rooms/categories. Validation will run on the server only.");
      } finally {
        setRefLoading(false);
      }
    };
    load();
  }, []);

  const reset = useCallback(() => {
    setFileName("");
    setRows([]);
    setMissingHeaders([]);
    setServerResult(null);
    setOnlyErrors(false);
    if (fileInput.current) fileInput.current.value = "";
  }, []);

  const changeModule = (key) => {
    setModuleKey(key);
    reset();
  };

  /* ---------------- Template download ---------------- */
  const downloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headers = config.columns.map((c) => c.header);
    const data = XLSX.utils.aoa_to_sheet([headers, ...config.examples(refData)]);
    data["!cols"] = config.columns.map((c) => ({ wch: Math.max(14, c.header.length + 4) }));
    XLSX.utils.book_append_sheet(wb, data, "Data");

    const valid = XLSX.utils.aoa_to_sheet(config.validValues(refData));
    valid["!cols"] = [{ wch: 28 }, { wch: 28 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(wb, valid, "Valid Values");

    const help = XLSX.utils.aoa_to_sheet([
      ["How to fill this sheet"],
      [],
      ...config.columns.map((c) => [
        c.header,
        c.required ? "Required" : "Optional",
        c.help,
      ]),
      [],
      ["Dates can be typed as DD-MM-YYYY, DD/MM/YYYY or as an Excel date cell."],
      ["Keep the header row exactly as it is. Delete the example rows before importing."],
    ]);
    help["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, help, "Instructions");

    XLSX.writeFile(wb, `${config.templateName}.xlsx`);
  };

  /* ---------------- Parse + validate ---------------- */
  const handleFile = async (file) => {
    if (!file) return;
    const ext = file.name.split(".").pop().toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext)) {
      toast.error("Upload an .xlsx, .xls or .csv file.");
      return;
    }
    setServerResult(null);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      // raw:true for CSV keeps "05/03/2026" as text so we decide DD/MM ourselves
      const wb = XLSX.read(buf, { type: "array", raw: ext === "csv" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
      if (matrix.length < 2) {
        toast.error("The sheet has no data rows.");
        setRows([]);
        return;
      }

      // Map file headers → our keys (supports aliases, any order, any case)
      const fileHeaders = matrix[0].map(normHeader);
      const colIndex = {};
      config.columns.forEach((c) => {
        const names = [c.header, c.key, ...(c.aliases || [])].map(normHeader);
        const idx = fileHeaders.findIndex((h) => names.includes(h));
        if (idx !== -1) colIndex[c.key] = idx;
      });
      const missing = config.columns
        .filter((c) => c.required && colIndex[c.key] === undefined)
        .map((c) => c.header);
      setMissingHeaders(missing);

      const parsed = [];
      matrix.slice(1).forEach((line, i) => {
        if (line.every((cell) => String(cell).trim() === "")) return; // blank row
        const row = { __row: i + 2 };
        config.columns.forEach((c) => {
          const v = colIndex[c.key] !== undefined ? line[colIndex[c.key]] : "";
          row[c.key] = c.type === "date" ? toDDMMYYYY(v) ?? String(v) : v;
        });
        parsed.push(row);
      });

      const validated = parsed.map((r) => {
        const errors = config.validate(r, refData);
        return { ...r, id: r.__row, _errors: errors, _status: errors.length ? "error" : "ok" };
      });
      // in-file duplicate check (module specific)
      if (config.duplicateKey) {
        const seen = new Map();
        validated.forEach((r) => {
          const k = config.duplicateKey(r);
          if (!k) return;
          if (seen.has(k)) {
            r._errors.push(`Duplicate of row ${seen.get(k)}`);
            r._status = "error";
          } else seen.set(k, r.__row);
        });
      }
      setRows(validated);
      if (!missing.length) toast.success(`${validated.length} rows read from ${file.name}`);
    } catch (e) {
      console.error(e);
      toast.error("Could not read this file. Is it a valid Excel/CSV?");
    }
  };

  const counts = useMemo(() => {
    const err = rows.filter((r) => r._status === "error").length;
    const total = rows.reduce((s, r) => s + (Number(r[config.amountKey]) || 0), 0);
    const dates = new Set(rows.map((r) => r.date)).size;
    return { total: rows.length, ok: rows.length - err, err, amount: total, dates };
  }, [rows, config.amountKey]);

  /* ---------------- Server calls ---------------- */
  const send = async (dryRun) => {
    const okRows = rows
      .filter((r) => r._status === "ok")
      .map(({ id, _errors, _status, ...rest }) => rest);
    if (!okRows.length) {
      toast.error("No valid rows to send.");
      return;
    }
    setBusy(true);
    try {
      const { data } = await axios.post(
        `${API}/import/${config.endpoint}`,
        { rows: okRows, duplicateMode, dryRun },
        { withCredentials: true }
      );
      setServerResult(data);
      // merge server row status back into the grid
      const byRow = new Map(data.results.map((r) => [r.row, r]));
      setRows((prev) =>
        prev.map((r) => {
          const s = byRow.get(r.__row);
          if (!s) return r;
          return {
            ...r,
            _status: s.status === "error" ? "error" : data.dryRun ? "ok" : s.status,
            _errors: s.errors || r._errors,
          };
        })
      );
      if (dryRun) toast.success("Check complete. Nothing saved yet.");
      else toast.success(`Imported ${data.summary.created + (data.summary.overwritten || 0)} rows`);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const downloadErrorReport = () => {
    const bad = rows.filter((r) => r._status === "error" || r._status === "skipped");
    const sheet = XLSX.utils.json_to_sheet(
      bad.map((r) => {
        const out = { "Excel Row": r.__row };
        config.columns.forEach((c) => (out[c.header] = r[c.key]));
        out.Problem = (r._errors || []).join("; ");
        return out;
      })
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet, "Rows to fix");
    XLSX.writeFile(wb, `${config.templateName}_errors_${dayjs().format("DD-MM-YYYY")}.xlsx`);
  };

  /* ---------------- Grid ---------------- */
  const statusChip = {
    ok: { label: "Ready", color: "success" },
    error: { label: "Fix", color: "error" },
    created: { label: "Added", color: "primary" },
    overwritten: { label: "Replaced", color: "warning" },
    skipped: { label: "Skipped", color: "default" },
  };

  const columns = useMemo(
    () => [
      { field: "__row", headerName: "Row", width: 60 },
      {
        field: "_status",
        headerName: "Status",
        width: 100,
        renderCell: (p) => {
          const c = statusChip[p.value] || statusChip.ok;
          return <Chip size="small" label={c.label} color={c.color} variant="outlined" />;
        },
      },
      ...config.columns.map((c) => ({
        field: c.key,
        headerName: c.header,
        minWidth: c.width || 110,
        flex: c.flex || 0,
        type: c.type === "number" ? "number" : "string",
      })),
      {
        field: "_errors",
        headerName: "Problem",
        minWidth: 260,
        flex: 1,
        valueGetter: (v) => (v || []).join("; "),
        renderCell: (p) => (
          <Typography variant="body2" color="error" sx={{ whiteSpace: "normal", lineHeight: 1.3, py: 0.5 }}>
            {p.value}
          </Typography>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config]
  );

  const gridRows = onlyErrors ? rows.filter((r) => r._status === "error") : rows;
  const activeStep = serverResult ? (serverResult.dryRun ? 3 : 4) : rows.length ? 2 : 1;

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Import data from Excel or CSV
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add many days of entries at once. Download the template, fill it, upload it, check the rows, then import.
      </Typography>

      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
        {STEPS.map((s) => (
          <Step key={s}>
            <StepLabel>{s}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 1 + 2 */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
          <FormControl size="small" sx={{ minWidth: 240 }}>
            <InputLabel>Data type</InputLabel>
            <Select value={moduleKey} label="Data type" onChange={(e) => changeModule(e.target.value)}>
              {Object.entries(IMPORT_MODULES).map(([k, m]) => (
                <MenuItem key={k} value={k}>
                  {m.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadTemplate} disabled={refLoading}>
            Download template
          </Button>

          <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
            {fileName ? "Choose another file" : "Upload Excel / CSV"}
            <input
              ref={fileInput}
              hidden
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </Button>

          {fileName && (
            <Button color="inherit" startIcon={<RestartAltIcon />} onClick={reset}>
              Clear
            </Button>
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          {config.description}
        </Typography>

        {/* drop zone */}
        {!rows.length && (
          <Box
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFile(e.dataTransfer.files?.[0]);
            }}
            sx={{
              mt: 2,
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 2,
              p: 4,
              textAlign: "center",
              color: "text.secondary",
            }}
          >
            Drag your filled sheet here
          </Box>
        )}
      </Paper>

      {missingHeaders.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }}>
          These required columns were not found in your file: <b>{missingHeaders.join(", ")}</b>. Use the template
          header row.
        </Alert>
      )}

      {/* Step 3 */}
      {rows.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1} alignItems={{ md: "center" }} sx={{ mb: 2 }}>
            <Chip label={`${counts.total} rows`} />
            <Chip color="success" variant="outlined" label={`${counts.ok} ready`} />
            <Chip color="error" variant="outlined" label={`${counts.err} need fixing`} />
            <Chip variant="outlined" label={`${counts.dates} dates`} />
            {config.amountKey && (
              <Chip variant="outlined" label={`Total ₹${counts.amount.toLocaleString("en-IN")}`} />
            )}
            <Box sx={{ flex: 1 }} />
            <FormControlLabel
              control={<Switch checked={onlyErrors} onChange={(e) => setOnlyErrors(e.target.checked)} />}
              label="Show only problems"
            />
            {counts.err > 0 && (
              <Button size="small" onClick={downloadErrorReport} startIcon={<DownloadIcon />}>
                Download problem rows
              </Button>
            )}
          </Stack>

          <Box sx={{ height: 460 }}>
            <DataGrid
              rows={gridRows}
              columns={columns}
              density="compact"
              getRowHeight={() => "auto"}
              pageSizeOptions={[25, 50, 100]}
              initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
              getRowClassName={(p) => (p.row._status === "error" ? "row-error" : "")}
              sx={{ "& .row-error": { bgcolor: "rgba(211,47,47,0.06)" } }}
              disableRowSelectionOnClick
            />
          </Box>

          {/* Step 4 */}
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }} sx={{ mt: 2 }}>
            {config.supportsDuplicateMode && (
              <FormControl>
                <Typography variant="body2" fontWeight={600}>
                  If a room already has an entry for that date and period:
                </Typography>
                <RadioGroup row value={duplicateMode} onChange={(e) => setDuplicateMode(e.target.value)}>
                  <FormControlLabel value="skip" control={<Radio size="small" />} label="Keep existing (skip)" />
                  <FormControlLabel value="overwrite" control={<Radio size="small" />} label="Replace with file" />
                </RadioGroup>
              </FormControl>
            )}
            <Box sx={{ flex: 1 }} />
            <Button
              variant="outlined"
              startIcon={<FactCheckIcon />}
              disabled={busy || counts.ok === 0 || missingHeaders.length > 0}
              onClick={() => send(true)}
            >
              Check with server
            </Button>
            <Button
              variant="contained"
              color="success"
              startIcon={<CloudUploadIcon />}
              disabled={busy || counts.ok === 0 || missingHeaders.length > 0}
              onClick={() => send(false)}
            >
              Import {counts.ok} rows
            </Button>
          </Stack>
          {busy && <LinearProgress sx={{ mt: 2 }} />}
          {counts.err > 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
              Rows marked “Fix” are not sent. Fix them in Excel and upload again.
            </Typography>
          )}
        </Paper>
      )}

      {serverResult && (
        <Alert severity={serverResult.summary.errors ? "warning" : "success"}>
          <b>{serverResult.dryRun ? "Check result (nothing saved):" : "Import finished:"}</b>{" "}
          {serverResult.summary.created} added
          {serverResult.summary.overwritten ? `, ${serverResult.summary.overwritten} replaced` : ""}
          {serverResult.summary.skipped ? `, ${serverResult.summary.skipped} skipped (already existed)` : ""}
          {serverResult.summary.errors ? `, ${serverResult.summary.errors} rejected` : ""} across{" "}
          {serverResult.summary.daysTouched} dates.
        </Alert>
      )}
    </Box>
  );
};

export default DataImportDashboard;
