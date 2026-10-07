// Office Book: Excel / CSV se ek saath kai entry (mass entry) + sample file download.
// Khule din ki rows → screen ki entry mein judti hain (phir Submit/Update). Doosre dino ki rows → sirf owner, seedha save.
import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import axios from "axios";
import toast from "react-hot-toast";
import { Alert, Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { API, EditorDialog, Q, apiError, inr, num } from "./shared";

dayjs.extend(customParseFormat);
export const OFFICE_MODES = ["Cash", "Card", "PP", "PPS", "PPC", "UnPaid"];
const HEADERS = ["Date", "Section", "Category", "Item", "Name", "Amount", "Payment", "Remark"];
const DATE_IN = ["DD-MM-YYYY", "D-M-YYYY", "DD/MM/YYYY", "D/M/YYYY", "DD.MM.YYYY", "YYYY-MM-DD", "DD-MM-YY", "DD/MM/YY"];
const toDate = (v, fallback) => {
  if (v === "" || v === null || v === undefined) return fallback;
  if (typeof v === "number") {
    const p = XLSX.SSF.parse_date_code(v);
    return p ? dayjs(new Date(p.y, p.m - 1, p.d)).format("DD-MM-YYYY") : null;
  }
  const d = dayjs(String(v).trim(), DATE_IN, true);
  return d.isValid() ? d.format("DD-MM-YYYY") : null;
};
const norm = (h) => String(h || "").toLowerCase().replace(/[^a-z]/g, "");
const low = (v) => String(v ?? "").trim().toLowerCase();

const OfficeImportDialog = ({ open, onClose, date, lists, isAdmin, onAddToday, onSavedOther }) => {
  const [rows, setRows] = useState([]); // { rowNo, date, side, item, fullname, amount, mode, remark, errors }
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setRows([]);
      setFileName("");
    }
  }, [open]);

  /* ----- sample file ----- */
  const sampleRows = () => {
    const inEx = lists.in[0];
    const outEx = lists.out[0];
    const outEx2 = lists.out[1] || outEx;
    return [
      [date, "In", inEx?.categoryName || "", inEx?.expenseName || "", "Ramesh", 5000, "Cash", "Banquet advance"],
      [date, "Out", outEx?.categoryName || "", outEx?.expenseName || "", "Shop name", 1200, "PPS", ""],
      [date, "Out", outEx2?.categoryName || "", outEx2?.expenseName || "", "Suresh", 300, "Cash", "Bill 45"],
    ];
  };
  const downloadXlsx = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...sampleRows()]);
    ws["!cols"] = [12, 8, 22, 26, 18, 10, 10, 22].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, "Office Book");
    const max = Math.max(lists.in.length, lists.out.length);
    const valid = [["In: Category", "In: Item", "", "Out: Category", "Out: Item", "", "Payment"]];
    for (let i = 0; i < Math.max(max, OFFICE_MODES.length); i++)
      valid.push([lists.in[i]?.categoryName || "", lists.in[i]?.expenseName || "", "", lists.out[i]?.categoryName || "", lists.out[i]?.expenseName || "", "", OFFICE_MODES[i] || ""]);
    const ws2 = XLSX.utils.aoa_to_sheet(valid);
    ws2["!cols"] = [22, 28, 3, 22, 28, 3, 10].map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws2, "Valid values");
    const help = XLSX.utils.aoa_to_sheet([
      ["How to fill"],
      ["Date: DD-MM-YYYY (blank = the day open on screen)"],
      ["Section: In (money received) or Out (money paid)"],
      ["Category + Item: copy exactly from the 'Valid values' sheet (In list for In rows, Out list for Out rows)"],
      ["Name: who paid / received (required)"],
      [`Payment: ${OFFICE_MODES.join(", ")}`],
      ["Rows of the open day are added to the screen — check and press Submit/Update. Other days: owner only, saved directly."],
    ]);
    help["!cols"] = [{ wch: 110 }];
    XLSX.utils.book_append_sheet(wb, help, "Help");
    XLSX.writeFile(wb, "Office_Book_import_sample.xlsx");
  };
  const downloadCsv = () => {
    const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const csv = [HEADERS, ...sampleRows()].map((r) => r.map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "Office_Book_import_sample.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  /* ----- file padho + jaancho ----- */
  const readFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: true });
      if (!raw.length) return toast.error("The file is empty");
      const head = raw[0].map(norm);
      const col = (names) => head.findIndex((h) => names.includes(h));
      const c = {
        date: col(["date", "tareekh"]),
        side: col(["section", "inout", "type", "side"]),
        cat: col(["category", "categoryname"]),
        item: col(["item", "expense", "expensename", "itemname"]),
        name: col(["name", "fullname", "person", "party"]),
        amount: col(["amount", "rakam", "rs"]),
        mode: col(["payment", "mode", "modeofpayment"]),
        remark: col(["remark", "note", "remarks"]),
      };
      const missing = ["side", "cat", "item", "name", "amount", "mode"].filter((k) => c[k] < 0);
      if (missing.length) return toast.error(`Columns missing: ${missing.join(", ")}. Use the sample file.`);
      const out = [];
      raw.slice(1).forEach((r, i) => {
        if (r.every((x) => String(x).trim() === "")) return;
        const errors = [];
        const d = toDate(c.date >= 0 ? r[c.date] : "", date);
        if (!d) errors.push("Date (DD-MM-YYYY)");
        const sRaw = low(r[c.side]);
        const side = ["in", "money in", "aavak", "jama", "credit"].includes(sRaw) ? "officeIn" : ["out", "money out", "javak", "kharch", "debit"].includes(sRaw) ? "officeOut" : null;
        if (!side) errors.push("Section must be In or Out");
        const list = side === "officeIn" ? lists.in : lists.out;
        const item = side ? list.find((o) => low(o.categoryName) === low(r[c.cat]) && low(o.expenseName) === low(r[c.item])) || list.find((o) => low(o.expenseName) === low(r[c.item])) : null;
        if (side && !item) errors.push(`Item "${String(r[c.item]).trim()}" not in ${side === "officeIn" ? "In" : "Out"} list`);
        const fullname = String(r[c.name] ?? "").trim();
        if (!fullname) errors.push("Name required");
        const amount = num(String(r[c.amount]).replace(/[₹,\s]/g, ""));
        if (!(amount > 0)) errors.push("Amount > 0");
        const mode = OFFICE_MODES.find((m) => low(m) === low(r[c.mode]));
        if (!mode) errors.push(`Payment: ${OFFICE_MODES.join("/")}`);
        if (d && d !== date && !isAdmin) errors.push("Only today's rows (staff)");
        out.push({ rowNo: i + 2, date: d, side, item, fullname, amount, mode, remark: c.remark >= 0 ? String(r[c.remark] ?? "").trim() : "", errors });
      });
      setRows(out);
      setFileName(file.name);
      if (!out.length) toast.error("No rows found in the file");
    } catch (err) {
      toast.error(`Could not read the file: ${err.message}`);
    }
  };

  const good = rows.filter((r) => !r.errors.length);
  const bad = rows.length - good.length;
  const todayRows = good.filter((r) => r.date === date);
  const otherRows = good.filter((r) => r.date !== date);

  const doImport = async () => {
    setBusy(true);
    try {
      const toRow = (r) => ({
        _id: r.item._id,
        expenseName: r.item.expenseName,
        categoryName: r.item.categoryName,
        isVendor: !!r.item.isVendor,
        fullname: r.fullname,
        amount: r.amount,
        modeOfPayment: r.mode,
        remark: r.remark,
      });
      let other = null;
      if (otherRows.length) {
        const { data } = await axios.post(`${API}/import/office-rows`, { rows: otherRows.map((r) => ({ date: r.date, section: r.side, ...toRow(r) })) });
        other = data.summary;
      }
      if (todayRows.length) onAddToday?.(todayRows.map((r) => ({ side: r.side, row: toRow(r) })));
      if (other) onSavedOther?.(other);
      toast.success(
        [todayRows.length && `${todayRows.length} rows added to this day — press Submit/Update`, other && `${other.created} rows saved on ${other.days} other day(s)${other.skipped ? `, ${other.skipped} duplicates skipped` : ""}`]
          .filter(Boolean)
          .join(" · "),
        { duration: 6000 }
      );
      onClose?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorDialog
      open={open}
      onClose={onClose}
      subtitle={`Office Book · ${date}`}
      title="📥 Import from Excel / CSV"
      actions={
        <Button fullWidth variant="contained" disabled={busy || !good.length} onClick={doImport} sx={{ bgcolor: Q.office, py: 1.3, fontWeight: 800, "&:hover": { bgcolor: Q.office } }}>
          {busy ? "Importing…" : good.length ? `Import ${good.length} rows${bad ? ` (skip ${bad} with errors)` : ""}` : "Choose a file"}
        </Button>
      }
    >
      <Stack spacing={2}>
        <Box>
          <Typography fontWeight={800}>1. Download the sample</Typography>
          <Typography variant="caption" color={Q.muted} component="div" sx={{ mb: 1 }}>
            Columns: {HEADERS.join(" · ")}. The Excel sample has a "Valid values" sheet with all categories, items and payment modes.
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadXlsx}>
              Sample Excel
            </Button>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={downloadCsv}>
              Sample CSV
            </Button>
          </Stack>
        </Box>
        <Box>
          <Typography fontWeight={800}>2. Upload your filled file</Typography>
          <Button variant="contained" component="label" startIcon={<UploadFileIcon />} sx={{ mt: 1, bgcolor: Q.office, "&:hover": { bgcolor: Q.office } }}>
            Choose Excel / CSV
            <input hidden type="file" accept=".xlsx,.xls,.csv" onChange={readFile} />
          </Button>
          {fileName && (
            <Typography variant="caption" color={Q.muted} sx={{ ml: 1 }}>
              {fileName}
            </Typography>
          )}
        </Box>
        {rows.length > 0 && (
          <>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip color="success" label={`${good.length} OK`} />
              {bad > 0 && <Chip color="error" label={`${bad} with errors`} />}
              {todayRows.length > 0 && <Chip label={`${todayRows.length} for this day`} />}
              {otherRows.length > 0 && <Chip color="warning" label={`${otherRows.length} for other days (saved directly)`} />}
            </Stack>
            {otherRows.length > 0 && <Alert severity="warning">Rows of other days are saved straight into those days' Office Book (duplicates are skipped).</Alert>}
            <TableContainer sx={{ maxHeight: 360, border: `1px solid ${Q.line}`, borderRadius: 2, bgcolor: "#fff" }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {["Row", "Date", "In/Out", "Item", "Name", "Amount", "Pay", "Check"].map((h) => (
                      <TableCell key={h} sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.rowNo} sx={{ bgcolor: r.errors.length ? "#FEF2F2" : undefined }}>
                      <TableCell>{r.rowNo}</TableCell>
                      <TableCell sx={{ whiteSpace: "nowrap" }}>{r.date || "—"}</TableCell>
                      <TableCell>{r.side === "officeIn" ? "In" : r.side === "officeOut" ? "Out" : "—"}</TableCell>
                      <TableCell>{r.item ? `${r.item.expenseName}` : "—"}</TableCell>
                      <TableCell>{r.fullname}</TableCell>
                      <TableCell>{r.amount > 0 ? inr(r.amount) : "—"}</TableCell>
                      <TableCell>{r.mode || "—"}</TableCell>
                      <TableCell sx={{ color: r.errors.length ? Q.bad : Q.good, fontWeight: 700, minWidth: 140 }}>{r.errors.length ? r.errors.join("; ") : "OK"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        )}
      </Stack>
    </EditorDialog>
  );
};

export default OfficeImportDialog;
