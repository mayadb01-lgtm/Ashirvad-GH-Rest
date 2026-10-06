import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip as MuiTooltip,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PrintIcon from "@mui/icons-material/Print";
import DownloadIcon from "@mui/icons-material/Download";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

// Each business keeps one colour everywhere on the page
const C = {
  gh: "#0F766E", // guest house – teal
  rest: "#B45309", // restaurant – amber
  office: "#4338CA", // office/banquet – indigo
  ink: "#1E293B",
  muted: "#64748B",
  grid: "#E2E8F0",
  good: "#15803D",
  bad: "#B91C1C",
  warn: "#A16207",
  bg: "#F8FAFC",
};
const MIX = ["#0F766E", "#14B8A6", "#5EEAD4", "#B45309", "#F59E0B", "#4338CA", "#818CF8", "#94A3B8"];

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const short = (n) => {
  const v = Math.abs(n || 0);
  if (v >= 1e7) return "₹" + (n / 1e7).toFixed(1) + "Cr";
  if (v >= 1e5) return "₹" + (n / 1e5).toFixed(1) + "L";
  if (v >= 1e3) return "₹" + (n / 1e3).toFixed(0) + "k";
  return "₹" + Math.round(n || 0);
};
const toRows = (obj) =>
  Object.entries(obj || {})
    .map(([name, value]) => ({ name, value }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);

/* ---------------- small building blocks ---------------- */

const Panel = ({ title, subtitle, action, children, minHeight }) => (
  <Paper
    variant="outlined"
    sx={{ p: 2, height: "100%", minHeight, borderColor: C.grid, borderRadius: 2, breakInside: "avoid" }}
  >
    <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1.5 }}>
      <Box>
        <Typography variant="subtitle1" fontWeight={700} color={C.ink}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color={C.muted}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {action}
    </Stack>
    {children}
  </Paper>
);

const ChartTooltip = ({ active, payload, label, labelFn }) => {
  if (!active || !payload?.length) return null;
  return (
    <Paper sx={{ p: 1.2, fontSize: 13 }} elevation={3}>
      <Typography variant="caption" fontWeight={700} display="block">
        {labelFn ? labelFn(label) : label}
      </Typography>
      {payload.map((p) => (
        <Stack key={p.dataKey} direction="row" spacing={1} alignItems="center">
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: p.color || p.fill }} />
          <span>{p.name}:</span>
          <b>{typeof p.value === "number" && p.dataKey !== "occupancy" ? inr(p.value) : p.value}</b>
        </Stack>
      ))}
    </Paper>
  );
};

