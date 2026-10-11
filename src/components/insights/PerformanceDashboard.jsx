// 📊 Performance: saal vs saal (GH, restaurant, banquet).
// App ka data 2025 se + purane saal ke mahine ke total (jab daale jayenge). Server sirf padhta hai.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, LinearProgress, MenuItem, Stack, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { ResponsiveContainer, BarChart, LineChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList, ReferenceLine, ReferenceDot } from "recharts";
import axios from "axios";
import toast from "react-hot-toast";
import { API, Section } from "./shared";
import ExpenseSection from "./ExpenseSection";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYN = { Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday", Sun: "Sunday" };
const C = { y: "#2563EB", b: "#94A3B8", other: "#CBD5E1", gh: "#2563EB", rest: "#EA580C", bq: "#9333EA", up: "#16A34A", down: "#DC2626" };

const num = (v) => Number(v) || 0;
const money = (v) => {
  if (v == null || !isFinite(v)) return "—";
  const a = Math.abs(v), s = v < 0 ? "−" : "";
  if (a >= 0.995e7) return `${s}₹${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${s}₹${(a / 1e5).toFixed(2)} L`;
  return `${s}₹${Math.round(a).toLocaleString("en-IN")}`;
};
const rupee = (v) => (v == null ? "—" : "₹" + Math.round(v).toLocaleString("en-IN"));
const pct = (v, d = 1) => (v == null || !isFinite(v) ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(d)}%`);
const pts = (v) => (v == null ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toFixed(1)} pts`);
const lakh1 = (v) => (v ? (v / 1e5).toFixed(1) : "0");
const span = (a, b) => (a === 1 && b === 12 ? "full year" : a === b ? MON[a - 1] : `${MON[a - 1]}–${MON[b - 1]}`);

const ChangeChip = ({ v, isPts }) => {
  if (v == null || !isFinite(v)) return null;
  const up = v >= 0;
  return <Chip size="small" label={isPts ? pts(v) : pct(v)} sx={{ fontWeight: 700, height: 22, bgcolor: up ? "#DCFCE7" : "#FEE2E2", color: up ? "#166534" : "#991B1B" }} />;
};

const Kpi = ({ label, value, prev, change, isPts }) => (
  <Card variant="outlined" sx={{ minWidth: 0 }}>
    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.25, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
        <ChangeChip v={change} isPts={isPts} />
        <Typography variant="caption" color="text.secondary">vs {prev}</Typography>
      </Stack>
    </CardContent>
  </Card>
);

const Highlight = ({ good, big, text, sub }) => (
  <Card variant="outlined" sx={{ minWidth: 0, borderTop: `3px solid ${good ? C.up : C.down}` }}>
    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
      <Typography variant="caption" fontWeight={800} sx={{ color: good ? C.up : C.down, letterSpacing: 0.6 }}>{good ? "WIN" : "FIX FIRST"}</Typography>
      <Typography variant="h5" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>{big}</Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }}>{text}</Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </CardContent>
  </Card>
);

const TipBox = ({ title, rows }) => (
  <Box sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: 1.5, p: 1, boxShadow: 3, minWidth: 170 }}>
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>{title}</Typography>
    {rows.map((r) => (
      <Stack key={r.name} direction="row" spacing={1} alignItems="center">
        {r.color && <Box sx={{ width: 8, height: 8, borderRadius: 0.5, bgcolor: r.color }} />}
        <Typography variant="caption" sx={{ flex: 1 }}>{r.name}</Typography>
        <Typography variant="caption" fontWeight={700} sx={{ fontVariantNumeric: "tabular-nums" }}>{r.value}</Typography>
      </Stack>
    ))}
  </Box>
);

const Legend2 = ({ items }) => (
  <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
    {items.map((i) => (
      <Stack key={i.name} direction="row" spacing={0.75} alignItems="center">
        <Box sx={{ width: i.line ? 16 : 10, height: i.line ? 3 : 10, borderRadius: 0.5, bgcolor: i.color }} />
        <Typography variant="caption" color="text.secondary">{i.name}</Typography>
      </Stack>
    ))}
  </Stack>
);

