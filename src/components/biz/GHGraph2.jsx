// 🏨 Guest house graph (naya): kamai, occupancy, rate, room-wise, guest mix — pichhle saal se tulna ke saath.
import { useMemo, useState } from "react";
import { Box, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, ReferenceLine } from "recharts";
import dayjs from "dayjs";
import { BIZ, C, money, rupee, pct, chg, sum, mergeMap, usePeriod, PeriodBar, useBizDaily, compareRows, compareLabel, Kpi, KpiGrid, Panel, Grid2, Legend, TipBox, CalendarHeat, BarList, Loading, Insight, byWeekday } from "./bizShared";

const col = BIZ.gh.color;

const GHGraph2 = () => {
  const period = usePeriod("30");
  const [compare, setCompare] = useState("ly");
  const { loading, data } = useBizDaily(period.range[0], period.range[1]);

  const v = useMemo(() => {
    if (!data) return null;
    const N = data.nRooms || 16;
    const days = data.days, prev = compareRows(data, compare);
    const tot = (rows) => {
      const rev = sum(rows, (r) => r.gh.rev), rooms = sum(rows, (r) => r.gh.rooms), d = rows.length || 1;
      return { rev, rooms, occ: rooms / (N * d), adr: rooms ? rev / rooms : null, revpar: rev / (N * d), people: sum(rows, (r) => r.gh.people), unpaid: sum(rows, (r) => r.gh.unpaid), dayStays: sum(rows, (r) => r.gh.dayStays), nightStays: sum(rows, (r) => r.gh.nightStays), has: rows.filter((r) => r.gh.has).length };
    };
    const a = tot(days), b = tot(prev);
    const ma = (i) => { const w = days.slice(Math.max(0, i - 6), i + 1); return sum(w, (r) => r.gh.rev) / w.length; };
    const chart = days.map((r, i) => ({ date: r.date, label: dayjs(r.date).format(days.length > 62 ? "D MMM" : "D"), rev: r.gh.rev, rooms: r.gh.rooms, occ: r.gh.rooms / N, prev: prev[i]?.gh.rev ?? null, prevDate: prev[i]?.date, ma: ma(i), weekend: [0, 6].includes(dayjs(r.date).day()) }));
    const best = days.reduce((x, r) => (!x || r.gh.rev > x.gh.rev ? r : x), null);
    const wk = byWeekday(days, (r) => r.gh.rooms / N).map((w, i) => ({ ...w, rate: (() => { const rs = days.filter((r) => (dayjs(r.date).day() + 6) % 7 === i); const rm = sum(rs, (r) => r.gh.rooms); return rm ? sum(rs, (r) => r.gh.rev) / rm : 0; })() }));
    const weakest = wk.reduce((x, w) => (!x || w.avg < x.avg ? w : x), null);
    // Room-wise
    const roomNow = {}, roomPrev = {};
    days.forEach((r) => Object.entries(r.gh.room || {}).forEach(([k, o]) => { const x = (roomNow[k] ||= { rev: 0, nights: 0 }); x.rev += o.rev; x.nights += o.nights; }));
    prev.forEach((r) => Object.entries(r.gh.room || {}).forEach(([k, o]) => { const x = (roomPrev[k] ||= { rev: 0, nights: 0 }); x.rev += o.rev; x.nights += o.nights; }));
    const rooms = Object.entries(roomNow).map(([k, o]) => ({ room: k, ...o, rate: o.nights ? o.rev / o.nights : 0, prevRev: roomPrev[k]?.rev || 0, occ: o.nights / days.length })).sort((x, y) => y.rev - x.rev);
    const mode = mergeMap(days, (r) => r.gh.mode), modePrev = mergeMap(prev, (r) => r.gh.mode);
    const type = mergeMap(days, (r) => r.gh.type), typePrev = mergeMap(prev, (r) => r.gh.type);
    return { N, days, prev, a, b, chart, best, wk, weakest, rooms, mode, modePrev, type, typePrev };
  }, [data, compare]);

  const cl = compareLabel(compare);
  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <Box>
        <Typography variant="overline" color="text.secondary">Guest house · {v ? `${dayjs(data.from).format("D MMM YYYY")} – ${dayjs(data.to).format("D MMM YYYY")}` : ""}</Typography>
        <PeriodBar period={period} compare={compare} setCompare={setCompare} />
      </Box>
      <Loading loading={loading} />
      {v && (
        <>
          <Stack spacing={1}>
            {v.a.has === 0 && <Insight tone="info">No guest house entries in these dates yet. Choose another period above.</Insight>}
            {v.a.has > 0 && (
              <Insight tone={chg(v.a.rev, v.b.rev) >= 0 ? "good" : "bad"}>
                Room revenue <b>{money(v.a.rev)}</b>, {v.b.rev ? <><b>{pct(chg(v.a.rev, v.b.rev))}</b> vs {cl}</> : `no ${cl} data to compare`}. Occupancy <b>{(v.a.occ * 100).toFixed(1)}%</b> at <b>{rupee(v.a.adr)}</b> a room.
                {v.best?.gh.rev ? <> Best day: <b>{dayjs(v.best.date).format("ddd D MMM")}</b> ({money(v.best.gh.rev)}, {v.best.gh.rooms} rooms).</> : null}
              </Insight>
            )}
            {v.weakest && v.a.has > 0 && <Insight tone="info">Quietest day of the week: <b>{v.weakest.day}</b> ({(v.weakest.avg * 100).toFixed(0)}% full). A weekday offer or corporate rate can fill these rooms.</Insight>}
            {v.a.unpaid > 0 && <Insight tone="bad">Unpaid room charges in these dates: <b>{money(v.a.unpaid)}</b>. Check Guest Dues & Reminders.</Insight>}
          </Stack>

          <KpiGrid>
            <Kpi label="Room revenue" value={money(v.a.rev)} delta={chg(v.a.rev, v.b.rev)} deltaLabel={`vs ${money(v.b.rev)}`} spark={v.chart.map((c) => c.rev)} color={col} />
            <Kpi label="Room-nights sold" value={v.a.rooms.toLocaleString("en-IN")} delta={chg(v.a.rooms, v.b.rooms)} deltaLabel={`vs ${v.b.rooms}`} spark={v.chart.map((c) => c.rooms)} color={col} />
            <Kpi label={`Occupancy (${v.N} rooms)`} value={`${(v.a.occ * 100).toFixed(1)}%`} delta={chg(v.a.occ, v.b.occ)} deltaLabel={`vs ${(v.b.occ * 100).toFixed(1)}%`} spark={v.chart.map((c) => c.occ)} color={col} />
            <Kpi label="Average room rate" value={rupee(v.a.adr)} delta={v.b.adr ? chg(v.a.adr, v.b.adr) : null} deltaLabel={`vs ${rupee(v.b.adr)}`} color={col} />
            <Kpi label="Revenue per room (RevPAR)" value={rupee(v.a.revpar)} delta={chg(v.a.revpar, v.b.revpar)} deltaLabel={`vs ${rupee(v.b.revpar)}`} color={col} hint="Revenue ÷ all rooms, every day" />
            <Kpi label="Guests" value={v.a.people.toLocaleString("en-IN")} delta={chg(v.a.people, v.b.people)} deltaLabel={`vs ${v.b.people}`} color={col} hint={`${v.a.dayStays} day · ${v.a.nightStays} night stays`} />
          </KpiGrid>

          <Panel title="Room revenue every day" sub={`Bars = this period · grey dashed = ${cl} (same day) · line = 7-day average. Darker bars are weekends.`}>
            <Legend items={[{ name: "Revenue", color: col }, { name: cl[0].toUpperCase() + cl.slice(1), color: C.ly, line: true, dash: true }, { name: "7-day average", color: C.ink, line: true }]} />
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={v.chart} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={C.grid} />
                <XAxis dataKey="label" tickLine={false} interval="preserveStartEnd" minTickGap={8} fontSize={11} />
                <YAxis tickFormatter={(t) => (t >= 1000 ? `${Math.round(t / 1000)}k` : t)} width={40} fontSize={11} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const r = payload[0].payload;
                  return <TipBox title={dayjs(r.date).format("dddd, D MMM YYYY")} rows={[{ name: "Revenue", value: money(r.rev), color: col }, { name: "Rooms sold", value: `${r.rooms} of ${v.N} (${(r.occ * 100).toFixed(0)}%)` }, r.prev != null && { name: `${cl} (${dayjs(r.prevDate).format("D MMM YY")})`, value: money(r.prev), color: C.ly }, { name: "7-day average", value: money(r.ma) }]} />;
                }} />
                <Bar dataKey="rev" radius={[3, 3, 0, 0]} isAnimationActive={false} maxBarSize={28}>
                  {v.chart.map((r) => <Cell key={r.date} fill={col} fillOpacity={r.weekend ? 1 : 0.65} />)}
                </Bar>
                <Line dataKey="prev" stroke={C.ly} strokeDasharray="5 4" strokeWidth={2} dot={false} isAnimationActive={false} connectNulls />
                <Line dataKey="ma" stroke={C.ink} strokeWidth={2} dot={false} isAnimationActive={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Panel>

          <Grid2>
            <Panel title="How full the rooms were" sub="Each box is a day. Darker = more rooms sold. Hover a box for the number.">
              <CalendarHeat rows={v.days} value={(r) => r.gh.rooms} max={v.N} color={col} fmt={(x) => `${x} of ${v.N} rooms`} />
            </Panel>
            <Panel title="Day of the week" sub="Average occupancy and room rate on each weekday">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={v.wk} margin={{ top: 18, right: 4, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke={C.grid} />
                  <XAxis dataKey="day" tickLine={false} fontSize={11} />
                  <YAxis hide domain={[0, 1]} />
                  <Tooltip formatter={(val, name, p) => (name === "avg" ? [`${(val * 100).toFixed(0)}% full · ${rupee(p.payload.rate)} a room`, "Occupancy"] : [val, name])} />
                  <ReferenceLine y={v.a.occ} stroke={C.muted} strokeDasharray="3 3" label={{ value: `avg ${(v.a.occ * 100).toFixed(0)}%`, position: "insideTopRight", fontSize: 10, fill: C.muted }} />
                  <Bar dataKey="avg" radius={[4, 4, 0, 0]} isAnimationActive={false} label={{ position: "top", fontSize: 11, formatter: (x) => `${(x * 100).toFixed(0)}%` }}>
                    {v.wk.map((w) => <Cell key={w.day} fill={w === v.weakest ? C.down : col} fillOpacity={w === v.weakest ? 0.8 : 0.75} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Panel>
          </Grid2>

          <Grid2 cols={{ xs: "1fr", md: "3fr 2fr" }}>
            <Panel title="Room-wise performance" sub={`Which rooms earn most, and which sit empty. Grey bar = ${cl}.`}>
              {v.rooms.length ? (
                <Box sx={{ overflowX: "auto" }}>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Room</TableCell><TableCell align="right">Revenue</TableCell><TableCell align="right">Nights</TableCell><TableCell align="right">Full</TableCell><TableCell align="right">Avg rate</TableCell><TableCell align="right">vs {cl}</TableCell></TableRow></TableHead>
                    <TableBody>
                      {v.rooms.map((r) => {
                        const c = r.prevRev ? r.rev / r.prevRev - 1 : null;
                        return (
                          <TableRow key={r.room} hover>
                            <TableCell sx={{ fontWeight: 700 }}>{r.room}</TableCell>
                            <TableCell align="right">{money(r.rev)}</TableCell>
                            <TableCell align="right">{r.nights}</TableCell>
                            <TableCell align="right" sx={{ color: r.occ < 0.25 ? C.down : undefined, fontWeight: r.occ < 0.25 ? 700 : 400 }}>{(r.occ * 100).toFixed(0)}%</TableCell>
                            <TableCell align="right">{rupee(r.rate)}</TableCell>
                            <TableCell align="right" sx={{ color: c == null ? undefined : c >= 0 ? C.up : C.down, fontWeight: 700 }}>{c == null ? "new" : pct(c, 0)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              ) : <Typography variant="body2" color="text.secondary">No rooms sold in these dates.</Typography>}
              <Typography variant="caption" color="text.secondary">Red "Full" = room was sold on fewer than 1 in 4 days. Check its price, condition or online photos.</Typography>
            </Panel>
            <Stack spacing={2}>
              <Panel title="How guests paid" sub={`Room charge by payment mode · grey = ${cl}`}>
                <BarList compare items={Object.entries(v.mode).sort((a, b) => b[1] - a[1]).map(([k, x]) => ({ name: k === "UnPaid" ? "Unpaid" : k, value: x, prev: v.modePrev[k] || 0, color: k === "UnPaid" ? C.down : col }))} />
              </Panel>
              <Panel title="Type of guests" sub="Number of stays">
                <BarList compare fmt={(x) => x.toLocaleString("en-IN")} items={Object.entries(v.type).sort((a, b) => b[1] - a[1]).map(([k, x]) => ({ name: k, value: x, prev: v.typePrev[k] || 0 }))} />
              </Panel>
            </Stack>
          </Grid2>
        </>
      )}
    </Box>
  );
};

export default GHGraph2;