const Kpi = ({ label, value, prev, format = inr, color = C.ink, spark, sparkKey, invert, suffix }) => {
  const change = prev ? ((value - prev) / prev) * 100 : null;
  const good = change === null ? null : invert ? change <= 0 : change >= 0;
  return (
    <Paper variant="outlined" sx={{ p: 2, borderColor: C.grid, borderRadius: 2, height: "100%" }}>
      <Typography variant="body2" color={C.muted}>
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ color, mt: 0.5, fontVariantNumeric: "tabular-nums" }}>
        {format(value)}
        {suffix}
      </Typography>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minHeight: 20 }}>
        {change !== null && (
          <>
            {change >= 0 ? (
              <TrendingUpIcon sx={{ fontSize: 16, color: good ? C.good : C.bad }} />
            ) : (
              <TrendingDownIcon sx={{ fontSize: 16, color: good ? C.good : C.bad }} />
            )}
            <Typography variant="caption" sx={{ color: good ? C.good : C.bad, fontWeight: 700 }}>
              {Math.abs(change).toFixed(1)}%
            </Typography>
            <Typography variant="caption" color={C.muted}>
              vs last month
            </Typography>
          </>
        )}
      </Stack>
      {spark && (
        <Box sx={{ height: 36, mt: 0.5 }}>
          <ResponsiveContainer>
            <AreaChart data={spark}>
              <Area type="monotone" dataKey={sparkKey} stroke={color} fill={color} fillOpacity={0.12} strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

/* Room × day heatmap – the one bold element on the page */
const RoomHeatmap = ({ heat, roomPerf, daysInMonth, daily }) => {
  const max = Math.max(1, ...Object.values(heat || {}).flatMap((r) => Object.values(r).map((c) => c.amount)));
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  return (
    <Box sx={{ overflowX: "auto" }}>
      <Box sx={{ display: "grid", gridTemplateColumns: `64px repeat(${daysInMonth}, minmax(18px, 1fr)) 56px`, gap: "3px", minWidth: 760 }}>
        <Box />
        {days.map((d) => {
          const wd = daily[d - 1]?.weekday;
          return (
            <Typography key={d} variant="caption" align="center" sx={{ color: wd === "Sat" || wd === "Sun" ? C.ink : C.muted, fontWeight: wd === "Sat" || wd === "Sun" ? 700 : 400, fontSize: 10 }}>
              {d}
            </Typography>
          );
        })}
        <Typography variant="caption" align="right" sx={{ fontSize: 10, color: C.muted }}>
          Occ.
        </Typography>
        {roomPerf.map((r) => (
          <Box key={r.roomNo} sx={{ display: "contents" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, color: C.ink, alignSelf: "center" }}>
              {r.roomNo}
              <Box component="span" sx={{ color: C.muted, fontWeight: 400, ml: 0.5, fontSize: 9 }}>
                {r.roomType}
              </Box>
            </Typography>
            {days.map((d) => {
              const cell = heat?.[r.roomNo]?.[d];
              const t = cell ? 0.18 + 0.82 * (cell.amount / max) : 0;
              return (
                <MuiTooltip
                  key={d}
                  arrow
                  title={cell ? `Room ${r.roomNo} · ${d}: ${inr(cell.amount)} (${cell.periods.join(", ")})` : `Room ${r.roomNo} · ${d}: empty`}
                >
                  <Box
                    sx={{
                      height: 18,
                      borderRadius: "3px",
                      bgcolor: cell ? `rgba(15,118,110,${t})` : "#EEF2F6",
                      outline: cell?.periods.includes("day") && cell?.periods.includes("night") ? `1.5px solid ${C.ink}` : "none",
                      outlineOffset: -1.5,
                    }}
                  />
                </MuiTooltip>
              );
            })}
            <Typography variant="caption" align="right" sx={{ alignSelf: "center", fontWeight: 700, color: r.occupancy < 40 ? C.bad : C.ink }}>
              {Math.round(r.occupancy)}%
            </Typography>
          </Box>
        ))}
      </Box>
      <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1.5 }}>
        <Typography variant="caption" color={C.muted}>Less</Typography>
        {[0.18, 0.4, 0.6, 0.8, 1].map((o) => (
          <Box key={o} sx={{ width: 16, height: 12, borderRadius: "2px", bgcolor: `rgba(15,118,110,${o})` }} />
        ))}
        <Typography variant="caption" color={C.muted}>More revenue</Typography>
        <Box sx={{ width: 16, height: 12, borderRadius: "2px", outline: `1.5px solid ${C.ink}`, outlineOffset: -1.5, ml: 2 }} />
        <Typography variant="caption" color={C.muted}>Day + Night both sold</Typography>
      </Stack>
    </Box>
  );
};

/* ---------------- main page ---------------- */