// Har saal ka apna rang (hamesha wahi rang usi saal ka)
const YEAR_COLORS = ["#0EA5E9", "#F59E0B", "#10B981", "#8B5CF6", "#EF4444", "#2563EB", "#EC4899", "#14B8A6", "#84CC16"];
const yearColor = (years, y) => YEAR_COLORS[[...years].sort().indexOf(y) % YEAR_COLORS.length];

const grid2 = { display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } };

const PerformanceDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(null);
  const [base, setBase] = useState(null);

  useEffect(() => {
    let off = false;
    axios
      .get(`${API}/performance`)
      .then(({ data }) => !off && setData(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load performance"))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, []);

  const v = useMemo(() => {
    if (!data?.months?.length) return null;
    const rows = data.months;
    const years = [...new Set(rows.map((r) => r.year))].sort((a, b) => a - b);
    const Y = years.includes(year) ? year : years.at(-1);
    const others = years.filter((y) => y !== Y);
    const B = others.includes(base) ? base : others.filter((y) => y < Y).at(-1) ?? others[0];
    const get = (y, m) => rows.find((r) => r.year === y && r.m === m);
    const ms = MON.map((_, i) => i + 1).filter((m) => get(Y, m) && get(B, m));
    const sum = (y, k) => ms.reduce((s, m) => s + num(get(y, m)?.[k]), 0);
    const tot = (y) => {
      const rn = sum(y, "room_nights"), days = sum(y, "days");
      return { total: sum(y, "gh_revenue") + sum(y, "restaurant") + sum(y, "banquet"), gh: sum(y, "gh_revenue"), rate: rn ? sum(y, "gh_revenue") / rn : null, occ: rn ? rn / (data.nRooms * days) : null, rest: sum(y, "restaurant"), bq: sum(y, "banquet") };
    };
    const cur = B != null ? tot(Y) : null, prev = B != null ? tot(B) : null;
    const ch = (k) => (cur && prev && prev[k] ? (k === "occ" ? cur[k] - prev[k] : cur[k] / prev[k] - 1) : null);

    // Year by year (latest saal ke mahino ki window)
    const latest = years.at(-1);
    const win = rows.filter((r) => r.year === latest).map((r) => r.m);
    const yearBars = years.map((y) => {
      const rs = rows.filter((r) => r.year === y && win.includes(r.m));
      const s = (k) => rs.reduce((a, r) => a + num(r[k]), 0);
      return { year: String(y), y, months: rs.length, gh: s("gh_revenue"), rest: s("restaurant"), bq: s("banquet"), total: s("gh_revenue") + s("restaurant") + s("banquet") };
    });
    yearBars.forEach((r, i) => { const p = yearBars[i - 1]; r.growth = p && p.total && p.months === r.months ? r.total / p.total - 1 : null; });
    const full = yearBars.filter((r) => r.months === win.length && r.total > 0);
    const avgGrowth = full.length >= 3 ? Math.pow(full.at(-1).total / full[0].total, 1 / (full.at(-1).y - full[0].y)) - 1 : null;

    // Mahine ka farak
    const change = ms.map((m) => {
      const a = get(B, m), b = get(Y, m);
      const gh = b.gh_revenue - a.gh_revenue, rest = b.restaurant - a.restaurant, bq = b.banquet - a.banquet;
      return { mon: MON[m - 1], gh, rest, bq, total: gh + rest + bq };
    });
    const pair = ms.map((m) => ({ mon: MON[m - 1], gB: get(B, m).gh_revenue, gY: get(Y, m).gh_revenue, bB: get(B, m).banquet, bY: get(Y, m).banquet, rB: get(B, m), rY: get(Y, m) }));

    // Har saal ki line
    const lineRows = MON.map((mon, i) => {
      const o = { mon };
      years.forEach((y) => {
        const r = get(y, i + 1);
        const live = r && data.today && r.month === data.today.slice(0, 7); // chalu mahina: sirf beete din se bhaag
        const dd = r ? (live ? Math.max(1, +data.today.slice(8, 10) - 1) : r.days) : null;
        o[`r${y}`] = r?.avg_rate ?? null;
        o[`s${y}`] = r?.restaurant_per_day ?? null;
        o[`g${y}`] = r && r.gh_revenue ? Math.round(r.gh_revenue / dd) : null;
        o[`b${y}`] = r ? r.banquet || 0 : null;
      });
      return o;
    });
    const lastY = Math.max(...rows.filter((r) => r.year === Y).map((r) => r.m));
    const toBeat = B != null ? MON.map((_, i) => i + 1).filter((m) => m > lastY).map((m) => get(B, m)).filter(Boolean)[0] : null;

    // Hafte ke din (roz ka data 2025 se)
    const wk = data.weekday || [];
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const wg = (d, y) => wk.find((r) => r.day === d && r.year === y);
    const hasWk = B != null && days.every((d) => wg(d, Y) && wg(d, B));
    const weekRows = hasWk ? days.map((d) => ({ day: d, b: wg(d, B).restaurant_per_day, y: wg(d, Y).restaurant_per_day, c: wg(d, Y).restaurant_per_day / wg(d, B).restaurant_per_day - 1 })) : [];
    const worst = weekRows.length ? weekRows.reduce((a, r) => (r.c < a.c ? r : a)) : null;
    const bestD = weekRows.length ? weekRows.reduce((a, r) => (r.c > a.c ? r : a)) : null;
    const bands = data.dayBands || [];
    const strong = (y) => bands.find((r) => r.year === y && r.order === 1)?.days ?? null;

    // Highlights
    const ys = rows.filter((r) => r.year === Y);
    const best = ys.reduce((a, r) => (r.gh_revenue > a.gh_revenue ? r : a), ys[0]);
    const bestEver = best.gh_revenue === Math.max(...rows.map((r) => r.gh_revenue));
    let up = 0, nn = 0;
    ms.forEach((m) => { const a = get(B, m), b = get(Y, m); if (a.avg_rate && b.avg_rate) { nn++; if (b.avg_rate > a.avg_rate) up++; } });

    const zeroBq = ms.filter((m) => get(Y, m).banquet === 0).map((m) => MON[m - 1]);
    const missOffice = rows.filter((r) => (r.year === Y || r.year === B) && ms.includes(r.m) && r.source === "app").reduce((a, r) => a + Math.max(0, r.days - r.office_days), 0);
    const past = [...new Set(rows.filter((r) => r.source !== "app").map((r) => r.year))];

    return { rows, years, Y, B, others, ms, cur, prev, ch, yearBars, avgGrowth, win, change, pair, lineRows, toBeat, weekRows, worst, bestD, strong, best, bestEver, up, nn, zeroBq, missOffice, past, get, hasWk, bands };
  }, [data, year, base]);

  if (loading) return <LinearProgress />;
  if (!v) return <Alert severity="info">No monthly data yet.</Alert>;
  const { Y, B, cur, prev, ch } = v;
  const sp = v.ms.length ? span(v.ms[0], v.ms.at(-1)) : "";
  const style = (y) => {
    const c = yearColor(v.years, y);
    return y === Y ? { stroke: c, strokeWidth: 3.5, dot: { r: 3.5, fill: c, strokeWidth: 0 } } : y === B ? { stroke: c, strokeWidth: 2.2, dot: { r: 2.5, fill: c, strokeWidth: 0 } } : { stroke: c, strokeWidth: 1.6, strokeOpacity: 0.75, dot: false };
  };
  const yearLegend = [...v.years].reverse().map((y) => ({ name: y === Y ? `${y} (chosen)` : y === B ? `${y} (compare)` : String(y), color: style(y).stroke, line: true }));
  const lineOrder = [...v.years].sort((a, b) => (a === Y) - (b === Y) || (a === B) - (b === B));
  const YearLines = ({ k, height = 280, tick, tip, pad, beat, note }) => (
    <>
      <Legend2 items={yearLegend} />
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={v.lineRows} margin={{ top: 24, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#EEF2F7" />
          <XAxis dataKey="mon" tickLine={false} />
          <YAxis width={56} tickFormatter={tick} domain={pad ? [`dataMin - ${pad}`, `dataMax + ${pad}`] : [0, "auto"]} fontSize={11} />
          <Tooltip itemSorter={(it) => -(it.value || 0)} formatter={(val, name) => [tip(val), name.slice(1)]} />
          {lineOrder.map((y) => <Line key={y} dataKey={`${k}${y}`} name={`${k}${y}`} {...style(y)} connectNulls={false} isAnimationActive={false} />)}
          {beat != null && <ReferenceDot x={v.toBeat.mon} y={beat} r={5} fill={yearColor(v.years, B)} stroke="#fff" label={{ value: `To beat: ${tip(beat)}`, position: "top", fontSize: 12, fontWeight: 700, fill: "#0F172A" }} />}
        </LineChart>
      </ResponsiveContainer>
      <Typography variant="caption" color="text.secondary">{note}Each year has its own colour; the chosen year ({Y}) is the thickest line.</Typography>
    </>
  );
  const beatOf = (k) => {
    if (!v.toBeat) return null;
    const row = v.lineRows.find((r) => r.mon === v.toBeat.mon);
    return row?.[`${k}${B}`] ?? null;
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: "flex", flexDirection: "column", gap: 2.5 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">Guest house · restaurant · banquet · {sp}</Typography>
        <Typography variant="h4" fontWeight={800}>Performance: {Y} vs {B ?? "—"}</Typography>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1.5 }}>
          <TextField select size="small" label="Year" value={Y} onChange={(e) => { const y = Number(e.target.value); setYear(y); if (y === base) setBase(null); }} sx={{ minWidth: 110 }}>
            {v.years.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
          <TextField select size="small" label="Compared with" value={B ?? ""} onChange={(e) => setBase(Number(e.target.value))} sx={{ minWidth: 140 }} disabled={!v.others.length}>
            {v.others.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
          <Typography variant="caption" color="text.secondary">
            Years in data: {v.years.join(", ")}{v.past.length ? ` · ${v.past.join(", ")} from Tally / past records (app data always wins on the same date)` : ""}
          </Typography>
        </Stack>
        {!v.past.length && (
          <Alert severity="info" variant="outlined" sx={{ mt: 1.5 }}>
            App data starts in January 2025. Older years (2024, 2023…) will appear in every chart here once their monthly totals are added from past records.
          </Alert>
        )}
        {cur && (
          <Typography sx={{ mt: 1.5, maxWidth: 820 }}>
            Total income for {sp} {Y} is <b>{ch("total") < 0 ? "down" : "up"} {pct(Math.abs(ch("total"))).replace("+", "")}</b> on {B} ({money(cur.total)} vs {money(prev.total)}). The guest house {ch("gh") < 0 ? "fell" : "grew"} <b>{pct(ch("gh"))}</b>, the restaurant {ch("rest") < 0 ? "fell" : "grew"} <b>{pct(ch("rest"))}</b> and banquet money received {ch("bq") < 0 ? "fell" : "grew"} <b>{pct(ch("bq"))}</b>. The restaurant is {Math.round((cur.rest / cur.total) * 100)}% of income.
          </Typography>
        )}
      </Box>

      {cur && (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)", lg: "repeat(6, 1fr)" } }}>
          <Kpi label="Total income" value={money(cur.total)} prev={money(prev.total)} change={ch("total")} />
          <Kpi label="GH room revenue" value={money(cur.gh)} prev={money(prev.gh)} change={ch("gh")} />
          <Kpi label="Average room rate" value={rupee(cur.rate)} prev={rupee(prev.rate)} change={ch("rate")} />
          <Kpi label={`Occupancy (${data.nRooms} rooms)`} value={cur.occ != null ? (cur.occ * 100).toFixed(1) + "%" : "—"} prev={prev.occ != null ? (prev.occ * 100).toFixed(1) + "%" : "—"} change={ch("occ")} isPts />
          <Kpi label="Restaurant sale" value={money(cur.rest)} prev={money(prev.rest)} change={ch("rest")} />
          <Kpi label="Banquet money received" value={money(cur.bq)} prev={money(prev.bq)} change={ch("bq")} />
        </Box>
      )}

      {cur && (
        <Box>
          <Typography variant="h6" fontWeight={700}>Key highlights</Typography>
          <Box sx={{ display: "grid", gap: 1.5, mt: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(4, 1fr)" } }}>
            <Highlight good big={money(v.best.gh_revenue)} text={`Best guest house month of ${Y}: ${v.best.mon} ${Y}${v.bestEver ? ", the best in all the data" : ""}.`} sub={v.best.occupancy != null ? `${(v.best.occupancy * 100).toFixed(0)}% occupancy at ${rupee(v.best.avg_rate)} a night.` : ""} />
            <Highlight good={v.up >= v.nn / 2} big={v.nn ? `${v.up} of ${v.nn}` : "—"} text={v.nn ? `Months with a higher average room rate than ${B}.` : `Room rate needs room-nights; old Tally records don't have them.`} sub={!v.nn ? "" : v.up >= v.nn / 2 ? "Guests accepted the higher rate; keep it." : "Rates slipped in most months; check pricing."} />
            {v.worst ? (
              v.worst.c < 0
                ? <Highlight good={false} big={pct(v.worst.c, 0)} text={`Restaurant sale on ${DAYN[v.worst.day]}s, the biggest fall. Lower on ${v.weekRows.filter((r) => r.c < 0).length} of 7 weekdays.`} sub="Points to fewer regular customers." />
                : <Highlight good big={pct(v.bestD.c, 0)} text={`Restaurant sale on ${DAYN[v.bestD.day]}s, the biggest rise.`} sub="Every weekday was up." />
            ) : <Highlight good big="—" text="Day-of-week figures start in 2025." sub="Not available for this pair of years." />}
            {v.strong(Y) != null && v.strong(B) != null
              ? <Highlight good={v.strong(Y) >= v.strong(B)} big={`${v.strong(Y)} days`} text={`Restaurant days above ₹40,000, ${v.strong(Y) >= v.strong(B) ? "up" : "down"} from ${v.strong(B)} in ${B}.`} sub={`Same months (${span(data.window.first, data.window.last)}).`} />
              : <Highlight good big="—" text="Day-level figures start in 2025." sub="Not available for this pair of years." />}
          </Box>
        </Box>
      )}

      <Section title={`Year by year · total income, ${span(Math.min(...v.win), Math.max(...v.win))} each year${v.avgGrowth != null ? ` · average ${pct(v.avgGrowth)} a year` : ""}`}>
        <Legend2 items={[{ name: "Guest house", color: C.gh }, { name: "Restaurant", color: C.rest }, { name: "Banquet", color: C.bq }]} />
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={v.yearBars} margin={{ top: 46, right: 10, left: 10, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#EEF2F7" />
            <XAxis dataKey="year" tickFormatter={(y) => (v.yearBars.find((r) => r.year === y)?.months < v.win.length ? `${y} (part)` : y)} />
            <YAxis hide />
            <Tooltip content={({ active, payload }) => active && payload?.length ? <TipBox title={`${payload[0].payload.year} · same months`} rows={[{ name: "Guest house", value: money(payload[0].payload.gh), color: C.gh }, { name: "Restaurant", value: money(payload[0].payload.rest), color: C.rest }, { name: "Banquet", value: money(payload[0].payload.bq), color: C.bq }, { name: "Total", value: money(payload[0].payload.total) }]} /> : null} />
            <Bar isAnimationActive={false} dataKey="gh" stackId="a" fill={C.gh} maxBarSize={90}>{v.yearBars.map((r) => <Cell key={r.year} fillOpacity={r.y === Y ? 1 : 0.5} />)}</Bar>
            <Bar isAnimationActive={false} dataKey="rest" stackId="a" fill={C.rest} maxBarSize={90}>{v.yearBars.map((r) => <Cell key={r.year} fillOpacity={r.y === Y ? 1 : 0.5} />)}</Bar>
            <Bar isAnimationActive={false} dataKey="bq" stackId="a" fill={C.bq} maxBarSize={90} radius={[4, 4, 0, 0]}>
              {v.yearBars.map((r) => <Cell key={r.year} fillOpacity={r.y === Y ? 1 : 0.5} />)}
              <LabelList dataKey="total" content={({ x, y, width, value }) => { const r = v.yearBars.find((b) => b.total === value); if (!r) return null; return (
                <g>
                  <text x={x + width / 2} y={y - 24} textAnchor="middle" fontSize={13} fontWeight={700} fill="#0F172A">{money(r.total)}</text>
                  {r.growth != null && <text x={x + width / 2} y={y - 8} textAnchor="middle" fontSize={11.5} fontWeight={700} fill={r.growth >= 0 ? C.up : C.down}>{pct(r.growth)}</text>}
                </g>
              ); }} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <Typography variant="caption" color="text.secondary">
          {v.years.length < 3 ? `Only ${v.years.join(" and ")} so far. Older years appear here, with average yearly growth, once their monthly totals are added.` : "Each year counts the same months, so the bars compare like with like."}
        </Typography>
      </Section>

      {B != null && (
        <Section title={`Where ${Y} was won and lost vs ${B} · below in ${v.change.filter((r) => r.total < 0).length} of ${v.change.length} months`}>
          <Legend2 items={[{ name: `Above ${B}`, color: C.up }, { name: `Below ${B}`, color: C.down }]} />
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={v.change} margin={{ top: 22, right: 10, left: 10, bottom: 22 }}>
              <XAxis dataKey="mon" axisLine={false} tickLine={false} />
              <YAxis hide domain={[(d) => Math.min(0, d) * 1.3, (d) => Math.max(0, d) * 1.3]} />
              <ReferenceLine y={0} stroke="#94A3B8" />
              <Tooltip cursor={{ fill: "rgba(148,163,184,0.12)" }} content={({ active, payload }) => active && payload?.length ? <TipBox title={`${payload[0].payload.mon} ${Y}: ${money(payload[0].payload.total)} vs ${B}`} rows={[{ name: "Guest house", value: money(payload[0].payload.gh), color: C.gh }, { name: "Restaurant", value: money(payload[0].payload.rest), color: C.rest }, { name: "Banquet", value: money(payload[0].payload.bq), color: C.bq }]} /> : null} />
              <Bar isAnimationActive={false} dataKey="total" maxBarSize={48} radius={4}>
                {v.change.map((r) => <Cell key={r.mon} fill={r.total >= 0 ? C.up : C.down} fillOpacity={0.8} />)}
                <LabelList dataKey="total" content={({ x, y, width, height, value }) => <text x={x + width / 2} y={value >= 0 ? Math.min(y, y + height) - 6 : Math.max(y, y + height) + 14} textAnchor="middle" fontSize={11} fontWeight={700} fill="#0F172A">{(value > 0 ? "+" : "−") + (Math.abs(value) / 1e5).toFixed(2)} L</text>} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      <Box sx={grid2}>
        <Section title="Guest house · room revenue by month">
          <Legend2 items={[{ name: String(B), color: C.b }, { name: String(Y), color: C.y }]} />
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={v.pair} margin={{ top: 18, right: 4, left: 4, bottom: 0 }} barGap={2}>
              <CartesianGrid vertical={false} stroke="#EEF2F7" />
              <XAxis dataKey="mon" tickLine={false} />
              <YAxis hide />
              <Tooltip content={({ active, payload }) => active && payload?.length ? <TipBox title={payload[0].payload.mon} rows={[[B, payload[0].payload.rB, C.b], [Y, payload[0].payload.rY, C.y]].map(([y, r, c]) => ({ name: `${y}${r.room_nights ? ` · ${r.room_nights} nights · ${(r.occupancy * 100).toFixed(0)}%` : ""}`, value: money(r.gh_revenue), color: c }))} /> : null} />
              <Bar isAnimationActive={false} dataKey="gB" fill={C.b} radius={[3, 3, 0, 0]} maxBarSize={30}><LabelList dataKey="gB" position="top" formatter={lakh1} style={{ fontSize: 10, fill: "#64748B" }} /></Bar>
              <Bar isAnimationActive={false} dataKey="gY" fill={C.y} radius={[3, 3, 0, 0]} maxBarSize={30}><LabelList dataKey="gY" position="top" formatter={lakh1} style={{ fontSize: 10, fill: "#0F172A", fontWeight: 700 }} /></Bar>
            </BarChart>
          </ResponsiveContainer>
          <Typography variant="caption" color="text.secondary">Bar labels in ₹ lakh. Hover for room-nights and occupancy.</Typography>
        </Section>
        <Section title="Guest house · average room rate, every year">
          <YearLines k="r" height={260} tick={(t) => "₹" + t.toLocaleString("en-IN")} tip={rupee} pad={100} note="Room revenue ÷ room-nights sold (room-nights start in 2025). " />
        </Section>
      </Box>

      <Section title="Restaurant · average sale per day, every year">
        <YearLines k="s" height={300} tick={(t) => "₹" + Math.round(t / 1000) + "k"} tip={(x) => rupee(x) + " a day"} pad={3000} beat={beatOf("s")} note={v.toBeat ? `${v.toBeat.mon} ${B} is the next month to beat. ` : ""} />
      </Section>

      <Section title="Guest house · room revenue per day, every year">
        <YearLines k="g" height={300} tick={(t) => "₹" + (t >= 1000 ? (t / 1000).toFixed(t >= 10000 ? 0 : 1) + "k" : t)} tip={(x) => rupee(x) + " a day"} beat={beatOf("g")} note="Month's room revenue ÷ days (this month: days so far). " />
      </Section>

      <Box sx={grid2}>
        <Section title="Restaurant · average sale by day of week">
          {v.hasWk ? (
            <>
              <Legend2 items={[{ name: String(B), color: C.b }, { name: String(Y), color: C.y }]} />
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={v.weekRows} margin={{ top: 34, right: 4, left: 4, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="#EEF2F7" />
                  <XAxis dataKey="day" tickLine={false} />
                  <YAxis hide />
                  <Tooltip formatter={(val, name) => [rupee(val) + " a day", name === "b" ? B : Y]} labelFormatter={(d) => DAYN[d]} />
                  <Bar isAnimationActive={false} dataKey="b" fill={C.b} radius={[3, 3, 0, 0]} maxBarSize={30}><LabelList dataKey="b" position="top" formatter={(x) => (x / 1000).toFixed(1)} style={{ fontSize: 10, fill: "#64748B" }} /></Bar>
                  <Bar isAnimationActive={false} dataKey="y" fill={C.y} radius={[3, 3, 0, 0]} maxBarSize={30}>
                    <LabelList dataKey="y" position="top" formatter={(x) => (x / 1000).toFixed(1)} style={{ fontSize: 10, fill: "#0F172A", fontWeight: 700 }} />
                    <LabelList dataKey="c" content={({ x, index }) => { const r = v.weekRows[index]; return <text x={x - 1} y={16} textAnchor="middle" fontSize={12} fontWeight={800} fill={r.c >= 0 ? C.up : C.down}>{pct(r.c, 0)}</text>; }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Typography variant="caption" color="text.secondary">Top figures = change vs {B}. Bar labels in ₹ thousand.</Typography>
            </>
          ) : <Typography variant="body2" color="text.secondary">Day-of-week figures need daily records for both years; they start in 2025.</Typography>}
        </Section>
        <Section title="Restaurant · strong, normal and weak days">
          <Stack spacing={1.5}>
            {[...new Set(v.bands.map((r) => r.year))].sort().map((y) => {
              const rs = v.bands.filter((r) => r.year === y).sort((a, b) => a.order - b.order), tot = rs.reduce((s, r) => s + r.days, 0);
              const col = { 1: C.up, 2: "#CBD5E1", 3: C.down };
              return (
                <Box key={y}>
                  <Stack direction="row" justifyContent="space-between"><Typography variant="caption" fontWeight={y === Y ? 800 : 400}>{y}</Typography><Typography variant="caption" color="text.secondary">{rs.map((r) => `${r.band.split(" ")[0]} ${r.days}`).join(" · ")}</Typography></Stack>
                  <Box sx={{ display: "flex", height: 26, borderRadius: 1.5, overflow: "hidden", gap: "2px", mt: 0.5 }}>
                    {rs.map((r) => <Box key={r.order} title={`${r.band}: ${r.days} of ${tot} days`} sx={{ flex: `${r.days} 1 0`, bgcolor: col[r.order], color: r.order === 2 ? "#334155" : "#fff", fontSize: 12, fontWeight: 700, display: "grid", placeItems: "center" }}>{r.days / tot > 0.12 ? r.days : ""}</Box>)}
                  </Box>
                </Box>
              );
            })}
            <Legend2 items={[{ name: "Strong (₹40k+)", color: C.up }, { name: "Normal (₹30–40k)", color: "#CBD5E1" }, { name: "Weak (under ₹30k)", color: C.down }]} />
            <Typography variant="caption" color="text.secondary">Restaurant sale per day, {span(data.window.first, data.window.last)}. Day-level data starts in 2025.</Typography>
          </Stack>
        </Section>
      </Box>

      <Section title="Banquet · money received by month">
        <Legend2 items={[{ name: String(B), color: C.b }, { name: String(Y), color: C.y }]} />
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={v.pair} margin={{ top: 18, right: 4, left: 4, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke="#EEF2F7" />
            <XAxis dataKey="mon" tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(val, name) => [money(val), name === "bB" ? B : Y]} />
            <Bar isAnimationActive={false} dataKey="bB" fill={C.b} radius={[3, 3, 0, 0]} maxBarSize={30}><LabelList dataKey="bB" position="top" formatter={lakh1} style={{ fontSize: 10, fill: "#64748B" }} /></Bar>
            <Bar isAnimationActive={false} dataKey="bY" fill={C.y} radius={[3, 3, 0, 0]} maxBarSize={30}><LabelList dataKey="bY" position="top" formatter={lakh1} style={{ fontSize: 10, fill: "#0F172A", fontWeight: 700 }} /></Bar>
          </BarChart>
        </ResponsiveContainer>
        <Typography variant="caption" color="text.secondary">
          Bar labels in ₹ lakh. Office book + banquet module payments.{v.missOffice ? ` ${v.missOffice} days are missing from the office book in these months, so those totals are a minimum.` : ""}{v.zeroBq.length ? ` No banquet money came in during ${v.zeroBq.join(", ")} ${Y}.` : ""}
        </Typography>
      </Section>

      <Section title="Banquet · money received by month, every year">
        <YearLines k="b" height={280} tick={(t) => (t >= 100000 ? (t / 100000).toFixed(1) + "L" : Math.round(t / 1000) + "k")} tip={money} beat={beatOf("b")} note="Whole month's banquet money (this month: so far). " />
      </Section>

      <ExpenseSection expenses={data.expenses || []} months={v.rows} Y={Y} B={B} ms={v.ms} win={v.win} />

      <Section title={`Month by month · ${Y} vs ${B}`}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Month</TableCell>
                <TableCell align="right">GH {B}</TableCell><TableCell align="right">GH {Y}</TableCell><TableCell align="right">Change</TableCell>
                <TableCell align="right">Restaurant {B}</TableCell><TableCell align="right">Restaurant {Y}</TableCell><TableCell align="right">Change</TableCell>
                <TableCell align="right">Banquet {B}</TableCell><TableCell align="right">Banquet {Y}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {v.pair.map((r) => {
                const gc = r.rB.gh_revenue ? r.rY.gh_revenue / r.rB.gh_revenue - 1 : null, rc = r.rB.restaurant ? r.rY.restaurant / r.rB.restaurant - 1 : null;
                const cc = (c) => ({ color: c == null ? undefined : c >= 0 ? C.up : C.down, fontWeight: 700 });
                return (
                  <TableRow key={r.mon} hover>
                    <TableCell>{r.mon}</TableCell>
                    <TableCell align="right">{money(r.rB.gh_revenue)}</TableCell><TableCell align="right">{money(r.rY.gh_revenue)}</TableCell><TableCell align="right" sx={cc(gc)}>{pct(gc, 0)}</TableCell>
                    <TableCell align="right">{money(r.rB.restaurant)}</TableCell><TableCell align="right">{money(r.rY.restaurant)}</TableCell><TableCell align="right" sx={cc(rc)}>{pct(rc, 0)}</TableCell>
                    <TableCell align="right">{money(r.rB.banquet)}</TableCell><TableCell align="right">{money(r.rY.banquet)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Box>
        <Typography variant="h6" fontWeight={700}>What to do in the next 3 months</Typography>
        <Box sx={{ display: "grid", gap: 1.5, mt: 1, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", lg: "repeat(3, 1fr)" } }}>
          {[
            ["Restaurant", "Navratri and Diwali thali, farsan and sweet-box pre-orders, plus a family dinner offer, starting now."],
            ["Restaurant", "One fixed weekly offer on the weakest weekday, tracked for 8 weeks. Push takeaway and online orders on Saturdays."],
            ["Restaurant", "Ask regular customers why they come less often, and compare prices and menu with the nearest competitors."],
            ["Guest house", "Keep the higher rate. Add about 10% for the after-Diwali weeks and wedding dates, with a 2-night minimum."],
            ["Banquet", "Call every past enquiry for the November–December wedding dates and take an advance on every booking."],
            ["Banquet", "Enter each booking in the banquet module so next year's report can count events and value."],
          ].map(([biz, t]) => (
            <Card key={t} variant="outlined"><CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Typography variant="overline" color="text.secondary">{biz}</Typography>
              <Typography variant="body2">{t}</Typography>
            </CardContent></Card>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default PerformanceDashboard;
