// Cashflow (mahina-wise): kitna aaya, kitna gaya, kitna bacha. Sirf padhta hai.
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

const CashflowDashboard = () => {
  const [from, setFrom] = useState(dayjs().subtract(11, "month").startOf("month"));
  const [to, setTo] = useState(dayjs().startOf("month"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/insights/cashflow/${from.format("YYYY-MM")}/${to.format("YYYY-MM")}`)
      .then(({ data }) => !off && setData(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Cashflow load nahi hua"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [from, to]);

  const t = data?.totals || {};
  const nMonths = data?.months?.length || 1;
  const chart = useMemo(
    () =>
      (data?.months || []).map((m) => ({
        label: m.label,
        "Aaya (business)": m.aaya,
        "Gaya (business)": -m.gaya,
        Personal: -m.personalOut,
        "Bacha (business)": m.businessNet,
      })),
    [data]
  );
  const outCats = useMemo(() => Object.entries(data?.outByCat || {}).sort((a, b) => b[1] - a[1]), [data]);
  const outTotal = outCats.reduce((s, [, v]) => s + v, 0);

  const exportExcel = () => {
    if (!data) return;
    const rows = data.months.map((m) => ({
      Mahina: m.label,
      "GH naqad/online": m.ghCash,
      "GH purana baaki aaya": m.ghJama,
      "GH udhaar (abhi nahi aaya)": m.ghUdhaar,
      "Rest (udhaar chhod ke)": m.restCash,
      "Rest udhaar": m.restUdhaar,
      "Office In": m.officeIn,
      "Loan aaya": m.loansIn,
      "AAYA (business)": m.aaya,
      "Rest galle se kharch": m.restKharch,
      "Rest upad": m.restUpad,
      "Office Out (personal chhod ke)": m.officeOut,
      "GAYA (business)": m.gaya,
      "BACHA (business)": m.businessNet,
      Personal: m.personalOut,
      "Net (loan + personal ke baad)": m.net,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const ws2 = XLSX.utils.json_to_sheet(outCats.map(([k, v]) => ({ Category: k, Amount: Math.round(v) })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cashflow");
    XLSX.utils.book_append_sheet(wb, ws2, "Kharch category");
    XLSX.writeFile(wb, `Cashflow_${from.format("MMM-YY")}_to_${to.format("MMM-YY")}.xlsx`);
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Cashflow (mahina-wise)" sub="Kitna paisa aaya, kitna gaya, kitna bacha. Loan aur Personal alag dikhaye hain." />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
          <DatePicker label="Se (mahina)" views={["year", "month"]} value={from} onChange={(v) => v && setFrom(v.startOf("month"))} slotProps={{ textField: { size: "small" } }} />
          <DatePicker label="Tak (mahina)" views={["year", "month"]} value={to} onChange={(v) => v && setTo(v.startOf("month"))} slotProps={{ textField: { size: "small" } }} />
          <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!data}>
            Excel
          </Button>
        </Stack>
      </LocalizationProvider>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="Aaya (business)" value={lakh(t.aaya)} sub={`Avg ${lakh((t.aaya || 0) / nMonths)} / mahina`} color={COLORS.in} />
        <Kpi label="Gaya (business)" value={lakh(t.gaya)} sub={`Avg ${lakh((t.gaya || 0) / nMonths)} / mahina`} color={COLORS.out} />
        <Kpi label="Bacha (business)" value={lakh(t.businessNet)} sub={t.aaya ? `${Math.round((100 * t.businessNet) / t.aaya)}% margin` : ""} color={t.businessNet >= 0 ? COLORS.net : COLORS.bad} />
        <Kpi label="Personal nikala" value={lakh(t.personalOut)} sub={t.businessNet ? `Bachat ka ${Math.round((100 * t.personalOut) / Math.max(t.businessNet, 1))}%` : ""} color={COLORS.personal} />
        <Kpi label="Loan aaya" value={lakh(t.loansIn)} color={COLORS.loan} />
        <Kpi label="Udhaar (abhi aana baaki)" value={lakh((t.ghUdhaar || 0) + (t.restUdhaar || 0))} sub="GH + Rest udhaar sales" />
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        <b>Aaya</b> = GH (naqad/online + purana baaki aaya) + Restaurant (udhaar chhod ke) + Office In (loan chhod ke).{" "}
        <b>Gaya</b> = Restaurant galle se kharch + upad + Office Out (Personal chhod ke). Ek business se doosre mein gaya paisa agar Office Book mein bhi likha ho to wo do baar gina ja sakta hai.
      </Alert>

      <Section title="Har mahine: aaya vs gaya">
        {loading ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>Load ho raha hai…</Typography>
        ) : (
          <Box sx={{ width: "100%", height: 360 }}>
            <ResponsiveContainer>
              <ComposedChart data={chart} stackOffset="sign" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={kTick} />
                <Tooltip formatter={(v) => inr(Math.abs(v))} />
                <Legend />
                <ReferenceLine y={0} stroke="#94A3B8" />
                <Bar dataKey="Aaya (business)" fill={COLORS.in} stackId="a" />
                <Bar dataKey="Gaya (business)" fill={COLORS.out} stackId="a" />
                <Bar dataKey="Personal" fill={COLORS.personal} stackId="a" />
                <Line dataKey="Bacha (business)" stroke={COLORS.net} strokeWidth={3} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Section>

      <Section title="Mahina-wise hisaab">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Mahina", "GH", "Restaurant", "Office In", "Aaya", "Rest kharch+upad", "Office Out", "Gaya", "Bacha", "Personal", "Loan", "Net"].map((h) => (
                  <TableCell key={h} align={h === "Mahina" ? "left" : "right"} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.months || []).map((m) => (
                <TableRow key={m.month} hover>
                  <TableCell>{m.label}</TableCell>
                  <TableCell align="right">{inr(m.ghCash + m.ghJama)}</TableCell>
                  <TableCell align="right">{inr(m.restCash)}</TableCell>
                  <TableCell align="right">{inr(m.officeIn)}</TableCell>
                  <TableCell align="right" sx={{ color: COLORS.in, fontWeight: 700 }}>{inr(m.aaya)}</TableCell>
                  <TableCell align="right">{inr(m.restKharch + m.restUpad)}</TableCell>
                  <TableCell align="right">{inr(m.officeOut)}</TableCell>
                  <TableCell align="right" sx={{ color: COLORS.out, fontWeight: 700 }}>{inr(m.gaya)}</TableCell>
                  <TableCell align="right" sx={{ color: m.businessNet >= 0 ? COLORS.net : COLORS.bad, fontWeight: 800 }}>{inr(m.businessNet)}</TableCell>
                  <TableCell align="right" sx={{ color: COLORS.personal }}>{inr(m.personalOut)}</TableCell>
                  <TableCell align="right">{inr(m.loansIn)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: m.net >= 0 ? COLORS.net : COLORS.bad }}>{inr(m.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title="Paisa kahan gaya (Office Out category-wise)">
        <Stack spacing={0.75}>
          {outCats.map(([k, v]) => (
            <Box key={k}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" fontWeight={/^personal/i.test(k) ? 800 : 500} color={/^personal/i.test(k) ? COLORS.personal : "text.primary"}>
                  {k}
                </Typography>
                <Typography variant="body2">
                  {inr(v)} · {outTotal ? Math.round((100 * v) / outTotal) : 0}%
                </Typography>
              </Stack>
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: "#F1F5F9" }}>
                <Box sx={{ height: 8, borderRadius: 4, width: `${outTotal ? (100 * v) / outTotal : 0}%`, bgcolor: /^personal/i.test(k) ? COLORS.personal : COLORS.out }} />
              </Box>
            </Box>
          ))}
        </Stack>
      </Section>
    </Box>
  );
};

export default CashflowDashboard;
