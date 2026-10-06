// Admin Home: "Aaj ka hisaab": app kholte hi 5 second mein poori tasveer
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { Box, Button, ButtonBase, Paper, Skeleton, Stack, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import EditNoteIcon from "@mui/icons-material/EditNote";
import InsightsIcon from "@mui/icons-material/Insights";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import RefreshIcon from "@mui/icons-material/Refresh";
import { BRAND } from "../../theme";
import BackupStatusCard from "../BackupStatusCard";
import DataAlerts from "../insights/DataAlerts";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const F = "DD-MM-YYYY";
const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const NIGHT = ["night", "extraNight"];
const ROOM_PERIODS = ["day", "night", "extraDay", "extraNight"];
const safe = (p) => p.then((r) => r.data).catch(() => null);
const docOrNull = (d) => (d && d.data && !Array.isArray(d.data) && d.data._id ? d.data : null);

const ghTotals = (entries = []) => {
  const rows = entries.filter((e) => e.period !== "UnPaid");
  return {
    total: rows.reduce((s, e) => s + (e.rate || 0), 0),
    unpaid: rows.filter((e) => e.modeOfPayment === "UnPaid").reduce((s, e) => s + (e.rate || 0), 0),
    sold: rows.filter((e) => ROOM_PERIODS.includes(e.period)).length,
    jama: entries.filter((e) => e.period === "UnPaid").reduce((s, e) => s + (e.rate || 0), 0),
  };
};
const officeTotals = (doc) => ({
  in: (doc?.officeIn || []).reduce((s, x) => s + (x.amount || 0), 0),
  out: (doc?.officeOut || []).reduce((s, x) => s + (x.amount || 0), 0),
  rows: (doc?.officeIn?.length || 0) + (doc?.officeOut?.length || 0),
});

const Change = ({ now, before }) => {
  if (!before) return <Typography variant="caption" color="text.secondary">Pichhle hafte isi din: koi entry nahi</Typography>;
  const pct = ((now - before) / before) * 100;
  const up = pct >= 0;
  return (
    <Typography variant="caption" color="text.secondary">
      <Box component="span" sx={{ color: up ? BRAND.good : BRAND.bad, fontWeight: 800, mr: 0.5 }}>
        {up ? "▲" : "▼"} {Math.abs(pct).toFixed(0)}%
      </Box>
      pichhle {dayjs().format("dddd")} se ({inr(before)})
    </Typography>
  );
};

const BizCard = ({ color, title, right, value, change, stats, onClick }) => (
  <ButtonBase onClick={onClick} sx={{ width: "100%", textAlign: "left", borderRadius: 3.5, display: "block" }}>
    <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3.5, borderTop: `4px solid ${color}`, height: "100%", transition: ".15s", "&:hover": { boxShadow: 3 } }}>
      <Stack direction="row" justifyContent="space-between" sx={{ color: "text.secondary", fontSize: 14 }}>
        <span>{title}</span>
        <span>{right}</span>
      </Stack>
      <Typography sx={{ fontSize: { xs: 28, md: 32 }, fontWeight: 800, color, mt: 0.5, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
        {inr(value)}
      </Typography>
      {change}
      <Stack direction="row" spacing={2.5} sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid #F1F5F9" }}>
        {stats.map(([l, v, c]) => (
          <Box key={l}>
            <Typography variant="caption" color="text.secondary" display="block">
              {l}
            </Typography>
            <Typography fontWeight={800} sx={{ color: c || BRAND.ink, fontVariantNumeric: "tabular-nums" }}>
              {v}
            </Typography>
          </Box>
        ))}
      </Stack>
    </Paper>
  </ButtonBase>
);

const TodayHome = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stamp, setStamp] = useState(0);
  const today = dayjs();
  const t = today.format(F);
  const lw = today.subtract(7, "day").format(F);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      safe(axios.get(`${API}/room`)),
      safe(axios.get(`${API}/entry/get-entry/${t}`)),
      safe(axios.get(`${API}/restEntry/get-entry/${t}`)),
      safe(axios.get(`${API}/officeBook/get-entry/${t}`)),
      safe(axios.get(`${API}/quick/day-status/${t}`)),
      safe(axios.get(`${API}/entry/get-entry/${lw}`)),
      safe(axios.get(`${API}/restEntry/get-entry/${lw}`)),
      safe(axios.get(`${API}/officeBook/get-entry/${lw}`)),
      safe(axios.get(`${API}/owner/monthly-summary/${today.month() + 1}/${today.year()}`)),
    ]).then(([rooms, gh, rest, office, status, ghLw, restLw, officeLw, month]) => {
      if (!alive) return;
      setData({
        rooms: [...(rooms?.data || [])].sort((a, b) => a.roomNumber - b.roomNumber),
        gh: gh?.data || [],
        rest: docOrNull(rest),
        office: docOrNull(office),
        status: status?.data || {},
        ghLw: ghLw?.data || [],
        restLw: docOrNull(restLw),
        officeLw: docOrNull(officeLw),
        month: month?.data || null,
      });
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stamp]);

  const v = useMemo(() => {
    if (!data) return null;
    const g = ghTotals(data.gh);
    const gLw = ghTotals(data.ghLw);
    const o = officeTotals(data.office);
    const oLw = officeTotals(data.officeLw);
    const tonight = {};
    data.gh.forEach((e) => {
      if (!ROOM_PERIODS.includes(e.period)) return;
      const cur = tonight[e.roomNo] || { night: false, day: false, unpaid: false, name: "" };
      if (NIGHT.includes(e.period)) {
        cur.night = true;
        cur.name = e.fullname || cur.name;
      } else {
        cur.day = true;
        cur.name = cur.name || e.fullname;
      }
      if (e.modeOfPayment === "UnPaid") cur.unpaid = true;
      tonight[e.roomNo] = cur;
    });
    const occupied = Object.values(tonight).filter((r) => r.night).length;
    const m = data.month;
    const proj = m && m.period.daysCounted ? (m.kpis.totalRevenue / m.period.daysCounted) * m.period.daysInMonth : 0;
    return { g, gLw, o, oLw, tonight, occupied, m, proj };
  }, [data]);

  const go = (seg) => onNavigate?.(seg);

  if (loading && !data)
    return (
      <Box sx={{ p: { xs: 1.5, md: 3 } }}>
        <Skeleton width={260} height={50} />
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {[1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, md: 4 }}>
              <Skeleton variant="rounded" height={170} />
            </Grid>
          ))}
          <Grid size={{ xs: 12, md: 8 }}>
            <Skeleton variant="rounded" height={260} />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Skeleton variant="rounded" height={260} />
          </Grid>
        </Grid>
      </Box>
    );

  const st = data.status || {};
  const checklist = [
    { label: "Guest House", ok: st.gh?.done, sub: st.gh?.done ? `${st.gh.by || "—"} · ${st.gh.at ? dayjs(st.gh.at).format("hh:mm A") : ""}` : "Abhi entry nahi hui" },
    { label: "Restaurant", ok: st.rest?.done, sub: st.rest?.done ? `${st.rest.by || "—"} · ${st.rest.at ? dayjs(st.rest.at).format("hh:mm A") : ""}` : "Abhi entry nahi hui" },
    { label: "Office Book", ok: st.office?.done, sub: st.office?.done ? `${st.office.by || "—"} · ${st.office.at ? dayjs(st.office.at).format("hh:mm A") : ""}` : "Aaj koi entry nahi" },
  ];
  const insights = v.m?.insights || [];
  const toneColor = { good: BRAND.good, bad: BRAND.bad, warn: "#D97706", info: BRAND.muted };
  const restTotal = data.rest?.grandTotal || 0;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1400, mx: "auto" }}>
      {/* Heading */}
      <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-end" }} spacing={1} sx={{ mb: 2.5 }}>
        <Box>
          <Typography color="text.secondary">Aaj ka hisaab</Typography>
          <Typography variant="h4" sx={{ fontSize: { xs: 26, md: 32 } }}>
            {today.format("dddd, D MMMM YYYY")}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {loading ? "Update ho raha hai…" : `Update: ${dayjs().format("hh:mm A")}`}
          </Typography>
          <Button size="small" variant="outlined" startIcon={<RefreshIcon />} onClick={() => setStamp((s) => s + 1)}>
            Refresh
          </Button>
        </Stack>
      </Stack>

      <Grid container spacing={2}>
        {/* Business cards */}
        <Grid size={{ xs: 12, md: 4 }}>
          <BizCard
            color={BRAND.gh}
            title="Guest House · aaj"
            right={`${v.occupied} / ${data.rooms.length} rooms`}
            value={v.g.total}
            change={<Change now={v.g.total} before={v.gLw.total} />}
            onClick={() => go("gh-dashboard")}
            stats={[
              ["Bhare (raat)", v.occupied],
              ["Khaali", Math.max(data.rooms.length - v.occupied, 0)],
              ["Avg rate", v.g.sold ? inr(v.g.total / v.g.sold) : "—"],
              ["Baaki", inr(v.g.unpaid), v.g.unpaid ? BRAND.bad : undefined],
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <BizCard
            color={BRAND.rest}
            title="Restaurant · aaj"
            right={data.rest ? "closing ho gaya" : "abhi tak nahi"}
            value={restTotal}
            change={<Change now={restTotal} before={data.restLw?.grandTotal || 0} />}
            onClick={() => go("rest-all-reports")}
            stats={[
              ["Cash", inr(data.rest?.totalCash)],
              ["Card", inr(data.rest?.totalCard)],
              ["PP", inr(data.rest?.totalPP)],
              ["Kharch", inr(data.rest?.totalExpenses)],
            ]}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <BizCard
            color={BRAND.office}
            title="Office / Banquet · aaj"
            right={`${v.o.rows} entries`}
            value={v.o.in}
            change={<Change now={v.o.in} before={v.oLw.in} />}
            onClick={() => go("office-all")}
            stats={[
              ["In", inr(v.o.in)],
              ["Out", inr(v.o.out)],
              ["Is mahine", v.m ? inr(v.m.kpis.officeIn) : "—"],
            ]}
          />
        </Grid>

        {/* Rooms tonight */}
        <Grid size={{ xs: 12, lg: 8 }}>
          <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3.5, height: "100%" }}>
            <Typography fontWeight={800} fontSize={17}>
              Rooms abhi
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Aaj raat ki sthiti
            </Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(4, 1fr)", sm: "repeat(8, 1fr)" }, gap: 1, mt: 1.5 }}>
              {data.rooms.map((r) => {
                const s = v.tonight[r.roomNumber];
                const state = s?.night ? "occ" : s?.day ? "day" : "empty";
                const style = {
                  occ: { bgcolor: BRAND.gh, color: "#fff" },
                  day: { bgcolor: "#99F6E4", color: "#134E4A" },
                  empty: { bgcolor: "#fff", color: BRAND.muted, border: "1.5px dashed #CBD5E1" },
                }[state];
                return (
                  <Tooltip key={r.roomNumber} arrow title={s ? `${s.name || "Guest"}${s.unpaid ? " · payment baaki" : ""}` : "Khaali"}>
                    <Box sx={{ ...style, borderRadius: 2.25, p: 1, minHeight: 72, boxShadow: s?.unpaid ? `inset 0 0 0 3px ${BRAND.bad}` : "none" }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography fontWeight={800} fontSize={15} color="inherit">
                          {r.roomNumber}
                        </Typography>
                        {s?.unpaid && <Box sx={{ bgcolor: BRAND.bad, color: "#fff", fontSize: 9, fontWeight: 800, px: 0.6, borderRadius: 1 }}>Baaki</Box>}
                      </Stack>
                      <Typography fontSize={10} sx={{ opacity: 0.8 }} color="inherit">
                        {r.roomType}
                      </Typography>
                      <Typography fontSize={11} noWrap sx={{ mt: 0.5 }} color="inherit">
                        {state === "empty" ? "Khaali" : state === "day" ? "Day use" : s.name || "Bhara"}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })}
            </Box>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 1.5, fontSize: 12, color: "text.secondary" }}>
              {[
                ["Bhara (raat)", { bgcolor: BRAND.gh }],
                ["Sirf day use", { bgcolor: "#99F6E4" }],
                ["Khaali", { bgcolor: "#fff", border: "1.5px dashed #CBD5E1" }],
                ["Payment baaki", { bgcolor: BRAND.gh, boxShadow: `inset 0 0 0 2px ${BRAND.bad}` }],
              ].map(([l, sx]) => (
                <Stack key={l} direction="row" spacing={0.75} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: 0.75, ...sx }} />
                  <span>{l}</span>
                </Stack>
              ))}
            </Stack>
          </Paper>
        </Grid>

        {/* Entry checklist */}
        <Grid size={{ xs: 12, sm: 6, lg: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3.5, height: "100%" }}>
            <Typography fontWeight={800} fontSize={17}>
              Aaj ki entry hui?
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Staff ne bhari ya bhool gaya
            </Typography>
            <Stack sx={{ mt: 1 }}>
              {checklist.map((c, i) => (
                <Stack key={c.label} direction="row" spacing={1.5} alignItems="center" sx={{ py: 1.25, borderTop: i ? "1px solid #F1F5F9" : "none" }}>
                  {c.ok ? <CheckCircleIcon sx={{ color: BRAND.good }} /> : <ErrorOutlineIcon sx={{ color: "#D97706" }} />}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700}>{c.label}</Typography>
                    <Typography variant="caption" color="text.secondary" noWrap component="div">
                      {c.sub}
                    </Typography>
                  </Box>
                  {!c.ok && <Box sx={{ fontSize: 12, fontWeight: 800, px: 1.25, py: 0.4, borderRadius: 5, bgcolor: "#FEF3C7", color: "#92400E" }}>Pending</Box>}
                </Stack>
              ))}
            </Stack>
            <BackupStatusCard />
          </Paper>
        </Grid>

        {/* Month so far */}
        <Grid size={{ xs: 12, sm: 6, lg: 5 }}>
          <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3.5, height: "100%" }}>
            <Typography fontWeight={800} fontSize={17}>
              {today.format("MMMM")} ab tak
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {v.m ? `${v.m.period.daysCounted} din guzre, ${v.m.period.daysInMonth - v.m.period.daysCounted} baaki` : "Monthly data nahi mila"}
            </Typography>
            {v.m && (
              <>
                <Typography sx={{ fontSize: 30, fontWeight: 800, mt: 1, letterSpacing: "-0.02em" }}>{inr(v.m.kpis.totalRevenue)}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  Isi raftaar se mahina khatam hone tak <b style={{ color: BRAND.ink }}>{inr(v.proj)}</b>
                  {v.m.prevKpis.totalRevenue ? (
                    <>
                      {" "}
                      · pichhla mahina {inr(v.m.prevKpis.totalRevenue)}{" "}
                      <b style={{ color: v.proj >= v.m.prevKpis.totalRevenue ? BRAND.good : BRAND.bad }}>
                        ({v.proj >= v.m.prevKpis.totalRevenue ? "▲" : "▼"} {Math.abs(((v.proj - v.m.prevKpis.totalRevenue) / v.m.prevKpis.totalRevenue) * 100).toFixed(0)}%)
                      </b>
                    </>
                  ) : null}
                </Typography>
                {[
                  ["Guest House", v.m.kpis.ghRevenue, BRAND.gh],
                  ["Restaurant", v.m.kpis.restSales, BRAND.rest],
                  ["Office / Banquet", v.m.kpis.officeIn, BRAND.office],
                ].map(([l, val, c]) => (
                  <Box key={l} sx={{ mb: 1.25 }}>
                    <Stack direction="row" justifyContent="space-between" sx={{ fontSize: 14, mb: 0.5 }}>
                      <b>{l}</b>
                      <span style={{ color: BRAND.muted }}>{inr(val)}</span>
                    </Stack>
                    <Box sx={{ height: 8, bgcolor: "#EEF2F6", borderRadius: 4 }}>
                      <Box sx={{ height: "100%", borderRadius: 4, bgcolor: c, width: `${v.m.kpis.totalRevenue ? (val / v.m.kpis.totalRevenue) * 100 : 0}%` }} />
                    </Box>
                  </Box>
                ))}
              </>
            )}
          </Paper>
        </Grid>

        {/* Alerts */}
        <Grid size={{ xs: 12, md: 7, lg: 4 }}>
          <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3.5, height: "100%" }}>
            <Typography fontWeight={800} fontSize={17}>
              Dhyan dene layak
            </Typography>
            <Typography variant="caption" color="text.secondary">
              App ne khud dhoondha
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              <DataAlerts compact onNavigate={go} />
              {v.m?.unpaid?.total > 0 && (
                <ButtonBase onClick={() => go("guest-dues")} sx={{ textAlign: "left", borderRadius: 2.5, bgcolor: "#FEF2F2", color: "#7F1D1D", p: 1.5, display: "flex", gap: 1 }}>
                  <Box sx={{ flex: 1 }}>
                    <b>{inr(v.m.unpaid.total)} guest dues baaki</b>
                    <Typography variant="caption" display="block">
                      {inr((v.m.unpaid.aging["31-90 days"] || 0) + (v.m.unpaid.aging["90+ days"] || 0))} 30 din se purane
                    </Typography>
                  </Box>
                  <b style={{ whiteSpace: "nowrap" }}>Remind →</b>
                </ButtonBase>
              )}
              {insights.slice(0, 4).map((ins, i) => (
                <Stack key={i} direction="row" spacing={1} sx={{ p: 1.25, borderRadius: 2.5, bgcolor: "#F8FAFC" }}>
                  <Box sx={{ mt: "7px", width: 8, height: 8, borderRadius: "50%", flexShrink: 0, bgcolor: toneColor[ins.tone] }} />
                  <Typography variant="body2">{ins.text}</Typography>
                </Stack>
              ))}
              {!insights.length && !(v.m?.unpaid?.total > 0) && (
                <Typography variant="body2" color="text.secondary">
                  Sab theek lag raha hai 👍
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Quick actions */}
        <Grid size={{ xs: 12, md: 5, lg: 3 }}>
          <Paper variant="outlined" sx={{ p: 2.25, borderRadius: 3.5, height: "100%" }}>
            <Typography fontWeight={800} fontSize={17} sx={{ mb: 1.5 }}>
              Jaldi kaam
            </Typography>
            <Stack spacing={1}>
              {[
                ["Entry karo", <EditNoteIcon key="e" />, BRAND.gh, () => navigate("/entry")],
                ["Mahine ki report", <InsightsIcon key="r" />, BRAND.ink, () => go("owner-report")],
                ["Dues reminder", <WhatsAppIcon key="w" />, "#1DA851", () => go("guest-dues")],
                ["Excel import", <UploadFileIcon key="u" />, BRAND.office, () => go("data-import")],
              ].map(([l, icon, c, fn]) => (
                <ButtonBase key={l} onClick={fn} sx={{ justifyContent: "flex-start", gap: 1.5, p: 1.25, borderRadius: 2.5, border: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "#F8FAFC" } }}>
                  <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: c, color: "#fff", display: "grid", placeItems: "center" }}>{icon}</Box>
                  <Typography fontWeight={700}>{l}</Typography>
                </ButtonBase>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default TodayHome;
