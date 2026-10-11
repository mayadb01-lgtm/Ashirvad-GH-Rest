// 🍽️ Restaurant graph (naya): sale, kharch, upad, udhaar — har din, hafte ke din, head-wise, pichhle saal se tulna.
import { useMemo, useState } from "react";
import { Box, Stack, Typography } from "@mui/material";
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList } from "recharts";
import dayjs from "dayjs";
import { BIZ, C, money, rupee, pct, chg, sum, mergeMap, usePeriod, PeriodBar, useBizDaily, compareRows, compareLabel, Kpi, KpiGrid, Panel, Grid2, Legend, TipBox, CalendarHeat, BarList, Loading, Insight, byWeekday } from "./bizShared";

const col = BIZ.rest.color;

const RestGraph2 = () => {
  const period = usePeriod("30");
  const [compare, setCompare] = useState("ly");
  const { loading, data } = useBizDaily(period.range[0], period.range[1]);

  const v = useMemo(() => {
    if (!data) return null;
    const days = data.days, prev = compareRows(data, compare);
    const open = (rows) => rows.filter((r) => r.rest.has);
    const tot = (rows) => {
      const o = open(rows);
      const sale = sum(o, (r) => r.rest.sale);
      return { sale, open: o.length, avg: o.length ? sale / o.length : 0, cash: sum(o, (r) => r.rest.cash), card: sum(o, (r) => r.rest.card), pp: sum(o, (r) => r.rest.pp), upad: sum(o, (r) => r.rest.upad), pending: sum(o, (r) => r.rest.pending), expenses: sum(o, (r) => r.rest.expenses),
        strong: o.filter((r) => r.rest.sale >= 40000).length, weak: o.filter((r) => r.rest.sale < 30000).length };
    };
    const a = tot(days), b = tot(prev);
    const ma = (i) => { const w = days.slice(Math.max(0, i - 6), i + 1).filter((r) => r.rest.has); return w.length ? sum(w, (r) => r.rest.sale) / w.length : null; };
    const chart = days.map((r, i) => ({ date: r.date, label: dayjs(r.date).format(days.length > 62 ? "D MMM" : "D"), sale: r.rest.has ? r.rest.sale : 0, exp: r.rest.expenses, prev: prev[i]?.rest.has ? prev[i].rest.sale : null, prevDate: prev[i]?.date, ma: ma(i), weekend: [0, 6].includes(dayjs(r.date).day()) }));
    const best = open(days).reduce((x, r) => (!x || r.rest.sale > x.rest.sale ? r : x), null);
    const worst = open(days).reduce((x, r) => (!x || r.rest.sale < x.rest.sale ? r : x), null);
    const wNow = byWeekday(days, (r) => r.rest.sale, (r) => r.rest.has), wPrev = byWeekday(prev, (r) => r.rest.sale, (r) => r.rest.has);
    const wk = wNow.map((w, i) => ({ day: w.day, now: w.avg, prev: wPrev[i].avg, c: wPrev[i].avg ? w.avg / wPrev[i].avg - 1 : null }));
    const exp = mergeMap(days, (r) => r.rest.exp), expPrev = mergeMap(prev, (r) => r.rest.exp);
    const cats = {};
    days.forEach((r) => Object.entries(r.rest.exp || {}).forEach(([, o]) => { const k = o.category || "Not set"; cats[k] = (cats[k] || 0) + o.amount; }));
    const upadBy = mergeMap(days, (r) => r.rest.upadBy);
    return { days, prev, a, b, chart, best, worst, wk, exp, expPrev, cats, upadBy };
  }, [data, compare]);

  const cl = compareLabel(compare);
  const expPct = (t) => (t.sale ? t.expenses / t.sale : null);
  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">Restaurant · {v ? `${dayjs(data.from).format("D MMM YYYY")} – ${dayjs(data.to).format("D MMM YYYY")}` : ""}</Typography>
        <PeriodBar period={period} compare={compare} setCompare={setCompare} />
      </Box>
      <Loading loading={loading} />
      {v && (
        <>
          <Stack spacing={1}>
            {v.a.open === 0 && <Insight tone="info">No restaurant entries in these dates yet. Choose another period above.</Insight>}
            {v.a.open > 0 && (
              <Insight tone={chg(v.a.sale, v.b.sale) >= 0 ? "good" : "bad"}>
                Sale <b>{money(v.a.sale)}</b> in {v.a.open} days ({rupee(v.a.avg)} a day){v.b.sale ? <>, <b>{pct(chg(v.a.sale, v.b.sale))}</b> vs {cl}</> : ""}.
                {v.best ? <> Best day <b>{dayjs(v.best.date).format("ddd D MMM")}</b> ({money(v.best.rest.sale)}), weakest <b>{dayjs(v.worst.date).format("ddd D MMM")}</b> ({money(v.worst.rest.sale)}).</> : null}
              </Insight>
            )}
            {v.a.sale > 0 && v.b.sale > 0 && expPct(v.a) > expPct(v.b) * 1.1 && (
              <Insight tone="bad">Kitchen kharch is <b>{(expPct(v.a) * 100).toFixed(1)}%</b> of sale, up from {(expPct(v.b) * 100).toFixed(1)}% ({cl}). Check the top heads below.</Insight>
            )}
          </Stack>

          <KpiGrid>
            <Kpi label="Restaurant sale" value={money(v.a.sale)} delta={chg(v.a.sale, v.b.sale)} deltaLabel={`vs ${money(v.b.sale)}`} spark={v.chart.map((c) => c.sale)} color={col} />
            <Kpi label="Average per day" value={rupee(v.a.avg)} delta={chg(v.a.avg, v.b.avg)} deltaLabel={`vs ${rupee(v.b.avg)}`} color={col} hint={`${v.a.open} days open`} />
            <Kpi label="Strong days (₹40k+)" value={`${v.a.strong} days`} delta={v.b.strong ? chg(v.a.strong, v.b.strong) : null} deltaLabel={`vs ${v.b.strong}`} color={col} hint={`${v.a.weak} weak days (under ₹30k)`} />
            <Kpi label="Kitchen kharch" value={money(v.a.expenses)} delta={chg(v.a.expenses, v.b.expenses)} deltaLabel={`vs ${money(v.b.expenses)}`} invert color="#DC2626" hint={expPct(v.a) != null ? `${(expPct(v.a) * 100).toFixed(1)}% of sale` : ""} />
            <Kpi label="Staff upad" value={money(v.a.upad)} delta={chg(v.a.upad, v.b.upad)} deltaLabel={`vs ${money(v.b.upad)}`} invert color="#7C3AED" />
            <Kpi label="Udhaar (pending)" value={money(v.a.pending)} delta={chg(v.a.pending, v.b.pending)} deltaLabel={`vs ${money(v.b.pending)}`} invert color="#B45309" hint="Sale not yet collected" />
          </KpiGrid>

          <Panel title="Sale every day" sub={`Bars = sale · grey dashed = ${cl} (same day) · line = 7-day average · red dots = kitchen kharch. Darker bars are weekends.`}>
            <Legend items={[{ name: "Sale", color: col }, { name: cl[0].toUpperCase() + cl.slice(1), color: C.ly, line: true, dash: true }, { name: "7-day average", color: C.ink, line: true }, { name: "Kitchen kharch", color: C.down, line: true }]} />
            <ResponsiveContainer width="100%" height={310}>
              <ComposedChart data={v.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="label" tickLine={false} interval="preserveStartEnd" minTickGap={8} fontSize={11} />
                <YAxis tickFormatter={(t) => (t >= 1000 ? `${Math.round(t / 1000)}k` : t)} width={40} fontSize={11} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const r = payload[0].payload;
                  return <TipBox title={dayjs(r.date).format("dddd, D MMM YYYY")} rows={[{ name: "Sale", value: money(r.sale), color: col }, r.prev != null && { name: `${cl} (${dayjs(r.prevDate).format("D MMM YY")})`, value: money(r.prev), color: C.ly }, r.ma != null && { name: "7-day average", value: money(r.ma) }, { name: "Kitchen kharch", value: money(r.exp), color: C.down }]} />;
                }} />
                <Bar dataKey="sale" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={28}>
                  {v.chart.map((r) => <Cell key={r.date} fill={col} fillOpacity={r.weekend ? 1 : 0.6} />)}
                </Bar>
                <Line dataKey="prev" stroke={C.ly} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                <Line dataKey="ma" stroke={C.ink} strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                <Line dataKey="exp" stroke="transparent" dot={{ r: 2.5, fill: C.down, stroke: "none" }} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>

          <Grid2>
            <Panel title="Busy and quiet days" sub="Each box is a day. Darker = higher sale.">
              <CalendarHeat rows={v.days} value={(r) => (r.rest.has ? r.rest.sale : 0)} color={col} />
            </Panel>
            <Panel title="Day of the week" sub={`Average sale per day · grey = ${cl} · figure on top = change`}>
              <Legend items={[{ name: cl[0].toUpperCase() + cl.slice(1), color: "#CBD5E1" }, { name: "This period", color: col }]} />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={v.wk} margin={{ top: 22, right: 4, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis dataKey="day" tickLine={false} fontSize={11} />
                  <YAxis hide />
                  <Tooltip formatter={(val, name) => [rupee(val) + " a day", name === "prev" ? cl : "This period"]} />
                  <Bar dataKey="prev" fill="#CBD5E1" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={26} />
                  <Bar dataKey="now" fill={col} radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={26}>
                    <LabelList dataKey="c" content={({ x, index }) => { const r = v.wk[index]; return r.c == null ? null : <text x={x - 1} y={14} textAnchor="middle" fontSize={11} fontWeight={800} fill={r.c >= 0 ? C.up : C.down}>{pct(r.c, 0)}</text>; }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </Grid2>

          <Grid2 cols={{ xs: "1fr", md: "1fr 1fr 1fr" }}>
            <Panel title="Where the sale went" sub="Cash, card, PhonePe, upad, udhaar and kharch paid from the counter">
              <BarList compare items={[["Cash", v.a.cash, v.b.cash], ["Card", v.a.card, v.b.card], ["PhonePe / online", v.a.pp, v.b.pp], ["Udhaar (pending)", v.a.pending, v.b.pending, true], ["Staff upad", v.a.upad, v.b.upad, true], ["Kitchen kharch", v.a.expenses, v.b.expenses, true]].map(([name, value, prev, invert]) => ({ name, value, prev, invert, color: invert ? "#F97316" : col }))} />
            </Panel>
            <Panel title="Top kitchen kharch heads" sub={`Grey = ${cl}; red % = spent more`}>
              <BarList compare color="#DC2626" items={Object.entries(v.exp).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, x]) => ({ name: k, value: x, prev: v.expPrev[k] || 0, invert: true }))} />
              {!Object.keys(v.exp).length && <Typography variant="body2" color="text.secondary">No kharch entered.</Typography>}
            </Panel>
            <Stack spacing={2}>
              <Panel title="Kharch by category">
                <BarList color="#DC2626" items={Object.entries(v.cats).sort((a, b) => b[1] - a[1]).map(([k, x]) => ({ name: k, value: x }))} />
              </Panel>
              <Panel title="Upad by staff" sub="Top 8">
                <BarList color="#7C3AED" items={Object.entries(v.upadBy).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, x]) => ({ name: k, value: x }))} />
                {!Object.keys(v.upadBy).length && <Typography variant="body2" color="text.secondary">No upad in these dates.</Typography>}
              </Panel>
            </Stack>
          </Grid2>
        </>
      )}
    </Box>
  );
};

export default RestGraph2;
