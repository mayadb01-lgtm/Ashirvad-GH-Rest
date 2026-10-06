// Profit & Loss (mahina-wise). Sirf padhta hai.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Typography } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import DownloadIcon from "@mui/icons-material/Download";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine } from "recharts";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { API, COLORS, Kpi, PageTitle, Section, inr, kTick, lakh } from "./shared";

const ProfitLossDashboard = () => {
  const [from, setFrom] = useState(dayjs().subtract(12, "month").startOf("month"));
  const [to, setTo] = useState(dayjs().subtract(1, "month").startOf("month"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/insights/pnl/${from.format("YYYY-MM")}/${to.format("YYYY-MM")}`)
      .then(({ data }) => !off && setData(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "P&L load nahi hua"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [from, to]);

  const t = data?.totals || {};
  const months = data?.months || [];
  const groups = data?.groups || [];
  const chart = useMemo(() => months.map((m) => ({ label: m.label, Kamai: m.revenue, Kharch: m.expenses, Munafa: m.profit, "Personal + Loan ke baad": m.afterLoanPersonal })), [months]);

  // P&L statement rows: [label, key|fn, style]
  const lines = [
    ["KAMAI", null, "head"],
    ["Guest House sales", (m) => m.ghSales],
    ["Restaurant sales", (m) => m.restSales],
    ["Doosri kamai (Banquet, Baada, waghera)", (m) => m.otherIncome],
    ["Kul kamai", (m) => m.revenue, "total"],
    ["KHARCH", null, "head"],
    ...groups.map((g) => [g, (m) => m.exp[g]]),
    ["Kul kharch", (m) => m.expenses, "total"],
    ["MUNAFA (business)", (m) => m.profit, "profit"],
    ["Margin %", (m) => m.margin, "pct"],
    ["NEECHE ALAG (business kharch nahi)", null, "head"],
    ["Loan EMI / bhugtan", (m) => m.loanOut],
    ["Personal nikala", (m) => m.personalOut],
    ["Bacha (sab ke baad)", (m) => m.afterLoanPersonal, "profit"],
  ];
  const totalOf = (fn, style) => (style === "pct" ? t.margin : months.reduce((s, m) => s + (Number(fn(m)) || 0), 0));
  const fmt = (v, style) => (style === "pct" ? `${v ?? 0}%` : inr(v));

  const exportExcel = () => {
    if (!data) return;
    const rows = lines
      .filter(([, fn]) => fn)
      .map(([label, fn, style]) => ({
        "": label,
        ...Object.fromEntries(months.map((m) => [m.label, style === "pct" ? m.margin : Math.round(fn(m) || 0)])),
        Total: style === "pct" ? t.margin : Math.round(totalOf(fn, style)),
      }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "P&L");
    XLSX.writeFile(wb, `PnL_${from.format("MMM-YY")}_to_${to.format("MMM-YY")}.xlsx`);
  };

  const cellSx = (style, v) => ({
    fontWeight: style === "total" || style === "profit" ? 800 : 400,
    color: style === "profit" ? (v >= 0 ? COLORS.net : COLORS.bad) : "inherit",
    whiteSpace: "nowrap",
    borderTop: style === "total" || style === "profit" ? "2px solid #CBD5E1" : undefined,
  });

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Profit & Loss" sub="Kamai − Kharch = Munafa. Personal aur Loan neeche alag, taaki business ka asli munafa dikhe." />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
          <DatePicker label="Se (mahina)" views={["year", "month"]} value={from} onChange={(v) => v && setFrom(v.startOf("month"))} slotProps={{ textField: { size: "small" } }} />
          <DatePicker label="Tak (mahina)" views={["year", "month"]} value={to} onChange={(v) => v && setTo(v.startOf("month"))} slotProps={{ textField: { size: "small" } }} />
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!data}>
            Excel
          </Button>
        </Stack>
      </LocalizationProvider>
      {loading && <Typography color="text.secondary">Load ho raha hai…</Typography>}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="Kul kamai" value={lakh(t.revenue)} color={COLORS.in} />
        <Kpi label="Kul kharch" value={lakh(t.expenses)} color={COLORS.out} />
        <Kpi label="Munafa (business)" value={lakh(t.profit)} sub={`${t.margin || 0}% margin`} color={t.profit >= 0 ? COLORS.net : COLORS.bad} />
        <Kpi label="Personal nikala" value={lakh(t.personalOut)} sub={t.profit > 0 ? `Munafe ka ${Math.round((100 * (t.personalOut || 0)) / t.profit)}%` : ""} color={COLORS.personal} />
        <Kpi label="Bacha (sab ke baad)" value={lakh(t.afterLoanPersonal)} color={t.afterLoanPersonal >= 0 ? COLORS.net : COLORS.bad} />
        <Kpi label="Guest House munafa" value={lakh(t.ghProfit)} sub="GH sales − GH ke seedhe kharch" color={COLORS.gh} />
      </Stack>

      {data && t.personalOut > t.profit && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Is period mein <b>Personal nikala ({lakh(t.personalOut)})</b> business ke munafe ({lakh(t.profit)}) se zyada hai. Farak {lakh(t.personalOut - t.profit)} kahin aur se (loan, purani bachat, udhaar) aaya hoga.
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        Kamai = GH saari sales (udhaar bhi) + Restaurant grand total + Office In ki doosri kamai (Loan, Personal, Pending-vasooli chhod ke). Kharch = jo paisa sach mein diya (Restaurant galle se + upad + Office Out). "GH ..." wali categories Guest House ka seedha kharch maani gayi hain.
      </Alert>

      <Section title="Har mahine: kamai, kharch, munafa">
        <Box sx={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <ComposedChart data={chart} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={kTick} />
              <Tooltip formatter={(v) => inr(v)} />
              <Legend />
              <ReferenceLine y={0} stroke="#94A3B8" />
              <Bar dataKey="Kamai" fill={COLORS.in} />
              <Bar dataKey="Kharch" fill={COLORS.out} />
              <Line dataKey="Munafa" stroke={COLORS.net} strokeWidth={3} />
              <Line dataKey="Personal + Loan ke baad" stroke={COLORS.personal} strokeDasharray="5 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Section>

      <Section title="P&L statement">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, minWidth: 220 }} />
                {months.map((m) => (
                  <TableCell key={m.month} align="right" sx={{ fontWeight: 700 }}>
                    {m.label}
                  </TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 800 }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {lines.map(([label, fn, style]) =>
                style === "head" ? (
                  <TableRow key={label}>
                    <TableCell colSpan={months.length + 2} sx={{ bgcolor: "#F8FAFC", fontWeight: 800, fontSize: 12, letterSpacing: 0.5 }}>
                      {label}
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={label} hover>
                    <TableCell sx={cellSx(style, 0)}>{label}</TableCell>
                    {months.map((m) => {
                      const v = style === "pct" ? m.margin : fn(m);
                      return (
                        <TableCell key={m.month} align="right" sx={cellSx(style, v)}>
                          {fmt(v, style)}
                        </TableCell>
                      );
                    })}
                    <TableCell align="right" sx={{ ...cellSx(style, totalOf(fn, style)), fontWeight: 800 }}>
                      {fmt(totalOf(fn, style), style)}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>
    </Box>
  );
};

export default ProfitLossDashboard;
