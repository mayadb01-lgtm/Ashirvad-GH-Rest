// Naye graph pages ke common parts: period chunna, data lana, KPI card, calendar heatmap, formatters.
import { useEffect, useMemo, useState } from "react";
import { Box, Card, CardContent, Chip, LinearProgress, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ResponsiveContainer, AreaChart, Area } from "recharts";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { API } from "../insights/shared";

export const BIZ = {
  gh: { label: "Guest house", color: "#2563EB" },
  rest: { label: "Restaurant", color: "#EA580C" },
  banquet: { label: "Banquet", color: "#9333EA" },
  bakery: { label: "Bakery Baada", color: "#CA8A04" },
  moti: { label: "Moti Baada", color: "#0F766E" },
};
export const C = { up: "#16A34A", down: "#DC2626", ly: "#94A3B8", grid: "#EEF2F7", ink: "#0F172A", muted: "#64748B" };
export const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const money = (v) => {
  if (v == null || !isFinite(v)) return "—";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 0.995e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
  return `${s}₹${Math.round(a).toLocaleString("en-IN")}`;
};
export const rupee = (v) => (v == null || !isFinite(v) ? "—" : "₹" + Math.round(v).toLocaleString("en-IN"));
export const kTick = (v) => (Math.abs(v) >= 1e5 ? `${(v / 1e5).toFixed(1)}L` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : `${Math.round(v)}`);
export const pct = (v, d = 1) => (v == null || !isFinite(v) ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(d)}%`);
export const chg = (a, b) => (b ? a / b - 1 : null);
export const sum = (rows, f) => rows.reduce((s, r) => s + (Number(f(r)) || 0), 0);
export const mergeMap = (rows, f) => rows.reduce((o, r) => { Object.entries(f(r) || {}).forEach(([k, v]) => (o[k] = (o[k] || 0) + (typeof v === "object" ? v.amount ?? v.rev ?? 0 : v))); return o; }, {});

// ── Period picker ──
const ISO = "YYYY-MM-DD";
export const PRESETS = [
  { key: "mtd", label: "This month" },
  { key: "last", label: "Last month" },
  { key: "30", label: "Last 30 days" },
  { key: "90", label: "Last 90 days" },
  { key: "ytd", label: "This year" },
  { key: "custom", label: "Custom" },
];
export const presetRange = (key, today = dayjs()) => {
  const t = today.format(ISO);
  if (key === "mtd") return [today.startOf("month").format(ISO), t];
  if (key === "last") { const m = today.subtract(1, "month"); return [m.startOf("month").format(ISO), m.endOf("month").format(ISO)]; }
  if (key === "90") return [today.subtract(89, "day").format(ISO), t];
  if (key === "ytd") return [today.startOf("year").format(ISO), t];
  return [today.subtract(29, "day").format(ISO), t];
};

export const usePeriod = (initial = "30") => {
  const [preset, setPreset] = useState(initial);
  const [range, setRange] = useState(() => presetRange(initial));
  const choose = (k) => { setPreset(k); if (k !== "custom") setRange(presetRange(k)); };
  return { preset, range, choose, setRange: (r) => { setPreset("custom"); setRange(r); } };
};

export const PeriodBar = ({ period, compare, setCompare, right }) => (
  <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} alignItems={{ md: "center" }} justifyContent="space-between" flexWrap="wrap" useFlexGap>
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
      <ToggleButtonGroup size="small" exclusive value={period.preset} onChange={(e, k) => k && period.choose(k)}>
        {PRESETS.map((p) => <ToggleButton key={p.key} value={p.key} sx={{ textTransform: "none", px: 1.25 }}>{p.label}</ToggleButton>)}
      </ToggleButtonGroup>
      {period.preset === "custom" && (
        <>
          <TextField size="small" type="date" label="From" value={period.range[0]} onChange={(e) => e.target.value && period.setRange([e.target.value, period.range[1]])} InputLabelProps={{ shrink: true }} />
          <TextField size="small" type="date" label="To" value={period.range[1]} onChange={(e) => e.target.value && period.setRange([period.range[0], e.target.value])} InputLabelProps={{ shrink: true }} />
        </>
      )}
    </Stack>
    <Stack direction="row" spacing={1} alignItems="center">
      {setCompare && (
        <ToggleButtonGroup size="small" exclusive value={compare} onChange={(e, k) => k && setCompare(k)}>
          <ToggleButton value="ly" sx={{ textTransform: "none" }}>vs last year</ToggleButton>
          <ToggleButton value="pp" sx={{ textTransform: "none" }}>vs previous period</ToggleButton>
        </ToggleButtonGroup>
      )}
      {right}
    </Stack>
  </Stack>
);

// ── Data ──
export const useBizDaily = (from, to) => {
  const [state, setState] = useState({ loading: true, data: null });
  useEffect(() => {
    let off = false;
    setState((s) => ({ ...s, loading: true }));
    axios
      .get(`${API}/biz/daily`, { params: { from, to } })
      .then(({ data }) => !off && setState({ loading: false, data: data.data }))
      .catch((e) => { toast.error(e?.response?.data?.message || "Could not load data"); !off && setState({ loading: false, data: null }); });
    return () => { off = true; };
  }, [from, to]);
  return state;
};

// Compare rows: same length as current, matched by position
export const compareRows = (data, mode) => (mode === "pp" ? data?.prevPeriod : data?.lastYear) || [];
export const compareLabel = (mode) => (mode === "pp" ? "previous period" : "last year");

// ── KPI card with sparkline ──
export const Kpi = ({ label, value, delta, deltaLabel, spark, color = "#2563EB", invert = false, hint }) => {
  const good = delta == null ? null : invert ? delta <= 0 : delta >= 0;
  return (
    <Card variant="outlined" sx={{ minWidth: 0, overflow: "hidden" }}>
      <CardContent sx={{ py: 1.25, px: 1.5, "&:last-child": { pb: 1 } }}>
        <Typography variant="caption" color="text.secondary" noWrap display="block">{label}</Typography>
        <Typography variant="h6" fontWeight={800} sx={{ lineHeight: 1.2, fontVariantNumeric: "tabular-nums" }} noWrap>{value}</Typography>
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minHeight: 22 }}>
          {delta != null && isFinite(delta) && (
            <Chip size="small" label={pct(delta)} sx={{ height: 20, fontWeight: 700, fontSize: 11, bgcolor: good ? "#DCFCE7" : "#FEE2E2", color: good ? "#166534" : "#991B1B" }} />
          )}
          {deltaLabel && <Typography variant="caption" color="text.secondary" noWrap>{deltaLabel}</Typography>}
        </Stack>
        {hint && <Typography variant="caption" color="text.secondary" display="block" noWrap>{hint}</Typography>}
      </CardContent>
      {spark?.length > 1 && (
        <Box sx={{ height: 34, mt: -0.5 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id={`sp-${label.replace(/\W/g, "")}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={color} stopOpacity={0.3} />
                  <stop offset="1" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#sp-${label.replace(/\W/g, "")})`} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Card>
  );
};

