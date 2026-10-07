// Monthly balance: Cash / PP / PPS / PPC mein mahina-wise kitna aaya, kitna gaya, kitna bacha. Card ka paisa PP mein. Sirf padhta hai.
import { Fragment, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { API, COLORS, Kpi, PageTitle, Section, inr, kTick, lakh, MonthRangeBar } from "./shared";

const MODE_COLOR = { Cash: "#16A34A", PP: "#2563EB", PPS: "#9333EA", PPC: "#EA580C" };
// Kaunsa mode kis account mein (owner ne bataya)
const ACC = { Cash: "Cash in hand", PP: "Restaurant a/c (UPI + all card)", PPS: "GH saving a/c (non-GST)", PPC: "GH current a/c" };

const ModeBalanceDashboard = () => {
  const [from, setFrom] = useState(dayjs().subtract(5, "month").startOf("month"));
  const [to, setTo] = useState(dayjs().startOf("month"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/insights/mode-balance/${from.format("YYYY-MM")}/${to.format("YYYY-MM")}`)
      .then(({ data: r }) => !off && setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load balance"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [from, to]);

  const modes = data?.modes || ["Cash", "PP", "PPS", "PPC"];
  const months = data?.months || [];
  const t = data?.totals || {};
  const chart = useMemo(() => months.map((m) => ({ label: m.label, ...Object.fromEntries(modes.map((k) => [k, m.modes[k].net])) })), [months, modes]);

  const exportExcel = () => {
    if (!data) return;
    const rows = months.map((m) => ({
      Month: m.label,
      ...Object.fromEntries(modes.flatMap((k) => [[`${k} in`, m.modes[k].in], [`${k} out`, m.modes[k].out], [`${k} balance`, m.modes[k].net]])),
      "Total in": m.totalIn,
      "Total out": m.totalOut,
      "Total balance": m.net,
    }));
    rows.push({
      Month: "TOTAL",
      ...Object.fromEntries(modes.flatMap((k) => [[`${k} in`, t[k]?.in], [`${k} out`, t[k]?.out], [`${k} balance`, t[k]?.net]])),
      "Total in": data.totalIn,
      "Total out": data.totalOut,
      "Total balance": data.totalIn - data.totalOut,
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Monthly balance");
    XLSX.writeFile(wb, `Monthly_balance_${from.format("MMM-YY")}_to_${to.format("MMM-YY")}.xlsx`);
  };

  const cell = { whiteSpace: "nowrap", textAlign: "right" };
  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Monthly balance (Cash / PP / PPS / PPC)" sub="Money in and out for each payment mode, month by month. Card payments are counted in PP." />
      <MonthRangeBar from={from} to={to} setFrom={setFrom} setTo={setTo}>
        <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!data}>
          Excel
        </Button>
      </MonthRangeBar>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {modes.map((k) => (
          <Kpi key={k} label={`${k} · ${ACC[k]}`} value={lakh(t[k]?.net)} sub={`In ${lakh(t[k]?.in)} · Out ${lakh(t[k]?.out)}`} color={MODE_COLOR[k]} />
        ))}
        <Kpi label="Total balance" value={lakh((data?.totalIn || 0) - (data?.totalOut || 0))} sub={`In ${lakh(data?.totalIn)} · Out ${lakh(data?.totalOut)}`} color={COLORS.net} />
      </Stack>

      <Alert severity="info" sx={{ mb: 2 }}>
        <b>In</b> = GH room payments and old dues received (by mode) + Restaurant cash collection (incl. cash paid out for expenses/advance) and Card + PP → PP + Office In (by mode, including personal / loan / transfers — it is real money in that account).{" "}
        <b>Out</b> = Restaurant expenses + staff advance (Cash) + Office Out (by mode). Unpaid / credit is not counted until it is received.
      </Alert>

      <Section title="Balance by month">
        {loading ? (
          <Typography color="text.secondary" sx={{ py: 6, textAlign: "center" }}>Loading…</Typography>
        ) : (
          <Box sx={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={chart} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={kTick} />
                <Tooltip formatter={(v) => inr(v)} />
                <Legend />
                {modes.map((k) => (
                  <Bar key={k} dataKey={k} fill={MODE_COLOR[k]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </Box>
        )}
      </Section>

      <Section title="Month-wise table">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2} sx={{ fontWeight: 800 }}>
                  Month
                </TableCell>
                {modes.map((k) => (
                  <TableCell key={k} colSpan={3} align="center" sx={{ fontWeight: 800, color: MODE_COLOR[k], borderLeft: "1px solid #E5E7EB" }}>
                    {k}
                    <Typography variant="caption" display="block" color="text.secondary">
                      {ACC[k]}
                    </Typography>
                  </TableCell>
                ))}
                <TableCell colSpan={3} align="center" sx={{ fontWeight: 800, borderLeft: "1px solid #E5E7EB" }}>
                  Total
                </TableCell>
              </TableRow>
              <TableRow>
                {[...modes, "Total"].map((k) =>
                  ["In", "Out", "Balance"].map((h, i) => (
                    <TableCell key={k + h} sx={{ ...cell, fontWeight: 700, borderLeft: i === 0 ? "1px solid #E5E7EB" : undefined }}>
                      {h}
                    </TableCell>
                  ))
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m.month} hover>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>{m.label}</TableCell>
                  {modes.map((k) => (
                    <Fragment key={k}>
                      <TableCell key={k + "i"} sx={{ ...cell, borderLeft: "1px solid #E5E7EB" }}>{inr(m.modes[k].in)}</TableCell>
                      <TableCell key={k + "o"} sx={cell}>{inr(m.modes[k].out)}</TableCell>
                      <TableCell key={k + "n"} sx={{ ...cell, fontWeight: 700, color: m.modes[k].net >= 0 ? COLORS.net : COLORS.bad }}>{inr(m.modes[k].net)}</TableCell>
                    </Fragment>
                  ))}
                  <TableCell sx={{ ...cell, borderLeft: "1px solid #E5E7EB" }}>{inr(m.totalIn)}</TableCell>
                  <TableCell sx={cell}>{inr(m.totalOut)}</TableCell>
                  <TableCell sx={{ ...cell, fontWeight: 800, color: m.net >= 0 ? COLORS.net : COLORS.bad }}>{inr(m.net)}</TableCell>
                </TableRow>
              ))}
              {data && (
                <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                  <TableCell sx={{ fontWeight: 800 }}>Total</TableCell>
                  {modes.map((k) => (
                    <Fragment key={k}>
                      <TableCell key={k + "ti"} sx={{ ...cell, fontWeight: 800, borderLeft: "1px solid #E5E7EB" }}>{inr(t[k]?.in)}</TableCell>
                      <TableCell key={k + "to"} sx={{ ...cell, fontWeight: 800 }}>{inr(t[k]?.out)}</TableCell>
                      <TableCell key={k + "tn"} sx={{ ...cell, fontWeight: 800 }}>{inr(t[k]?.net)}</TableCell>
                    </Fragment>
                  ))}
                  <TableCell sx={{ ...cell, fontWeight: 800, borderLeft: "1px solid #E5E7EB" }}>{inr(data.totalIn)}</TableCell>
                  <TableCell sx={{ ...cell, fontWeight: 800 }}>{inr(data.totalOut)}</TableCell>
                  <TableCell sx={{ ...cell, fontWeight: 800 }}>{inr(data.totalIn - data.totalOut)}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      {data && (
        <Section title="Where it came from (whole period)">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Mode", "GH in", "Restaurant in", "Office in (business)", "Office in (personal / loan / transfer)", "Restaurant out", "Office out (business)", "Office out (personal / EMI / transfer)"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 800, textAlign: h === "Mode" ? "left" : "right" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {modes.map((k) => (
                  <TableRow key={k}>
                    <TableCell sx={{ fontWeight: 800, color: MODE_COLOR[k] }}>{k}</TableCell>
                    {["gh", "rest", "office", "officeP", "restOut", "officeOut", "officeOutP"].map((s) => (
                      <TableCell key={s} sx={cell}>
                        {inr(t[k]?.src?.[s])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Section>
      )}
    </Box>
  );
};

export default ModeBalanceDashboard;
