// 🎯 Sales goals (naya): har business ka mahine-wise goal (database mein save), roz ka pace,
// mahine ke ant ka andaza, aur pichhle saal ke hisaab se goal ka suggestion.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Card, CardActionArea, CardContent, Chip, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, Cell, LabelList } from "recharts";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { API } from "../insights/shared";
import { BIZ, C, money, rupee, pct, Panel, Grid2, Legend, TipBox, Loading, Insight } from "./bizShared";

const KEYS = ["gh", "rest", "banquet", "bakery", "moti"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const val = (r, k) => (k === "gh" ? r.gh.rev : k === "rest" ? (r.rest.has ? r.rest.sale : 0) : r[k] || 0);
const OLD_KEYS = { gh: "gh_yearly_sales_goal", rest: "rest_yearly_sales_goal", banquet: "banquet_yearly_sales_goal", bakery: "bakery_baada_yearly_sales_goal", moti: "moti_baada_yearly_sales_goal" };
const readOld = (k) => { try { return Number(localStorage.getItem(OLD_KEYS[k])) || 0; } catch { return 0; } };

const status = (p) => (p == null ? { label: "No goal", color: "#64748B", bg: "#F1F5F9" } : p >= 1.02 ? { label: "Ahead", color: "#166534", bg: "#DCFCE7" } : p >= 0.95 ? { label: "On track", color: "#1E40AF", bg: "#DBEAFE" } : { label: "Behind", color: "#991B1B", bg: "#FEE2E2" });

const SalesGoals2 = () => {
  const today = dayjs();
  const [year, setYear] = useState(today.year());
  const [month, setMonth] = useState(today.month()); // 0-11
  const [biz, setBiz] = useState("rest");
  const [goals, setGoals] = useState(null);
  const [daily, setDaily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(null); // draft goals while editing
  const [growth, setGrowth] = useState(10);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let off = false;
    setLoading(true);
    const to = `${year}-12-31`; // poora saal: pichhle saal ke saare mahine bhi aa jate hain (suggestion ke liye)
    Promise.all([axios.get(`${API}/biz/goals`, { params: { year } }), axios.get(`${API}/biz/daily`, { params: { from: `${year}-01-01`, to } })])
      .then(([g, d]) => { if (!off) { setGoals(g.data.data.goals); setDaily(d.data.data); } })
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load goals"))
      .finally(() => !off && setLoading(false));
    return () => { off = true; };
  }, [year]); // eslint-disable-line react-hooks/exhaustive-deps

  const v = useMemo(() => {
    if (!goals || !daily) return null;
    const isCur = year === today.year();
    const mTot = (rows, k) => { const m = Array(12).fill(0); rows.forEach((r) => (m[dayjs(r.date).month()] += val(r, k))); return m; };
    const actual = Object.fromEntries(KEYS.map((k) => [k, mTot(daily.days, k)]));
    const last = Object.fromEntries(KEYS.map((k) => [k, mTot(daily.lastYear, k)]));
    // Aakhri din jiska data aa chuka hai (aaj tak) — usi tak ka pace
    const withData = daily.days.filter((r) => r.date <= daily.today && (r.gh.has || r.rest.has || r.office.has)).map((r) => r.date);
    const lastDate = dayjs(withData.length ? withData[withData.length - 1] : daily.today < daily.to ? daily.today : daily.to);
    // Har business ka is mahine ka hisaab
    const card = (k, mi) => {
      const goal = goals[k]?.[mi] || 0;
      const start = dayjs(`${year}-${String(mi + 1).padStart(2, "0")}-01`), dim = start.daysInMonth();
      const done = isCur && mi === today.month() ? Math.min(dim, lastDate.date()) : mi < (isCur ? today.month() : 12) ? dim : 0;
      const got = actual[k][mi];
      // Pichhle saal ki shape se aaj tak ka goal (weekend / tyohar ka asar aata hai)
      const lyDays = daily.lastYear.filter((r) => dayjs(r.date).month() === mi);
      const lyTot = lyDays.reduce((s, r) => s + val(r, k), 0);
      const lyToDate = lyDays.filter((r) => dayjs(r.date).date() <= done).reduce((s, r) => s + val(r, k), 0);
      const share = lyTot > 0 ? lyToDate / lyTot : done / dim;
      const goalToDate = goal * share;
      const pace = goalToDate > 0 ? got / goalToDate : null;
      const runRate = done ? (got / done) * dim : 0;
      const projected = lyTot > 0 && share > 0 ? got / share : runRate;
      const left = Math.max(0, goal - got), daysLeft = dim - done;
      return { k, goal, got, done, dim, goalToDate, pace, projected, left, daysLeft, perDay: daysLeft ? left / daysLeft : 0, ly: last[k][mi], pctOfGoal: goal ? got / goal : null };
    };
    const cards = KEYS.map((k) => card(k, month));
    const sel = cards.find((c) => c.k === biz);
    // Burn-up: is mahine ka roz ka total
    const start = dayjs(`${year}-${String(month + 1).padStart(2, "0")}-01`), dim = start.daysInMonth();
    const lyMonth = daily.lastYear.filter((r) => dayjs(r.date).month() === month);
    const lyTot = lyMonth.reduce((s, r) => s + val(r, biz), 0);
    let ca = 0, cly = 0;
    const burn = Array.from({ length: dim }, (_, i) => {
      const iso = start.add(i, "day").format("YYYY-MM-DD");
      const r = daily.days.find((x) => x.date === iso);
      const lr = lyMonth.find((x) => dayjs(x.date).date() === i + 1);
      cly += lr ? val(lr, biz) : 0;
      const future = !r || dayjs(iso).isAfter(lastDate, "day");
      if (!future) ca += val(r, biz);
      const goalShare = lyTot > 0 ? cly / lyTot : (i + 1) / dim;
      return { day: i + 1, actual: future ? null : ca, goal: (goals[biz]?.[month] || 0) * goalShare, ly: lr ? cly : null, dayVal: future ? null : val(r, biz), dayGoal: null };
    });
    burn.forEach((b, i) => { b.dayGoal = b.goal - (i ? burn[i - 1].goal : 0); });
    const hitDays = burn.filter((b) => b.dayVal != null && b.dayGoal > 0);
    const hits = hitDays.filter((b) => b.dayVal >= b.dayGoal).length;
    // Saal ka chart
    const yearRows = MON.map((m, i) => ({ m, actual: actual[biz][i], goal: goals[biz]?.[i] || 0, ly: last[biz][i], future: isCur && i > today.month() }));
    const yGoal = (goals[biz] || []).reduce((s, x) => s + x, 0), yGot = actual[biz].reduce((s, x) => s + x, 0);
    const yGoalToDate = (goals[biz] || []).reduce((s, x, i) => s + (i < month ? x : i === month ? (sel?.goalToDate || 0) : 0), 0);
    return { cards, sel, burn, hits, hitDays: hitDays.length, yearRows, yGoal, yGot, yGoalToDate, last, actual, isCur, lastDate };
  }, [goals, daily, month, biz, year]); // eslint-disable-line react-hooks/exhaustive-deps

  const openEditor = () => setEdit(JSON.parse(JSON.stringify(goals)));
  const fillFromLastYear = () => setEdit((e) => ({ ...e, [biz]: v.last[biz].map((x) => Math.round((x * (1 + growth / 100)) / 1000) * 1000) }));
  const fillAllFromLastYear = () => setEdit(Object.fromEntries(KEYS.map((k) => [k, v.last[k].map((x) => Math.round((x * (1 + growth / 100)) / 1000) * 1000)])));
  const save = () => {
    setSaving(true);
    axios.put(`${API}/biz/goals`, { year, goals: edit })
      .then(() => { setGoals(edit); setEdit(null); toast.success("Goals saved"); })
      .catch((e) => toast.error(e?.response?.data?.message || "Could not save goals"))
      .finally(() => setSaving(false));
  };

  const noGoals = goals && KEYS.every((k) => !(goals[k] || []).some((x) => x > 0));
  const oldGoals = KEYS.map((k) => [k, readOld(k)]).filter(([, x]) => x > 0);
  const st = v?.sel ? status(v.sel.goal ? v.sel.pace : null) : null;

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, display: "flex", flexDirection: "column", gap: 2 }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "center" }} spacing={1}>
        <Box>
          <Typography variant="overline" color="text.secondary">Every business · goals saved for everyone</Typography>
          <Typography variant="h5" fontWeight={800}>🎯 Sales goals</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Year" value={year} onChange={(e) => setYear(Number(e.target.value))} sx={{ minWidth: 100 }}>
            {[today.year() - 1, today.year(), today.year() + 1].map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </TextField>
          <Button variant="contained" onClick={openEditor} disabled={!goals}>Set / edit goals</Button>
        </Stack>
      </Stack>
      <ToggleButtonGroup size="small" exclusive value={month} onChange={(e, m) => m != null && setMonth(m)} sx={{ flexWrap: "wrap" }}>
        {MON.map((m, i) => <ToggleButton key={m} value={i} sx={{ textTransform: "none", px: 1.25 }}>{m}</ToggleButton>)}
      </ToggleButtonGroup>
      <Loading loading={loading} />
      {noGoals && !loading && (
        <Alert severity="info" action={<Button color="inherit" size="small" onClick={openEditor}>Set goals</Button>}>
          No goals saved for {year} yet. Click "Set goals" and use "Fill from last year" to start with last year's sale plus a growth %.
          {oldGoals.length ? ` Old yearly goals found on this computer: ${oldGoals.map(([k, x]) => `${BIZ[k].label} ${money(x)}`).join(", ")}.` : ""}
        </Alert>
      )}

      {v && (
        <>
          <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(5, 1fr)" } }}>
            {v.cards.map((c) => {
              const s = status(c.goal ? c.pace : null);
              return (
                <Card key={c.k} variant="outlined" sx={{ borderColor: biz === c.k ? BIZ[c.k].color : "divider", borderWidth: biz === c.k ? 2 : 1 }}>
                  <CardActionArea onClick={() => setBiz(c.k)} sx={{ height: "100%" }}>
                    <CardContent sx={{ py: 1.25, px: 1.5 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="caption" fontWeight={800} sx={{ color: BIZ[c.k].color }}>{BIZ[c.k].label}</Typography>
                        <Chip size="small" label={s.label} sx={{ height: 20, fontSize: 11, fontWeight: 700, color: s.color, bgcolor: s.bg }} />
                      </Stack>
                      <Typography variant="h6" fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>{money(c.got)}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.goal ? `of ${money(c.goal)} goal` : "no goal set"}</Typography>
                      <LinearProgress variant="determinate" value={Math.min(100, (c.pctOfGoal || 0) * 100)} sx={{ mt: 0.75, height: 7, borderRadius: 4, bgcolor: "#F1F5F9", "& .MuiLinearProgress-bar": { bgcolor: BIZ[c.k].color } }} />
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                        {c.goal ? (c.daysLeft ? `${rupee(c.perDay)}/day needed · ${c.daysLeft} days left` : c.got >= c.goal ? "Goal reached ✓" : `Missed by ${money(c.goal - c.got)}`) : c.ly ? `Last year: ${money(c.ly)}` : ""}
                      </Typography>
                    </CardContent>
                  </CardActionArea>
                </Card>
              );
            })}
          </Box>

          {v.sel && (
            <>
              {v.sel.goal > 0 && v.sel.daysLeft > 0 && (
                <Insight tone={v.sel.pace >= 0.95 ? "good" : "bad"}>
                  {BIZ[biz].label}, {MON[month]} {year}: <b>{money(v.sel.got)}</b> so far, goal till today <b>{money(v.sel.goalToDate)}</b> ({pct(v.sel.pace - 1)}). At this pace the month ends near <b>{money(v.sel.projected)}</b>
                  {v.sel.projected >= v.sel.goal ? " — above the goal." : <> — <b>{money(v.sel.goal - v.sel.projected)}</b> short. Needs <b>{rupee(v.sel.perDay)}</b> a day from now.</>}
                </Insight>
              )}
              <Grid2 cols={{ xs: "1fr", md: "3fr 2fr" }}>
                <Panel title={`${BIZ[biz].label} · ${MON[month]} ${year}: running total vs goal`} sub="Goal line follows last year's daily pattern (weekends, festivals), not a flat line." right={st && <Chip label={st.label} sx={{ fontWeight: 800, color: st.color, bgcolor: st.bg }} />}>
                  <Legend items={[{ name: "Actual so far", color: BIZ[biz].color, line: true }, { name: "Goal", color: C.ink, line: true, dash: true }, { name: "Last year", color: C.ly, line: true }]} />
                  <ResponsiveContainer width="100%" height={280}>
                    <ComposedChart data={v.burn} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid vertical={false} stroke={C.grid} />
                      <XAxis dataKey="day" tickLine={false} fontSize={11} interval="preserveStartEnd" minTickGap={6} />
                      <YAxis tickFormatter={(t) => (t >= 1e5 ? `${(t / 1e5).toFixed(1)}L` : t >= 1000 ? `${Math.round(t / 1000)}k` : t)} width={44} fontSize={11} />
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const r = payload[0].payload;
                        return <TipBox title={`${r.day} ${MON[month]}`} rows={[r.actual != null && { name: "Actual so far", value: money(r.actual), color: BIZ[biz].color }, { name: "Goal so far", value: money(r.goal) }, r.ly != null && { name: "Last year so far", value: money(r.ly), color: C.ly }, r.dayVal != null && { name: "This day", value: `${money(r.dayVal)} (target ${money(r.dayGoal)})` }]} />;
                      }} />
                      <Line dataKey="ly" stroke={C.ly} strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line dataKey="goal" stroke={C.ink} strokeDasharray="6 4" strokeWidth={2} dot={false} isAnimationActive={false} />
                      <Line dataKey="actual" stroke={BIZ[biz].color} strokeWidth={3} dot={false} isAnimationActive={false} connectNulls={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                  {v.hitDays > 0 && <Typography variant="caption" color="text.secondary">Daily target met on <b>{v.hits} of {v.hitDays}</b> days this month.</Typography>}
                </Panel>
                <Panel title="This month in numbers">
                  <Table size="small">
                    <TableBody>
                      {[
                        ["Goal for the month", money(v.sel.goal)],
                        ["Done so far", money(v.sel.got)],
                        ["Goal till today", money(v.sel.goalToDate)],
                        ["Expected month-end", money(v.sel.projected)],
                        ["Still needed", money(v.sel.left)],
                        ["Needed per day", v.sel.goal && v.sel.daysLeft ? `${rupee(v.sel.perDay)} × ${v.sel.daysLeft} days` : "—"],
                        ["Same month last year", money(v.sel.ly)],
                        ["Goal vs last year", v.sel.ly && v.sel.goal ? pct(v.sel.goal / v.sel.ly - 1) : "—"],
                      ].map(([a, b]) => <TableRow key={a}><TableCell sx={{ color: "text.secondary" }}>{a}</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>{b}</TableCell></TableRow>)}
                    </TableBody>
                  </Table>
                </Panel>
              </Grid2>

              <Panel title={`${BIZ[biz].label} · ${year} month by month`} sub={`Bars = actual · dark line = goal · grey = last year. Year so far: ${money(v.yGot)}${v.yGoal ? ` of ${money(v.yGoal)} goal (${((v.yGot / v.yGoal) * 100).toFixed(0)}%)` : " (no goal set)"}.`}>
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={v.yearRows} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke={C.grid} />
                    <XAxis dataKey="m" tickLine={false} fontSize={11} />
                    <YAxis tickFormatter={(t) => (t >= 1e5 ? `${(t / 1e5).toFixed(0)}L` : `${Math.round(t / 1000)}k`)} width={40} fontSize={11} />
                    <Tooltip formatter={(val, name) => [money(val), name === "actual" ? "Actual" : name === "goal" ? "Goal" : "Last year"]} />
                    <Bar dataKey="actual" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={36}>
                      {v.yearRows.map((r) => <Cell key={r.m} fill={r.goal && r.actual >= r.goal ? C.up : BIZ[biz].color} fillOpacity={r.future ? 0.25 : 0.85} />)}
                      <LabelList dataKey="actual" content={({ x, y, width, index }) => { const r = v.yearRows[index]; return r.goal && r.actual ? <text x={x + width / 2} y={y - 5} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={r.actual >= r.goal ? C.up : C.muted}>{Math.round((r.actual / r.goal) * 100)}%</text> : null; }} />
                    </Bar>
                    <Line dataKey="goal" stroke={C.ink} strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} isAnimationActive={false} />
                    <Line dataKey="ly" stroke={C.ly} strokeWidth={2} dot={false} isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
                <Typography variant="caption" color="text.secondary">Green bar = month goal reached. % on top = actual ÷ goal.</Typography>
              </Panel>
            </>
          )}
        </>
      )}

      <Dialog open={!!edit} onClose={() => setEdit(null)} maxWidth="lg" fullWidth>
        <DialogTitle>Goals for {year} (₹ per month)</DialogTitle>
        <DialogContent>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5, mt: 0.5 }}>
            <TextField size="small" type="number" label="Growth on last year %" value={growth} onChange={(e) => setGrowth(Number(e.target.value) || 0)} sx={{ width: 180 }} />
            <Button variant="outlined" onClick={fillFromLastYear} disabled={!v}>Fill {BIZ[biz].label} from last year</Button>
            <Button variant="outlined" onClick={fillAllFromLastYear} disabled={!v}>Fill all from last year</Button>
          </Stack>
          {edit && (
            <Box sx={{ overflowX: "auto" }}>
              <Table size="small">
                <TableHead><TableRow><TableCell>Business</TableCell>{MON.map((m) => <TableCell key={m} align="right">{m}</TableCell>)}<TableCell align="right">Year</TableCell></TableRow></TableHead>
                <TableBody>
                  {KEYS.map((k) => (
                    <TableRow key={k}>
                      <TableCell sx={{ fontWeight: 700, color: BIZ[k].color, whiteSpace: "nowrap" }}>{BIZ[k].label}</TableCell>
                      {MON.map((m, i) => (
                        <TableCell key={m} sx={{ p: 0.5 }}>
                          <TextField size="small" type="number" value={edit[k][i] || ""} placeholder={v ? String(Math.round(v.last[k][i] / 1000) * 1000 || "") : ""}
                            onChange={(e) => setEdit((d) => ({ ...d, [k]: d[k].map((x, j) => (j === i ? Math.max(0, Number(e.target.value) || 0) : x)) }))} inputProps={{ style: { textAlign: "right", padding: "6px 6px", width: 72 } }} />
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 800, whiteSpace: "nowrap" }}>{money(edit[k].reduce((s, x) => s + x, 0))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
          <Typography variant="caption" color="text.secondary">Grey numbers in empty boxes = last year's actual for that month. Goals are saved in the app for everyone (not just this computer).</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEdit(null)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={saving}>{saving ? "Saving…" : "Save goals"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SalesGoals2;