export const KpiGrid = ({ children }) => (
  <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" } }}>{children}</Box>
);

export const Panel = ({ title, sub, right, children, sx }) => (
  <Card variant="outlined" sx={{ minWidth: 0, ...sx }}>
    <CardContent>
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1} sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
        <Box sx={{ minWidth: 0 }}>
          <Typography fontWeight={800}>{title}</Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
        {right}
      </Stack>
      {children}
    </CardContent>
  </Card>
);

export const Grid2 = ({ children, cols = { xs: "1fr", md: "1fr 1fr" } }) => <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: cols }}>{children}</Box>;

export const Legend = ({ items }) => (
  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
    {items.map((i) => (
      <Stack key={i.name} direction="row" spacing={0.75} alignItems="center">
        <Box sx={{ width: i.line ? 16 : 10, height: i.line ? 3 : 10, borderRadius: 0.5, bgcolor: i.color, ...(i.dash ? { background: `repeating-linear-gradient(90deg, ${i.color} 0 4px, transparent 4px 7px)` } : {}) }} />
        <Typography variant="caption" color="text.secondary">{i.name}</Typography>
      </Stack>
    ))}
  </Stack>
);

export const TipBox = ({ title, rows }) => (
  <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1, boxShadow: 3, minWidth: 170 }}>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{title}</Typography>
    {rows.filter(Boolean).map((r) => (
      <Stack key={r.name} direction="row" spacing={1} alignItems="center">
        {r.color && <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: r.color }} />}
        <Typography variant="caption" sx={{ flex: 1 }}>{r.name}</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>{r.value}</Typography>
      </Stack>
    ))}
  </Box>
);

