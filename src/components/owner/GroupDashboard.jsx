// 🏨🏨 Group: sab hotels ek jagah (sirf malik). Har hotel ka data apne server / database mein — yahan sirf totals.
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, CircularProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, LineChart, Line } from "recharts";
import { API, Kpi, PageTitle, Section, inr, lakh, kTick, PALETTE } from "../insights/shared";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const lbl = (ym) => `${MON[+ym.slice(5, 7) - 1]} ${ym.slice(2, 4)}`;
const pct = (v) => (v == null || !isFinite(v) ? "—" : `${(v * 100).toFixed(0)}%`);
const chg = (a, b) => (b ? (a / b - 1) * 100 : null);
const ChgText = ({ v }) => (v == null ? <span style={{ color: "#94A3B8" }}>—</span> : <b style={{ color: v >= 0 ? "#15803D" : "#B91C1C" }}>{v >= 0 ? "+" : "−"}{Math.abs(v).toFixed(0)}%</b>);

const GroupDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [metric, setMetric] = useState("sale");

  const load = () => {
    setLoading(true);
    setErr("");
    axios
      .get(`${API}/group/dashboard`)
      .then(({ data }) => setData(data.data))
      .catch((e) => setErr(e?.response?.data?.message || "Could not load the group dashboard"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const v = useMemo(() => {
    if (!data) return null;
    const ok = data.hotels.filter((h) => h.ok).map((h, i) => ({ ...h.data, color: PALETTE[i % PALETTE.length] }));
    const bad = data.hotels.filter((h) => !h.ok);
    const sum = (f) => ok.reduce((t, h) => t + (Number(f(h)) || 0), 0);
    // pichhle 12 poore mahine (jo kisi bhi hotel mein hain)
    const allMonths = [...new Set(ok.flatMap((h) => h.months.map((m) => m.month)))].sort();
    const last12 = allMonths.slice(-12);
    const get = (h, ym) => h.months.find((m) => m.month === ym);
    const chart = last12.map((ym) => {
      const row = { month: lbl(ym) };
      ok.forEach((h) => (row[h.name] = get(h, ym)?.[metric] ?? null));
      row.total = ok.reduce((t, h) => t + (get(h, ym)?.[metric] || 0), 0);
      return row;
    });
    // is saal ab tak vs pichhle saal same mahine (poore mahine)
    const yr = last12.length ? last12.at(-1).slice(0, 4) : null;
    const ytd = ok.map((h) => {
      const ms = h.months.filter((m) => m.month.slice(0, 4) === yr);
      const cur = ms.reduce((t, m) => t + m.sale, 0);
      const prev = ms.reduce((t, m) => t + (get(h, `${+yr - 1}${m.month.slice(4)}`)?.sale || 0), 0);
      const kh = ms.reduce((t, m) => t + m.kharch, 0);
      return { name: h.name, color: h.color, months: ms.length, cur, prev, kharch: kh };
    });
    return { ok, bad, sum, last12, chart, ytd, yr, get };
  }, [data, metric]);

  if (loading && !data) return <Box sx={{ p: 4, textAlign: "center" }}><CircularProgress /></Box>;
  if (err) return <Alert severity="error" sx={{ m: 2 }} action={<Button onClick={load}>Retry</Button>}>{err}</Alert>;
  if (!v) return null;
  const { ok, bad, sum } = v;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: "grid", gap: 2 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
        <PageTitle title="Group · all hotels" sub={`${ok.map((h) => h.name).join(" + ")} · each hotel's data stays in its own system, only totals are shown here`} />
        <Button startIcon={<RefreshIcon />} onClick={load} disabled={loading} variant="outlined">Refresh</Button>
      </Stack>

      {data.connected === 0 && <Alert severity="info">Only this hotel is connected so far.</Alert>}
      {bad.map((b) => <Alert key={b.name} severity="warning">{b.name}: could not load ({b.message}). Other hotels are shown.</Alert>)}

      {/* Aaj / kal / is mahine */}
      <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
        <Kpi label="Today · all hotels" value={inr(sum((h) => h.todayFig.gh + h.todayFig.rest + h.todayFig.banquet))} sub="entries saved so far" />
        <Kpi label="Yesterday · all hotels" value={inr(sum((h) => h.yesterday.gh + h.yesterday.rest + h.yesterday.banquet))} />
        <Kpi label="This month so far" value={lakh(sum((h) => h.mtd.sale))} sub={`GH ${lakh(sum((h) => h.mtd.gh))} · Rest ${lakh(sum((h) => h.mtd.rest))}`} />
        <Kpi label={`${v.yr} so far (full months)`} value={lakh(v.ytd.reduce((t, r) => t + r.cur, 0))} sub={<>vs same months last year <ChgText v={chg(v.ytd.reduce((t, r) => t + r.cur, 0), v.ytd.reduce((t, r) => t + r.prev, 0))} /></>} />
      </Box>

      <Section title="Hotel by hotel">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Hotel</TableCell>
                <TableCell align="right">Today</TableCell>
                <TableCell align="right">Yesterday</TableCell>
                <TableCell align="right">This month: GH</TableCell>
                <TableCell align="right">Restaurant</TableCell>
                <TableCell align="right">Banquet</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell align="right">Room occupancy</TableCell>
                <TableCell align="right">{v.yr} vs last year</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {ok.map((h) => {
                const y = v.ytd.find((r) => r.name === h.name);
                return (
                  <TableRow key={h.name}>
                    <TableCell><Stack direction="row" spacing={1} alignItems="center"><Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: h.color }} /><b>{h.name}</b></Stack></TableCell>
                    <TableCell align="right">{inr(h.todayFig.gh + h.todayFig.rest + h.todayFig.banquet)}</TableCell>
                    <TableCell align="right">{inr(h.yesterday.gh + h.yesterday.rest + h.yesterday.banquet)}</TableCell>
                    <TableCell align="right">{inr(h.mtd.gh)}</TableCell>
                    <TableCell align="right">{inr(h.mtd.rest)}</TableCell>
                    <TableCell align="right">{inr(h.mtd.banquet)}</TableCell>
                    <TableCell align="right"><b>{inr(h.mtd.sale)}</b></TableCell>
                    <TableCell align="right">{pct(h.mtd.occupancy)}</TableCell>
                    <TableCell align="right"><ChgText v={chg(y?.cur, y?.prev)} /></TableCell>
                  </TableRow>
                );
              })}
              <TableRow sx={{ "& td": { fontWeight: 800, borderTop: "2px solid #CBD5E1" } }}>
                <TableCell>All hotels</TableCell>
                <TableCell align="right">{inr(sum((h) => h.todayFig.gh + h.todayFig.rest + h.todayFig.banquet))}</TableCell>
                <TableCell align="right">{inr(sum((h) => h.yesterday.gh + h.yesterday.rest + h.yesterday.banquet))}</TableCell>
                <TableCell align="right">{inr(sum((h) => h.mtd.gh))}</TableCell>
                <TableCell align="right">{inr(sum((h) => h.mtd.rest))}</TableCell>
                <TableCell align="right">{inr(sum((h) => h.mtd.banquet))}</TableCell>
                <TableCell align="right">{inr(sum((h) => h.mtd.sale))}</TableCell>
                <TableCell />
                <TableCell align="right"><ChgText v={chg(v.ytd.reduce((t, r) => t + r.cur, 0), v.ytd.reduce((t, r) => t + r.prev, 0))} /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary">"Today" counts only entries already saved. "vs last year" compares the full months of {v.yr} with the same months of {+v.yr - 1}.</Typography>
      </Section>

      <Section
        title="Last 12 months"
        right={
          <ToggleButtonGroup size="small" exclusive value={metric} onChange={(e, x) => x && setMetric(x)}>
            <ToggleButton value="sale">Total sale</ToggleButton>
            <ToggleButton value="gh">Guest house</ToggleButton>
            <ToggleButton value="rest">Restaurant</ToggleButton>
            <ToggleButton value="kharch">Kharch</ToggleButton>
          </ToggleButtonGroup>
        }
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={v.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEF2F7" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={kTick} width={50} />
            <Tooltip formatter={(val, name) => [inr(val), name]} />
            <Legend />
            {ok.map((h, i) => <Bar key={h.name} dataKey={h.name} stackId="a" fill={h.color} radius={i === ok.length - 1 ? [4, 4, 0, 0] : 0} maxBarSize={48} />)}
          </BarChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Hotels side by side (per month)">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={v.chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEF2F7" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={kTick} width={50} />
            <Tooltip formatter={(val, name) => [inr(val), name]} />
            <Legend />
            {ok.map((h) => <Line key={h.name} type="monotone" dataKey={h.name} stroke={h.color} strokeWidth={2.5} dot={{ r: 3 }} connectNulls />)}
          </LineChart>
        </ResponsiveContainer>
      </Section>

      <Section title="Month table">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                {ok.map((h) => <TableCell key={h.name} align="right" colSpan={2}><b style={{ color: h.color }}>{h.name}</b></TableCell>)}
                <TableCell align="right">All hotels</TableCell>
              </TableRow>
              <TableRow>
                <TableCell />
                {ok.map((h) => [<TableCell key={h.name + "s"} align="right">Sale</TableCell>, <TableCell key={h.name + "k"} align="right">Kharch ÷ sale</TableCell>])}
                <TableCell align="right">Sale</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...v.last12].reverse().map((ym) => (
                <TableRow key={ym}>
                  <TableCell>{lbl(ym)}</TableCell>
                  {ok.map((h) => {
                    const m = v.get(h, ym);
                    return [
                      <TableCell key={h.name + "s"} align="right">{m ? inr(m.sale) : "—"}</TableCell>,
                      <TableCell key={h.name + "k"} align="right">{m && m.sale && m.kharch ? `${((m.kharch / m.sale) * 100).toFixed(0)}%` : "—"}</TableCell>,
                    ];
                  })}
                  <TableCell align="right"><b>{inr(ok.reduce((t, h) => t + (v.get(h, ym)?.sale || 0), 0))}</b></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary">Kharch = restaurant + office + upad (personal and construction not included). Old months come from Tally where the app has no data.</Typography>
      </Section>
    </Box>
  );
};

export default GroupDashboard;
