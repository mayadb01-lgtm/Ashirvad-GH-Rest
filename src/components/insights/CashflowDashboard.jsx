// Cashflow (mahina-wise): kitna aaya, kitna gaya, kitna bacha. Sirf padhta hai.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine } from "recharts";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { API, COLORS, Kpi, PageTitle, Section, inr, kTick, lakh , MonthRangeBar, MonthStepBar } from "./shared";

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
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load cashflow"))
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
        "Money in (business)": m.aaya,
        "Money out (business)": -m.gaya,
        Personal: -m.personalOut,
        "Loan EMI": -(m.loanOut || 0),
        "Remaining (business)": m.businessNet,
      })),
    [data]
  );
  const outCats = useMemo(() => Object.entries(data?.outByCat || {}).sort((a, b) => b[1] - a[1]), [data]);
  const outTotal = outCats.reduce((s, [, v]) => s + v, 0);

  const exportExcel = () => {
    if (!data) return;
    const rows = data.months.map((m) => ({
      Month: m.label,
      "GH cash/online": m.ghCash,
      "GH old dues received": m.ghJama,
      "GH credit (not yet received)": m.ghUdhaar,
      "Rest (excluding credit)": m.restCash,
      "Rest credit": m.restUdhaar,
      "Office In (business)": m.officeIn,
      "Office: old dues received": m.recoveryIn,
      "Loan received": m.loansIn,
      "Personal money in": m.personalIn,
      "Transfer between own accounts": m.transferIn,
      "MONEY IN (business)": m.aaya,
      "Rest expenses from cash collection": m.restKharch,
      "Rest staff advance": m.restUpad,
      "Office Out (business)": m.officeOut,
      "MONEY OUT (business)": m.gaya,
      "REMAINING (business)": m.businessNet,
      Personal: m.personalOut,
      "Loan EMI": m.loanOut,
      "Net (after loan + personal)": m.net,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const ws2 = XLSX.utils.json_to_sheet(outCats.map(([k, v]) => ({ Category: k, Amount: Math.round(v) })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cashflow");
    XLSX.utils.book_append_sheet(wb, ws2, "Expense categories");
    XLSX.writeFile(wb, `Cashflow_${from.format("MMM-YY")}_to_${to.format("MMM-YY")}.xlsx`);
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Cashflow (monthly)" sub="How much money came in, went out and remained. Personal, loan and transfers are shown separately." />
      <MonthRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo}>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!data}>
          Excel
        </Button>
      </MonthRangeBar>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="Money in (business)" value={lakh(t.aaya)} sub={`Avg ${lakh((t.aaya || 0) / nMonths)} / month`} color={COLORS.in} />
        <Kpi label="Money out (business)" value={lakh(t.gaya)} sub={`Avg ${lakh((t.gaya || 0) / nMonths)} / month`} color={COLORS.out} />
        <Kpi label="Remaining (business)" value={lakh(t.businessNet)} sub={t.aaya ? `${Math.round((100 * t.businessNet) / t.aaya)}% margin` : ""} color={t.businessNet >= 0 ? COLORS.net : COLORS.bad} />
        <Kpi label="Personal withdrawals" value={lakh(t.personalOut)} sub={t.businessNet ? `${Math.round((100 * t.personalOut) / Math.max(t.businessNet, 1))}% of savings` : ""} color={COLORS.personal} />
        <Kpi label="Personal money in" value={lakh(t.personalIn)} sub="Not business" color={COLORS.personal} />
        <Kpi label="Loan received" value={lakh(t.loansIn)} color={COLORS.loan} />
        <Kpi label="Loan EMI paid" value={lakh(t.loanOut)} color={COLORS.loan} />
        <Kpi label="Credit (still to collect)" value={lakh((t.ghUdhaar || 0) + (t.restUdhaar || 0))} sub="GH + Rest credit sales" />
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        <b>Money in</b> = GH (cash/online + old dues received) + Restaurant (excluding credit) + Office In business lines + old dues received in Office.{" "}
        <b>Money out</b> = Restaurant expenses from cash collection + staff advance + Office Out business lines. Personal, Loan, Loan EMI and transfers between your own accounts are kept separate. Which Office line is which is set on the <b>Office category types</b> page.
      </Alert>

      <Section title="Monthly money in vs money out">
        {loading ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>Loading…</Typography>
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
                <Bar dataKey="Money in (business)" fill={COLORS.in} stackId="a" />
                <Bar dataKey="Money out (business)" fill={COLORS.out} stackId="a" />
                <Bar dataKey="Personal" fill={COLORS.personal} stackId="a" />
                <Bar dataKey="Loan EMI" fill={COLORS.loan} stackId="a" />
                <Line dataKey="Remaining (business)" stroke={COLORS.net} strokeWidth={3} dot />
              </ComposedChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Section>

      <Section title="Monthly summary">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Month", "GH", "Restaurant", "Office In", "Money in", "Rest expenses + advance", "Office Out", "Money out", "Remaining", "Personal in", "Personal out", "Loan in", "Loan EMI", "Net"].map((h) => (
                  <TableCell key={h} align={h === "Month" ? "left" : "right"} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
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
                  <TableCell align="right">{inr(m.officeIn + (m.recoveryIn || 0))}</TableCell>
                  <TableCell align="right" sx={{ color: COLORS.in, fontWeight: 700 }}>{inr(m.aaya)}</TableCell>
                  <TableCell align="right">{inr(m.restKharch + m.restUpad)}</TableCell>
                  <TableCell align="right">{inr(m.officeOut)}</TableCell>
                  <TableCell align="right" sx={{ color: COLORS.out, fontWeight: 700 }}>{inr(m.gaya)}</TableCell>
                  <TableCell align="right" sx={{ color: m.businessNet >= 0 ? COLORS.net : COLORS.bad, fontWeight: 800 }}>{inr(m.businessNet)}</TableCell>
                  <TableCell align="right" sx={{ color: COLORS.personal }}>{inr(m.personalIn)}</TableCell>
                  <TableCell align="right" sx={{ color: COLORS.personal }}>{inr(m.personalOut)}</TableCell>
                  <TableCell align="right">{inr(m.loansIn)}</TableCell>
                  <TableCell align="right">{inr(m.loanOut)}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: m.net >= 0 ? COLORS.net : COLORS.bad }}>{inr(m.net)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section title="Where the money went (Office Out by category)">
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