// ── Calendar heatmap: har din ek khana, rang = kitna ──
export const CalendarHeat = ({ rows, value, color = "#2563EB", fmt = money, max: maxIn, label }) => {
  const cells = useMemo(() => {
    if (!rows.length) return [];
    const first = dayjs(rows[0].date);
    const pad = (first.day() + 6) % 7; // Monday start
    return [...Array(pad).fill(null), ...rows];
  }, [rows]);
  const vals = rows.map(value).filter((v) => v > 0);
  const max = maxIn || Math.max(1, ...vals);
  const weeks = Math.ceil(cells.length / 7);
  return (
    <Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "28px 1fr", gap: 0.5 }}>
        <Box sx={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gap: "3px" }}>
          {DOW.map((d) => <Typography key={d} variant="caption" color="text.secondary" sx={{ fontSize: 10, lineHeight: "18px" }}>{d}</Typography>)}
        </Box>
        <Box sx={{ display: "grid", gridAutoFlow: "column", gridTemplateRows: "repeat(7, 18px)", gridTemplateColumns: `repeat(${weeks}, minmax(10px, 1fr))`, gap: "3px", overflowX: "auto" }}>
          {cells.map((r, i) => {
            if (!r) return <Box key={`p${i}`} />;
            const v = value(r);
            const a = v > 0 ? 0.15 + 0.85 * Math.min(1, v / max) : 0;
            return (
              <Box key={r.date} title={`${dayjs(r.date).format("ddd D MMM")}: ${v > 0 ? fmt(v) : "no data"}`}
                sx={{ borderRadius: "3px", bgcolor: v > 0 ? color : "#F1F5F9", opacity: v > 0 ? a : 1, border: dayjs(r.date).day() === 0 ? "1px solid #CBD5E1" : "none" }} />
            );
          })}
        </Box>
      </Box>
      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end" sx={{ mt: 0.75 }}>
        <Typography variant="caption" color="text.secondary">{label || "Less"}</Typography>
        {[0.2, 0.45, 0.7, 1].map((o) => <Box key={o} sx={{ width: 12, height: 12, borderRadius: "3px", bgcolor: color, opacity: o }} />)}
        <Typography variant="caption" color="text.secondary">More</Typography>
      </Stack>
    </Box>
  );
};

// ── Horizontal bars (mix / top lists) ──
export const BarList = ({ items, color = "#2563EB", fmt = money, total, max: maxIn, compare }) => {
  const max = maxIn || Math.max(1, ...items.map((i) => i.value), ...(compare ? items.map((i) => i.prev || 0) : []));
  const tot = total ?? items.reduce((s, i) => s + i.value, 0);
  return (
    <Stack spacing={0.9}>
      {items.map((i) => (
        <Box key={i.name}>
          <Stack direction="row" justifyContent="space-between" spacing={1}>
            <Typography variant="body2" noWrap sx={{ minWidth: 0 }}>{i.name}</Typography>
            <Typography variant="body2" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
              {fmt(i.value)}{tot ? <Typography component="span" variant="caption" color="text.secondary"> · {((i.value / tot) * 100).toFixed(0)}%</Typography> : null}
              {compare && i.prev != null ? <Typography component="span" variant="caption" sx={{ ml: 0.75, color: i.value >= i.prev ? (i.invert ? C.down : C.up) : (i.invert ? C.up : C.down), fontWeight: 700 }}>{i.prev ? pct(i.value / i.prev - 1, 0) : "new"}</Typography> : null}
            </Typography>
          </Stack>
          <Box sx={{ position: "relative", height: 8, borderRadius: 4, bgcolor: "#F1F5F9", mt: 0.25 }}>
            {compare && i.prev != null && <Box sx={{ position: "absolute", inset: 0, width: `${(i.prev / max) * 100}%`, height: 8, borderRadius: 4, bgcolor: "#CBD5E1" }} />}
            <Box sx={{ position: "absolute", left: 0, top: compare ? 2 : 0, width: `${(i.value / max) * 100}%`, height: compare ? 4 : 8, borderRadius: 4, bgcolor: i.color || color }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

export const Loading = ({ loading }) => (loading ? <LinearProgress sx={{ my: 1 }} /> : null);

// Insight line: chhota sa note ek nazar mein
export const Insight = ({ tone = "info", children }) => {
  const col = { good: ["#F0FDF4", "#166534", "#86EFAC"], bad: ["#FEF2F2", "#991B1B", "#FCA5A5"], info: ["#EFF6FF", "#1E3A8A", "#BFDBFE"] }[tone];
  return (
    <Box sx={{ px: 1.5, py: 1, borderRadius: 2, bgcolor: col[0], color: col[1], border: `1px solid ${col[2]}`, fontSize: 13.5 }}>{children}</Box>
  );
};

// Har din ko hafte ke din mein jodna
export const byWeekday = (rows, f, hasF) => {
  const acc = DOW.map((d) => ({ day: d, total: 0, n: 0 }));
  rows.forEach((r) => {
    if (hasF && !hasF(r)) return;
    const i = (dayjs(r.date).day() + 6) % 7;
    acc[i].total += f(r);
    acc[i].n += 1;
  });
  return acc.map((a) => ({ ...a, avg: a.n ? a.total / a.n : 0 }));
};