const OwnerMonthlyDashboard = () => {
  const [month, setMonth] = useState(dayjs().startOf("month"));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomSort, setRoomSort] = useState("revenue");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: res } = await axios.get(`${API}/owner/monthly-summary/${month.month() + 1}/${month.year()}`, {
          withCredentials: true,
        });
        if (!cancelled) setData(res.data);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.message || "Could not load the monthly summary.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [month]);

  const isFuture = month.add(1, "month").isAfter(dayjs().add(1, "month"), "month");

  const dailyWithAvg = useMemo(() => {
    if (!data) return [];
    return data.daily.map((d, i, arr) => {
      const win = arr.slice(Math.max(0, i - 6), i + 1).filter((x) => x.total > 0);
      return { ...d, avg7: win.length ? Math.round(win.reduce((s, x) => s + x.total, 0) / win.length) : null };
    });
  }, [data]);

  const roomRows = useMemo(() => {
    if (!data) return [];
    return [...data.gh.roomPerf].sort((a, b) => b[roomSort] - a[roomSort]);
  }, [data, roomSort]);

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    const k = data.kpis;
    const p = data.prevKpis;
    const kpiRows = [
      ["Metric", data.period.label, data.period.prevLabel],
      ["Total revenue", k.totalRevenue, p.totalRevenue],
      ["Guest house revenue", k.ghRevenue, p.ghRevenue],
      ["Restaurant sales", k.restSales, p.restSales],
      ["Office / banquet income", k.officeIn, p.officeIn],
      ["Restaurant expenses", k.restExpenses, p.restExpenses],
      ["Office expenses", k.officeOut, p.officeOut],
      ["Staff salary paid", k.staffSalary, p.staffSalary],
      ["Net cash (approx.)", k.netCash, p.netCash],
      ["Occupancy %", k.occupancy, p.occupancy],
      ["Avg room rate", k.adr, p.adr],
      ["Below list price", k.belowListPrice, p.belowListPrice],
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(kpiRows), "Summary");
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.daily.map((d) => ({ Date: d.date, Day: d.weekday, "Guest House": d.gh, Restaurant: d.rest, Office: d.office, Total: d.total, "Rooms occupied": d.occupied }))),
      "Daily"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.gh.roomPerf.map((r) => ({ Room: r.roomNo, Type: r.roomType, "List price": r.listPrice, Revenue: r.revenue, Bookings: r.bookings, "Avg rate": r.avgRate, "Occupancy %": r.occupancy }))),
      "Rooms"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.unpaid.top.map((u) => ({ Date: u.date, Room: u.roomNo, Guest: u.fullname, Mobile: u.mobileNumber, Amount: u.rate, "Days pending": u.age }))),
      "Pending dues"
    );
    XLSX.writeFile(wb, `Owner_Report_${month.format("MMM_YYYY")}.xlsx`);
  };

  const k = data?.kpis;
  const p = data?.prevKpis;
  const mix = data
    ? [
        { name: "Guest House", value: k.ghRevenue, color: C.gh },
        { name: "Restaurant", value: k.restSales, color: C.rest },
        { name: "Office / Banquet", value: k.officeIn, color: C.office },
      ].filter((x) => x.value > 0)
    : [];

  return (
    <Box
      sx={{
        p: { xs: 1, md: 3 },
        bgcolor: C.bg,
        minHeight: "100%",
        "@media print": { p: 0, bgcolor: "#fff", ".no-print": { display: "none !important" } },
      }}
    >
      {/* Header */}
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="body2" color={C.muted}>
            Owner monthly report
          </Typography>
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton className="no-print" size="small" onClick={() => setMonth((m) => m.subtract(1, "month"))} aria-label="Previous month">
              <ChevronLeftIcon />
            </IconButton>
            <Typography variant="h4" fontWeight={800} color={C.ink} sx={{ letterSpacing: -0.5 }}>
              {month.format("MMMM YYYY")}
            </Typography>
            <IconButton className="no-print" size="small" disabled={isFuture} onClick={() => setMonth((m) => m.add(1, "month"))} aria-label="Next month">
              <ChevronRightIcon />
            </IconButton>
          </Stack>
          {data && data.period.daysCounted < data.period.daysInMonth && (
            <Typography variant="caption" color={C.muted}>
              Month in progress: {data.period.daysCounted} of {data.period.daysInMonth} days counted
            </Typography>
          )}
        </Box>
        <Stack direction="row" spacing={1} className="no-print">
          <Button variant="outlined" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!data}>
            Excel
          </Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={() => window.print()} disabled={!data} sx={{ bgcolor: C.ink }}>
            Print / PDF
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && !data ? (
        <Grid container spacing={2}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={130} />
            </Grid>
          ))}
          <Grid size={12}>
            <Skeleton variant="rounded" height={340} />
          </Grid>
        </Grid>
      ) : data ? (
        <Box sx={{ opacity: loading ? 0.5 : 1, transition: "opacity .2s" }}>
          {/* KPI row */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Kpi label="Total revenue" value={k.totalRevenue} prev={p.totalRevenue} spark={data.daily} sparkKey="total" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Kpi label="Guest house" value={k.ghRevenue} prev={p.ghRevenue} color={C.gh} spark={data.daily} sparkKey="gh" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Kpi label="Restaurant" value={k.restSales} prev={p.restSales} color={C.rest} spark={data.daily} sparkKey="rest" />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Kpi label="Office / banquet" value={k.officeIn} prev={p.officeIn} color={C.office} spark={data.daily} sparkKey="office" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Kpi label="Room occupancy" value={k.occupancy} prev={p.occupancy} format={(v) => v.toFixed(1)} suffix="%" />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Kpi label="Average room rate" value={k.adr} prev={p.adr} />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Kpi label="Total expenses + salary" value={k.restExpenses + k.officeOut + k.staffSalary} prev={p.restExpenses + p.officeOut + p.staffSalary} invert />
            </Grid>
            <Grid size={{ xs: 6, md: 3 }}>
              <Kpi label="Guest dues pending" value={data.unpaid.total} color={data.unpaid.total > 0 ? C.bad : C.ink} />
            </Grid>
          </Grid>

          {/* Insights */}
          {data.insights.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderColor: C.grid, borderRadius: 2, borderLeft: `4px solid ${C.ink}` }}>
              <Typography variant="subtitle1" fontWeight={700} color={C.ink} sx={{ mb: 1 }}>
                What stood out this month
              </Typography>
              <Grid container spacing={1}>
                {data.insights.map((ins, i) => (
                  <Grid key={i} size={{ xs: 12, md: 6 }}>
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{ mt: "7px", width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: { good: C.good, bad: C.bad, warn: C.warn, info: C.muted }[ins.tone] }} />
                      <Typography variant="body2" color={C.ink}>{ins.text}</Typography>
                    </Stack>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          <Grid container spacing={2}>
            {/* Daily revenue */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <Panel title="Daily revenue" subtitle="Stacked by business, line shows 7-day average">
                <Box sx={{ height: 300 }}>
                  <ResponsiveContainer>
                    <ComposedChart data={dailyWithAvg} margin={{ left: 0, right: 8, top: 4 }}>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="day" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={{ stroke: C.grid }} />
                      <YAxis tickFormatter={short} tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} width={52} />
                      <Tooltip content={<ChartTooltip labelFn={(d) => `${dailyWithAvg[d - 1]?.date} (${dailyWithAvg[d - 1]?.weekday})`} />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="gh" name="Guest House" stackId="a" fill={C.gh} maxBarSize={22} />
                      <Bar dataKey="rest" name="Restaurant" stackId="a" fill={C.rest} maxBarSize={22} />
                      <Bar dataKey="office" name="Office" stackId="a" fill={C.office} maxBarSize={22} radius={[3, 3, 0, 0]} />
                      <Line dataKey="avg7" name="7-day avg" stroke={C.ink} strokeWidth={2} dot={false} connectNulls />
                    </ComposedChart>
                  </ResponsiveContainer>
                </Box>
              </Panel>
            </Grid>

            {/* Revenue mix */}
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <Panel title="Where the money came from" subtitle={`Total ${inr(k.totalRevenue)}`}>
                <Box sx={{ height: 220, position: "relative" }}>
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={mix} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="92%" paddingAngle={2} stroke="none">
                        {mix.map((m) => (
                          <Cell key={m.name} fill={m.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => inr(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                    <Typography variant="h6" fontWeight={800} color={C.ink}>{short(k.totalRevenue)}</Typography>
                  </Box>
                </Box>
                <Stack spacing={0.8} sx={{ mt: 1 }}>
                  {mix.map((m) => (
                    <Stack key={m.name} direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "2px", bgcolor: m.color }} />
                      <Typography variant="body2" sx={{ flex: 1 }}>{m.name}</Typography>
                      <Typography variant="body2" fontWeight={700}>{inr(m.value)}</Typography>
                      <Typography variant="caption" color={C.muted} sx={{ width: 40, textAlign: "right" }}>
                        {k.totalRevenue ? Math.round((m.value / k.totalRevenue) * 100) : 0}%
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </Panel>
            </Grid>

            {/* Room heatmap */}
            <Grid size={12}>
              <Panel title="Room calendar" subtitle="Every room, every day. Darker = more revenue. Empty squares are unsold nights.">
                <RoomHeatmap heat={data.gh.heat} roomPerf={data.gh.roomPerf} daysInMonth={data.period.daysInMonth} daily={data.daily} />
              </Panel>
            </Grid>

            {/* 12 month trend */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <Panel title="Last 12 months" subtitle="Monthly revenue by business">
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer>
                    <AreaChart data={data.trend} margin={{ left: 0, right: 8, top: 4 }}>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={{ stroke: C.grid }} />
                      <YAxis tickFormatter={short} tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} width={52} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="gh" name="Guest House" stackId="1" stroke={C.gh} fill={C.gh} fillOpacity={0.85} />
                      <Area type="monotone" dataKey="rest" name="Restaurant" stackId="1" stroke={C.rest} fill={C.rest} fillOpacity={0.85} />
                      <Area type="monotone" dataKey="office" name="Office" stackId="1" stroke={C.office} fill={C.office} fillOpacity={0.85} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Panel>
            </Grid>

            {/* Weekday */}
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <Panel title="Average by weekday" subtitle="All businesses, days with entries only">
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={data.weekday} margin={{ left: 0, right: 8, top: 4 }}>
                      <CartesianGrid stroke={C.grid} vertical={false} />
                      <XAxis dataKey="weekday" tick={{ fontSize: 12, fill: C.muted }} tickLine={false} axisLine={{ stroke: C.grid }} />
                      <YAxis tickFormatter={short} tick={{ fontSize: 11, fill: C.muted }} tickLine={false} axisLine={false} width={48} />
                      <Tooltip formatter={(v) => inr(v)} cursor={{ fill: "#F1F5F9" }} />
                      <Bar dataKey="avg" name="Avg / day" radius={[4, 4, 0, 0]} maxBarSize={36}>
                        {data.weekday.map((w) => {
                          const best = Math.max(...data.weekday.map((x) => x.avg));
                          return <Cell key={w.weekday} fill={w.avg === best && best > 0 ? C.ink : "#94A3B8"} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Panel>
            </Grid>

            {/* Room performance */}
            <Grid size={{ xs: 12, lg: 8 }}>
              <Panel
                title="Room performance"
                subtitle="Compare earnings and occupancy room by room"
                action={
                  <ToggleButtonGroup size="small" exclusive value={roomSort} onChange={(_, v) => v && setRoomSort(v)} className="no-print">
                    <ToggleButton value="revenue">Revenue</ToggleButton>
                    <ToggleButton value="occupancy">Occupancy</ToggleButton>
                    <ToggleButton value="avgRate">Avg rate</ToggleButton>
                  </ToggleButtonGroup>
                }
              >
                <Box sx={{ height: 360 }}>
                  <ResponsiveContainer>
                    <BarChart data={roomRows} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid stroke={C.grid} horizontal={false} />
                      <XAxis type="number" tickFormatter={roomSort === "occupancy" ? (v) => v + "%" : short} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="roomNo" tick={{ fontSize: 12, fill: C.ink }} width={40} axisLine={false} tickLine={false} />
                      <Tooltip
                        cursor={{ fill: "#F1F5F9" }}
                        formatter={(v, n) => (n === "Occupancy" ? v + "%" : inr(v))}
                        labelFormatter={(r) => {
                          const room = roomRows.find((x) => x.roomNo === r);
                          return `Room ${r} · ${room?.roomType} · list ${inr(room?.listPrice)}`;
                        }}
                      />
                      <Bar
                        dataKey={roomSort}
                        name={{ revenue: "Revenue", occupancy: "Occupancy", avgRate: "Avg rate" }[roomSort]}
                        fill={C.gh}
                        radius={[0, 4, 4, 0]}
                        maxBarSize={16}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Panel>
            </Grid>

            {/* GH payment + guest type */}
            <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
              <Panel title="Guest house details" subtitle={`${k.bookings} bookings · ${k.guests} guests`}>
                {[["Payment mode", data.gh.byMode], ["Guest type", data.gh.byType]].map(([t, obj]) => {
                  const rows = toRows(obj);
                  const total = rows.reduce((s, r) => s + r.value, 0) || 1;
                  return (
                    <Box key={t} sx={{ mb: 2 }}>
                      <Typography variant="body2" fontWeight={700} sx={{ mb: 0.8 }}>{t}</Typography>
                      <Box sx={{ display: "flex", height: 12, borderRadius: 6, overflow: "hidden", mb: 1 }}>
                        {rows.map((r, i) => (
                          <Box key={r.name} sx={{ width: `${(r.value / total) * 100}%`, bgcolor: MIX[i % MIX.length] }} />
                        ))}
                      </Box>
                      {rows.map((r, i) => (
                        <Stack key={r.name} direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: MIX[i % MIX.length] }} />
                          <Typography variant="caption" sx={{ flex: 1 }}>{r.name}</Typography>
                          <Typography variant="caption" fontWeight={700}>{inr(r.value)}</Typography>
                        </Stack>
                      ))}
                    </Box>
                  );
                })}
                {k.belowListPrice > 0 && (
                  <Alert severity="warning" variant="outlined" sx={{ py: 0 }}>
                    {inr(k.belowListPrice)} charged below room list price
                  </Alert>
                )}
              </Panel>
            </Grid>

            {/* Restaurant expenses */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Panel title="Restaurant expenses by category" subtitle={`${inr(k.restExpenses)} total · ${k.restSales ? Math.round((k.restExpenses / k.restSales) * 100) : 0}% of sales`}>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={toRows(data.rest.expByCat).slice(0, 8)} layout="vertical" margin={{ left: 8, right: 24 }}>
                      <CartesianGrid stroke={C.grid} horizontal={false} />
                      <XAxis type="number" tickFormatter={short} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: C.ink }} width={110} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => inr(v)} cursor={{ fill: "#F1F5F9" }} />
                      <Bar dataKey="value" name="Amount" fill={C.rest} radius={[0, 4, 4, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
                {data.rest.cashDiffDays.length > 0 && (
                  <Typography variant="caption" color={C.muted}>
                    Biggest cash vs computer gaps:{" "}
                    {data.rest.cashDiffDays.map((d) => `${d.date} (${inr(d.diff)})`).join(", ")}
                  </Typography>
                )}
              </Panel>
            </Grid>

            {/* Office in/out */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Panel title="Office book by category" subtitle={`In ${inr(k.officeIn)} · Out ${inr(k.officeOut)}`}>
                <Box sx={{ height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart
                      data={Array.from(new Set([...Object.keys(data.office.inByCat), ...Object.keys(data.office.outByCat)]))
                        .map((name) => ({ name, in: data.office.inByCat[name] || 0, out: data.office.outByCat[name] || 0 }))
                        .sort((a, b) => b.in + b.out - (a.in + a.out))
                        .slice(0, 8)}
                      layout="vertical"
                      margin={{ left: 8, right: 24 }}
                    >
                      <CartesianGrid stroke={C.grid} horizontal={false} />
                      <XAxis type="number" tickFormatter={short} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: C.ink }} width={110} axisLine={false} tickLine={false} />
                      <Tooltip formatter={(v) => inr(v)} cursor={{ fill: "#F1F5F9" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="in" name="In" fill={C.office} radius={[0, 4, 4, 0]} maxBarSize={12} />
                      <Bar dataKey="out" name="Out" fill="#A5B4FC" radius={[0, 4, 4, 0]} maxBarSize={12} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Panel>
            </Grid>

            {/* Unpaid */}
            <Grid size={12}>
              <Panel title="Guest dues to collect" subtitle={`${inr(data.unpaid.total)} pending across all months`}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Box sx={{ height: 220 }}>
                      <ResponsiveContainer>
                        <BarChart data={toRows(data.unpaid.aging).length ? Object.entries(data.unpaid.aging).map(([name, value]) => ({ name, value })) : []}>
                          <CartesianGrid stroke={C.grid} vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: C.muted }} tickLine={false} />
                          <YAxis tickFormatter={short} tick={{ fontSize: 11, fill: C.muted }} axisLine={false} tickLine={false} width={48} />
                          <Tooltip formatter={(v) => inr(v)} cursor={{ fill: "#F1F5F9" }} />
                          <Bar dataKey="value" name="Pending" radius={[4, 4, 0, 0]} maxBarSize={40}>
                            {["#FCA5A5", "#F87171", "#DC2626", "#7F1D1D"].map((c) => (
                              <Cell key={c} fill={c} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </Grid>
                  <Grid size={{ xs: 12, md: 8 }}>
                    {data.unpaid.top.length === 0 ? (
                      <Typography variant="body2" color={C.muted} sx={{ p: 2 }}>No pending guest dues.</Typography>
                    ) : (
                      <Box sx={{ overflowX: "auto" }}>
                        <Table size="small">
                          <TableHead>
                            <TableRow>
                              <TableCell>Guest</TableCell>
                              <TableCell>Mobile</TableCell>
                              <TableCell>Room</TableCell>
                              <TableCell>Date</TableCell>
                              <TableCell align="right">Days</TableCell>
                              <TableCell align="right">Amount</TableCell>
                              <TableCell className="no-print" />
                            </TableRow>
                          </TableHead>
                          <TableBody>
                            {data.unpaid.top.map((u, i) => (
                              <TableRow key={i}>
                                <TableCell>{u.fullname || "—"}</TableCell>
                                <TableCell>{u.mobileNumber || "—"}</TableCell>
                                <TableCell>{u.roomNo}</TableCell>
                                <TableCell>{u.date}</TableCell>
                                <TableCell align="right" sx={{ color: u.age > 30 ? C.bad : C.ink, fontWeight: u.age > 30 ? 700 : 400 }}>{u.age}</TableCell>
                                <TableCell align="right" sx={{ fontWeight: 700 }}>{inr(u.rate)}</TableCell>
                                <TableCell className="no-print" padding="none">
                                  {String(u.mobileNumber || "").replace(/\D/g, "").length === 10 && (
                                    <IconButton
                                      size="small"
                                      aria-label="WhatsApp reminder"
                                      sx={{ color: "#1DA851" }}
                                      href={`https://wa.me/91${String(u.mobileNumber).replace(/\D/g, "")}?text=${encodeURIComponent(
                                        `Namaste ${u.fullname || ""} ji, ${u.date} ko Room ${u.roomNo} ka ${inr(u.rate)} payment abhi baaki hai. Kripya jaldi payment kar dijiye. Dhanyavaad 🙏`
                                      )}`}
                                      target="_blank"
                                      rel="noopener"
                                    >
                                      <WhatsAppIcon fontSize="small" />
                                    </IconButton>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </Box>
                    )}
                  </Grid>
                </Grid>
              </Panel>
            </Grid>
          </Grid>

          <Typography variant="caption" color={C.muted} sx={{ display: "block", mt: 2 }}>
            Net cash = all income − restaurant expenses − office out − salary paid. Guest-house figures follow the same rules as the GH Sales report. Occupancy counts night stays only.
          </Typography>
        </Box>
      ) : null}
    </Box>
  );
};

export default OwnerMonthlyDashboard;
