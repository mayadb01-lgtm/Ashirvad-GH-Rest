// Profit & Loss (mahina-wise). Sirf padhta hai.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ReferenceLine } from "recharts";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { API, COLORS, Kpi, PageTitle, Section, inr, kTick, lakh , MonthRangeBar, MonthStepBar } from "./shared";

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
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load P&L"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [from, to]);

  const t = data?.totals || {};
  const months = data?.months || [];
  const groups = data?.groups || [];
  const chart = useMemo(() => months.map((m) => ({ label: m.label, Revenue: m.revenue, Expenses: m.expenses, Profit: m.profit, "After personal + loan": m.afterLoanPersonal })), [months]);

  // P&L statement rows: [label, key|fn, style]
  const lines = [
    ["REVENUE", null, "head"],
    ["Guest House sales", (m) => m.ghSales],
    ["GH extra charges (extra bed, laundry…)", (m) => m.ghExtra || 0],
    [`Less: GH discount on bills${data?.discountFrom ? ` (from ${data.discountFrom})` : ""}`, (m) => -(m.ghDiscount || 0)],
    ["Restaurant sales", (m) => m.restSales],
    ["Other income (Banquet, Baada, etc.)", (m) => m.otherIncome],
    ["Total revenue", (m) => m.revenue, "total"],
    ["EXPENSES", null, "head"],
    ...groups.map((g) => [g, (m) => m.exp[g]]),
    ["Total expenses", (m) => m.expenses, "total"],
    ["PROFIT (business)", (m) => m.profit, "profit"],
    ["Margin %", (m) => m.margin, "pct"],
    ["SHOWN SEPARATELY (not business expenses)", null, "head"],
    ["Loan EMI / repayment", (m) => m.loanOut],
    ["Personal withdrawals", (m) => m.personalOut],
    ["Remaining (after all)", (m) => m.afterLoanPersonal, "profit"],
  ];
  const totalOf = (fn, style) => (style === "pct" ? t.margin : months.reduce((s, m) => s + (Number(fn(m)) || 0), 0));
  const fmt = (v, style) => (style === "pct" ? `${v ?? 0}%` : v < 0 ? `− ${inr(-v)}` : inr(v));

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
      <PageTitle title="Profit & Loss" sub="Revenue − Expenses = Profit. Personal and loan are shown separately below, so the real business profit is clear." />
      <MonthRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo}>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!data}>
          Excel
        </Button>
      </MonthRangeBar>
      {loading && <Typography color="text.secondary">Loading…</Typography>}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="Total revenue" value={lakh(t.revenue)} color={COLORS.in} />
        <Kpi label="Total expenses" value={lakh(t.expenses)} color={COLORS.out} />
        <Kpi label="Profit (business)" value={lakh(t.profit)} sub={`${t.margin || 0}% margin`} color={t.profit >= 0 ? COLORS.net : COLORS.bad} />
        <Kpi label="Personal withdrawals" value={lakh(t.personalOut)} sub={t.profit > 0 ? `${Math.round((100 * (t.personalOut || 0)) / t.profit)}% of profit` : ""} color={COLORS.personal} />
        <Kpi label="Remaining (after all)" value={lakh(t.afterLoanPersonal)} color={t.afterLoanPersonal >= 0 ? COLORS.net : COLORS.bad} />
        <Kpi label="Guest House profit" value={lakh(t.ghProfit)} sub="GH sales − GH direct expenses" color={COLORS.gh} />
      </Stack>

      {data && t.personalOut > t.profit && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          In this period, <b>personal withdrawals ({lakh(t.personalOut)})</b> are more than the business profit ({lakh(t.profit)}). The difference of {lakh(t.personalOut - t.profit)} must have come from elsewhere (loan, old savings, credit).
        </Alert>
      )}
      <Alert severity="info" sx={{ mb: 2 }}>
        Revenue = all GH sales (including credit) + Restaurant grand total + other Office In income (excluding Loan, Personal and Pending collections). Expenses = money actually paid (Restaurant cash collection + staff advance + Office Out). Categories starting with "GH ..." are counted as direct Guest House expenses.
      </Alert>

      <Section title="Monthly revenue, expenses and profit">
        <Box sx={{ width: "100%", height: 340 }}>
          <ResponsiveContainer>
            <ComposedChart data={chart} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis tickFormatter={kTick} />
              <Tooltip formatter={(v) => inr(v)} />
              <Legend />
              <ReferenceLine y={0} stroke="#94A3B8" />
              <Bar dataKey="Revenue" fill={COLORS.in} />
              <Bar dataKey="Expenses" fill={COLORS.out} />
              <Line dataKey="Profit" stroke={COLORS.net} strokeWidth={3} />
              <Line dataKey="After personal + loan" stroke={COLORS.personal} strokeDasharray="5 4" />
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
