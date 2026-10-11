// 🧮 Merged graph (naya): saare business ek saath — roz ki kamai, hissa, office ka kharch, hafte-wise.
import { useMemo, useState } from "react";
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import dayjs from "dayjs";
import { BIZ, C, money, pct, chg, sum, mergeMap, usePeriod, PeriodBar, useBizDaily, compareRows, compareLabel, Kpi, KpiGrid, Panel, Grid2, Legend, TipBox, CalendarHeat, BarList, Loading, Insight } from "./bizShared";

const KEYS = ["gh", "rest", "banquet", "bakery", "moti"];
const val = (r, k) => (k === "gh" ? r.gh.rev : k === "rest" ? (r.rest.has ? r.rest.sale : 0) : r[k] || 0);
const total = (r) => KEYS.reduce((s, k) => s + val(r, k), 0);
const OTHER_IN = new Set(["Bhangar/oil", "Soda Shop", "DRA Company GH", "BQ decoration", "Moti Wifi"]); // sirf business ki chhoti aavak (loan / personal / pending nahi)

const MergedGraph2 = () => {
  const period = usePeriod("30");
  const [compare, setCompare] = useState("ly");
  const { loading, data } = useBizDaily(period.range[0], period.range[1]);

  const v = useMemo(() => {
    if (!data) return null;
    const days = data.days, prev = compareRows(data, compare);
    const by = (rows) => Object.fromEntries(KEYS.map((k) => [k, sum(rows, (r) => val(r, k))]));
    const a = by(days), b = by(prev);
    const ta = sum(days, total), tb = sum(prev, total);
    const otherIn = (rows) => sum(rows, (r) => Object.entries(r.office.in || {}).filter(([c]) => OTHER_IN.has(c)).reduce((s, [, x]) => s + x, 0));
    const out = mergeMap(days, (r) => r.office.out), outPrev = mergeMap(prev, (r) => r.office.out);
    const kit = sum(days, (r) => r.rest.expenses), kitPrev = sum(prev, (r) => r.rest.expenses);
    const upad = sum(days, (r) => r.rest.upad), upadPrev = sum(prev, (r) => r.rest.upad);
    const officeBiz = Object.entries(out).filter(([c]) => c !== "Personal").reduce((s, [, x]) => s + x, 0);
    const officeBizPrev = Object.entries(outPrev).filter(([c]) => c !== "Personal").reduce((s, [, x]) => s + x, 0);
    const chart = days.map((r, i) => ({ date: r.date, label: dayjs(r.date).format(days.length > 62 ? "D MMM" : "D"), ...Object.fromEntries(KEYS.map((k) => [k, val(r, k)])), total: total(r), prev: prev[i] ? total(prev[i]) : null, prevDate: prev[i]?.date }));
    // Hafte-wise (Monday se)
    const weeks = {};
    days.forEach((r, i) => {
      const d = dayjs(r.date), wk = d.subtract((d.day() + 6) % 7, "day").format("YYYY-MM-DD");
      const w = (weeks[wk] ||= { week: wk, n: 0, total: 0, prev: 0, ...Object.fromEntries(KEYS.map((k) => [k, 0])) });
      w.n++; w.total += total(r); if (prev[i]) w.prev += total(prev[i]);
      KEYS.forEach((k) => (w[k] += val(r, k)));
    });
    const best = days.reduce((x, r) => (!x || total(r) > total(x) ? r : x), null);
    return { days, prev, a, b, ta, tb, chart, out, outPrev, kit, kitPrev, upad, upadPrev, officeBiz, officeBizPrev, other: otherIn(days), otherPrev: otherIn(prev), weeks: Object.values(weeks), best };
  }, [data, compare]);

  const cl = compareLabel(compare);
  const net = v ? v.ta - v.kit - v.officeBiz : 0, netPrev = v ? v.tb - v.kitPrev - v.officeBizPrev : 0;
  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">All businesses · {v ? `${dayjs(data.from).format("D MMM YYYY")} – ${dayjs(data.to).format("D MMM YYYY")}` : ""}</Typography>
        <PeriodBar period={period} compare={compare} setCompare={setCompare} />
      </Box>
      <Loading loading={loading} />
      {v && (
        <>
          {v.ta > 0 ? (
            <Insight tone={chg(v.ta, v.tb) >= 0 ? "good" : "bad"}>
              Total income <b>{money(v.ta)}</b>{v.tb ? <>, <b>{pct(chg(v.ta, v.tb))}</b> vs {cl}</> : ""}. Restaurant is <b>{((v.a.rest / v.ta) * 100).toFixed(0)}%</b>, guest house <b>{((v.a.gh / v.ta) * 100).toFixed(0)}%</b>.
              {v.best ? <> Best day <b>{dayjs(v.best.date).format("ddd D MMM")}</b> ({money(total(v.best))}).</> : null}
            </Insight>
          ) : <Insight tone="info">No entries in these dates yet. Choose another period above.</Insight>}

          <KpiGrid>
            <Kpi label="Total income" value={money(v.ta)} delta={chg(v.ta, v.tb)} deltaLabel={`vs ${money(v.tb)}`} spark={v.chart.map((c) => c.total)} color={C.ink} />
            {KEYS.filter((k) => v.a[k] || v.b[k]).slice(0, 3).map((k) => (
              <Kpi key={k} label={BIZ[k].label} value={money(v.a[k])} delta={chg(v.a[k], v.b[k])} deltaLabel={`vs ${money(v.b[k])}`} spark={v.chart.map((c) => c[k])} color={BIZ[k].color} />
            ))}
            <Kpi label="Kharch (kitchen + office)" value={money(v.kit + v.officeBiz)} delta={chg(v.kit + v.officeBiz, v.kitPrev + v.officeBizPrev)} deltaLabel={`vs ${money(v.kitPrev + v.officeBizPrev)}`} invert color={C.down} hint="Personal not included" />
            <Kpi label="Income − kharch" value={money(net)} delta={netPrev ? chg(net, netPrev) : null} deltaLabel={`vs ${money(netPrev)}`} color={C.up} hint="Rough; before salary bank transfers & rent" />
          </KpiGrid>

          <Panel title="Income every day, by business" sub={`Stacked bars = each business · grey dashed = ${cl} total (same day)`}>
            <Legend items={[...KEYS.filter((k) => v.a[k]).map((k) => ({ name: BIZ[k].label, color: BIZ[k].color })), { name: `${cl} total`, color: C.ly, line: true, dash: true }]} />
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={v.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="label" tickLine={false} interval="preserveStartEnd" minTickGap={8} fontSize={11} />
                <YAxis tickFormatter={(t) => (t >= 1000 ? `${Math.round(t / 1000)}k` : t)} width={40} fontSize={11} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const r = payload[0].payload;
                  return <TipBox title={dayjs(r.date).format("dddd, D MMM YYYY")} rows={[...KEYS.filter((k) => r[k]).map((k) => ({ name: BIZ[k].label, value: money(r[k]), color: BIZ[k].color })), { name: "Total", value: money(r.total) }, r.prev != null && { name: `${cl} (${dayjs(r.prevDate).format("D MMM YY")})`, value: money(r.prev), color: C.ly }]} />;
                }} />
                {KEYS.map((k, i) => <Bar key={k} dataKey={k} stackId="t" fill={BIZ[k].color} isAnimationActive={false} maxBarSize={28} radius={i === KEYS.length - 1 ? [3, 3, 0, 0] : 0} />)}
                <Line dataKey="prev" stroke={C.ly} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>

          <Grid2 cols={{ xs: "1fr", md: "1fr 1fr 1fr" }}>
            <Panel title="Share of income" sub={`Grey bar = ${cl}`}>
              <BarList compare total={v.ta} items={KEYS.map((k) => ({ name: BIZ[k].label, value: v.a[k], prev: v.b[k], color: BIZ[k].color })).filter((i) => i.value || i.prev)} />
              {v.other > 0 && <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>Other business income (oil, soda shop, DRA, wifi): {money(v.other)}{v.otherPrev ? ` · ${cl} ${money(v.otherPrev)}` : ""}</Typography>}
            </Panel>
            <Panel title="Office money out, by category" sub={`Grey = ${cl}; red % = spent more`}>
              <BarList compare color={C.down} items={Object.entries(v.out).sort((x, y) => y[1] - x[1]).map(([k, x]) => ({ name: k, value: x, prev: v.outPrev[k] || 0, invert: true, color: k === "Personal" ? "#94A3B8" : C.down }))} />
              {!Object.keys(v.out).length && <Typography variant="body2" color="text.secondary">No office book entries.</Typography>}
            </Panel>
            <Panel title="Busiest days (all businesses)" sub="Darker = more income">
              <CalendarHeat rows={v.days} value={total} color={C.ink} />
              <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
                <Box><Typography variant="caption" color="text.secondary">Kitchen kharch</Typography><Typography fontWeight={800}>{money(v.kit)}</Typography></Box>
                <Box><Typography variant="caption" color="text.secondary">Staff upad</Typography><Typography fontWeight={800}>{money(v.upad)}</Typography></Box>
              </Stack>
            </Panel>
          </Grid2>

          <Panel title="Week by week" sub={`Monday to Sunday · change vs ${cl}`}>
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Week from</TableCell>{KEYS.filter((k) => v.a[k]).map((k) => <TableCell key={k} align="right">{BIZ[k].label}</TableCell>)}<TableCell align="right">Total</TableCell><TableCell align="right">{cl}</TableCell><TableCell align="right">Change</TableCell></TableRow></TableHead>
                <TableBody>
                  {v.weeks.map((w) => {
                    const c = w.prev ? w.total / w.prev - 1 : null;
                    return (
                      <TableRow key={w.week} hover>
                        <TableCell>{dayjs(w.week).format("D MMM")}{w.n < 7 ? <Typography component="span" variant="caption" color="text.secondary"> ({w.n} days)</Typography> : null}</TableCell>
                        {KEYS.filter((k) => v.a[k]).map((k) => <TableCell key={k} align="right">{money(w[k])}</TableCell>)}
                        <TableCell align="right" sx={{ fontWeight: 800 }}>{money(w.total)}</TableCell>
                        <TableCell align="right">{money(w.prev)}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700, color: c == null ? undefined : c >= 0 ? C.up : C.down }}>{pct(c, 0)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Panel>
        </>
      )}
    </Box>
  );
};

export default MergedGraph2;
