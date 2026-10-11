// 🔮 Forecast: aage ke 1 / 3 / 6 / 12 mahine ka andaza + saal ke important dates + pichhle saal se tulna.
// Server roz ke asli data se khud hisaab lagata hai (sirf padhta hai).
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Card, CardContent, Chip, LinearProgress, Stack, Tab, Tabs, ToggleButton, ToggleButtonGroup, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { ResponsiveContainer, ComposedChart, BarChart, LineChart, Bar, Line, Area, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Cell, ErrorBar, ReferenceLine } from "recharts";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import { API, COLORS, Section, inr, kTick, lakh } from "./shared";

const HZ = [
  { key: "1M", months: 1, label: "1 month" },
  { key: "3M", months: 3, label: "3 months" },
  { key: "6M", months: 6, label: "6 months" },
  { key: "1Y", months: 12, label: "1 year" },
];
const LY = "#94A3B8";
const pct = (v) => (v == null || !isFinite(v) ? "—" : `${v > 0 ? "+" : ""}${v.toFixed(1)}%`);
const chg = (a, b) => (b ? ((a - b) / b) * 100 : null);
const nice = (s) => (s ? dayjs(s).format("D MMM YYYY") : "—");
const short = (s) => dayjs(s).format("D MMM");
const KIND_COLOR = { Festival: "#B45309", Holiday: "#4338CA", Event: "#DB2777", Wedding: "#0F766E", Season: "#64748B", Banquet: "#9333EA" };

const Kpi = ({ label, value, sub, delta, color }) => (
  <Card variant="outlined" sx={{ flex: "1 1 200px", minWidth: 0, borderTop: `3px solid ${color || COLORS.in}` }}>
    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" fontWeight={800} sx={{ lineHeight: 1.25 }}>
        {value}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        {delta != null && isFinite(delta) && <Chip size="small" label={(delta >= 0 ? "▲ " : "▼ ") + pct(delta)} sx={{ fontWeight: 700, bgcolor: delta >= 0 ? "#DCFCE7" : "#FEE2E2", color: delta >= 0 ? "#166534" : "#991B1B" }} />}
        {sub && (
          <Typography variant="caption" color="text.secondary">
            {sub}
          </Typography>
        )}
      </Stack>
    </CardContent>
  </Card>
);

const Effect = ({ label, x }) => {
  if (x == null) return null;
  const up = x >= 1.1, down = x <= 0.9;
  return <Chip size="small" variant="outlined" label={`${label} ${x.toFixed(2)}×`} sx={{ fontWeight: 600, color: up ? "#166534" : down ? "#991B1B" : "text.primary", borderColor: up ? "#86EFAC" : down ? "#FCA5A5" : "divider", bgcolor: up ? "#F0FDF4" : down ? "#FEF2F2" : "transparent" }} />;
};

const DateCard = ({ d }) => (
  <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "150px 1fr auto" }, gap: 1, alignItems: "start", p: 1.5, border: "1px solid", borderColor: "divider", borderLeft: `4px solid ${KIND_COLOR[d.kind] || "#64748B"}`, borderRadius: 2, bgcolor: "background.paper" }}>
    <Box>
      <Typography variant="body2" fontWeight={700}>
        {d.start === d.end ? nice(d.start) : `${short(d.start)} – ${nice(d.end)}`}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {d.kind}
      </Typography>
    </Box>
    <Box>
      <Typography fontWeight={700}>{d.event}</Typography>
      <Typography variant="body2">{d.action}</Typography>
      <Typography variant="caption" color="text.secondary">
        {d.basedOn ? `Effect measured on ${d.basedOn} past year${d.basedOn > 1 ? "s" : ""}` : d.kind === "Wedding" ? "Muhurat dates from panchang lists; confirm locally" : ""}
      </Typography>
    </Box>
    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap justifyContent={{ sm: "flex-end" }}>
      <Effect label="Rooms" x={d.roomsX} />
      <Effect label="Restaurant" x={d.restX} />
      {d.kind === "Wedding" && <Chip size="small" label="Banquet peak" sx={{ bgcolor: "#CCFBF1", color: "#115E59", fontWeight: 700 }} />}
      {d.kind === "Banquet" && <Chip size="small" label="🎉 Booked" sx={{ bgcolor: "#F3E8FF", color: "#6B21A8", fontWeight: 700 }} />}
    </Stack>
  </Box>
);

// 🗓️ Season strip (futuristic): aage ke dinon ka "radar" — rooms aur restaurant alag track, tyohar icon ke saath
const EV_ICON = { Navratri: "💃", Dussehra: "🏹", "Diwali week": "🪔", "After Diwali": "🧳", "Christmas–New Year": "🎄", Uttarayan: "🪁", "Republic Day": "🇮🇳", "Independence Day": "🇮🇳", "Valentine's Day": "💖", "Maha Shivratri": "🔱", "Holi / Dhuleti": "🎨", "Ram Navami": "🚩", "Akshaya Tritiya": "💍", "Raksha Bandhan": "🎀", Janmashtami: "🦚", "Ganesh Chaturthi": "🐘", "Pitru Paksha (Shraddh)": "🕯️" };
const NEON = { rooms: "#0891B2", rest: "#D97706", wed: "#059669", ev: "#7C3AED", up: "#16A34A", down: "#DC2626", bq: "#9333EA" };
// text width (ek hi canvas, baar baar nahi banta)
const _cv = typeof document !== "undefined" ? document.createElement("canvas").getContext("2d") : null;
const textWidth = (t, font = "700 11.5px Roboto, Arial, sans-serif") => { if (!_cv) return t.length * 7; _cv.font = font; return _cv.measureText(t).width; };
const smoothPath = (pts) => {
  if (pts.length < 2) return "";
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
};
const Insight = ({ icon, title, value, sub, color }) => (
  <Box sx={{ flex: "1 1 180px", minWidth: 0, p: 1.25, borderRadius: 2, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 1px 2px rgba(15,23,42,0.04)", borderTop: `3px solid ${color}` }}>
    <Typography sx={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "#64748B" }}>
      {icon} {title}
    </Typography>
    <Typography sx={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1.3 }}>{value}</Typography>
    <Typography sx={{ fontSize: 12, color: "#475569" }}>{sub}</Typography>
  </Box>
);
const SeasonStrip = ({ daily, keyDates, nRooms, banquetMonths = [] }) => {
  const ref = useRef(null);
  const [W, setW] = useState(900);
  const [hover, setHover] = useState(null);
  const [hl, setHl] = useState(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const ro = new ResizeObserver(([e]) => setW(Math.max(320, Math.floor(e.contentRect.width))));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  const n = daily.length;
  // 7 din ka average: simple aur saaf trend
  const avg = (k, i, half = 3) => {
    const w = daily.slice(Math.max(0, i - half), i + half + 1);
    return w.reduce((t, x) => t + x[k], 0) / (w.length || 1);
  };
  const sm = useMemo(() => daily.map((d, i) => ({ rooms: n > 45 ? avg("rooms", i) : d.rooms, rest: n > 45 ? avg("rest", i) : d.rest })), [daily]); // eslint-disable-line react-hooks/exhaustive-deps
  // seedhi baatein: sabse bhara / sabse halka hafta
  const weekly = useMemo(() => {
    const out = [];
    for (let i = 0; i + 7 <= n; i++) {
      const w = daily.slice(i, i + 7);
      out.push({ i, rooms: w.reduce((t, x) => t + x.rooms, 0) / 7, rest: w.reduce((t, x) => t + x.rest, 0) / 7 });
    }
    return out;
  }, [daily, n]);
  if (!n) return null;
  const pick = (f) => weekly.reduce((a, w) => (f(w, a) ? w : a), weekly[0]);
  const bestRooms = pick((w, a) => w.rooms > a.rooms), bestRest = pick((w, a) => w.rest > a.rest), quiet = pick((w, a) => w.rooms < a.rooms);
  const wk = (w) => (w ? `${dayjs(daily[w.i].date).format("D MMM")} – ${dayjs(daily[Math.min(n - 1, w.i + 6)].date).format("D MMM")}` : "—");

  const L = 16, R = 16, BY = 12, T1 = 58, TH = 64, GAP = 26, T2 = T1 + TH + GAP, AX = T2 + TH + 6, WY = AX + 22, H = WY + 26;
  const x = (i) => L + ((i + 0.5) / n) * (W - L - R);
  const dx = (W - L - R) / n;
  const maxRest = Math.max(...sm.map((d) => d.rest), 1) * 1.08;
  const yR = (v) => T1 + TH - (v / nRooms) * TH;
  const yS = (v) => T2 + TH - (v / maxRest) * TH;
  const roomsPts = sm.map((d, i) => [x(i), yR(d.rooms)]);
  const restPts = sm.map((d, i) => [x(i), yS(d.rest)]);
  const roomsLine = smoothPath(roomsPts), restLine = smoothPath(restPts);
  // 📏 "Usual" line (is period ka average) + pichhle saal ki halki line — upar/niche turant dikhe
  const meanRooms = sm.reduce((t, d) => t + d.rooms, 0) / n, meanRest = sm.reduce((t, d) => t + d.rest, 0) / n;
  const hasLy = daily.some((d) => d.lyRooms != null || d.lyRest != null);
  const lyAvg = (k, i) => {
    const w = daily.slice(Math.max(0, i - 3), i + 4).filter((x) => x[k] != null);
    return w.length ? w.reduce((t, x) => t + x[k], 0) / w.length : null;
  };
  const lyPath = (k, y) => {
    const pts = daily.map((d, i) => [i, n > 45 ? lyAvg(k, i) : d[k]]).filter(([, v]) => v != null).map(([i, v]) => [x(i), y(v)]);
    return pts.length > 1 ? smoothPath(pts) : null;
  };
  const lyRoomsLine = hasLy ? lyPath("lyRooms", (v) => yR(Math.min(v, nRooms))) : null;
  const lyRestLine = hasLy ? lyPath("lyRest", (v) => yS(Math.min(v, maxRest))) : null;
  const area = (line, pts, base) => `${line} L${pts[pts.length - 1][0].toFixed(1)},${base} L${pts[0][0].toFixed(1)},${base} Z`;

  const idx = Object.fromEntries(daily.map((d, i) => [d.date, i]));
  const bands = [];
  daily.forEach((d, i) => {
    if (!d.event) return;
    const last = bands[bands.length - 1];
    if (last && last.ev === d.event && last.b === i - 1) last.b = i;
    else bands.push({ ev: d.event, a: i, b: i });
  });
  // 🔢 Har tyohar ka number badge (ek line mein, kabhi takrata nahi). Naam tabhi likha jab poori jagah ho; baaki niche list mein.
  const measure = (t) => textWidth(t);
  const GAP_B = 21;
  let lastX = -1e9;
  const badges = bands.map((b, k) => {
    const want = Math.min(Math.max(x(b.a), L + 9), W - R - 9);
    const bx = Math.max(want, lastX + GAP_B);
    lastX = bx;
    return { ...b, no: k + 1, bx, text: `${EV_ICON[b.ev] || "✨"} ${b.ev}` };
  });
  // right edge se bahar na jaaye: peeche se khiskao
  for (let k = badges.length - 1; k >= 0; k--) {
    const lim = k === badges.length - 1 ? W - R - 9 : badges[k + 1].bx - GAP_B;
    if (badges[k].bx > lim) badges[k].bx = lim;
  }
  badges.forEach((bd, k) => {
    const next = badges[k + 1] ? badges[k + 1].bx - 12 : W - R;
    const room = next - (bd.bx + 13);
    bd.showName = measure(bd.text) + 6 <= room;
  });
  const fmtRange = (b) => {
    const a = dayjs(daily[b.a].date), z = dayjs(daily[b.b].date);
    return b.a === b.b ? a.format("D MMM") : a.month() === z.month() ? `${a.format("D")}–${z.format("D MMM")}` : `${a.format("D MMM")} – ${z.format("D MMM")}`;
  };
  const weddings = keyDates.filter((k) => k.kind === "Wedding").map((k) => {
    const a = idx[k.start] ?? (k.start < daily[0].date ? 0 : null);
    const b = idx[k.end] ?? (k.end > daily[n - 1].date ? n - 1 : null);
    return a == null || b == null ? null : { a, b, label: k.event };
  }).filter(Boolean);
  const months = daily.map((d, i) => ({ d, i })).filter(({ d, i }) => d.date.endsWith("-01") && x(i) - x(0) > 48);
  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const i = Math.min(n - 1, Math.max(0, Math.round(((e.clientX - r.left) * (W / r.width) - L) / dx - 0.5)));
    setHover({ i, px: e.clientX - r.left });
  };
  const hd = hover ? daily[hover.i] : null;
  const level = (v) => (v >= nRooms * 0.6 ? "Busy" : v >= nRooms * 0.35 ? "Normal" : "Quiet");
  const pk = bestRooms ? bestRooms.i + 3 : 0;
  return (
    <Box sx={{ mt: 2, borderRadius: 3, p: { xs: 1.5, sm: 2 }, color: "#0F172A", background: "radial-gradient(120% 120% at 0% 0%, #E0F2FE 0%, #F8FAFC 45%, #FFFFFF 100%)", border: "1px solid #E2E8F0", boxShadow: "0 8px 30px rgba(15,23,42,0.06)" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.25 }} flexWrap="wrap" useFlexGap spacing={1}>
        <Typography sx={{ fontWeight: 800, letterSpacing: 0.5, fontSize: 15 }}>
          <Box component="span" sx={{ color: NEON.rooms, textShadow: `0 0 10px ${NEON.rooms}` }}>●</Box> Season radar
        </Typography>
        <Typography sx={{ fontSize: 12, color: "#64748B" }}>Move your finger / mouse across to see any day</Typography>
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        <Insight icon="🏨" title="Rooms busiest" value={wk(bestRooms)} sub={`${bestRooms?.rooms.toFixed(1)} rooms a day of ${nRooms}`} color={NEON.rooms} />
        <Insight icon="🍽️" title="Restaurant busiest" value={wk(bestRest)} sub={`${inr(bestRest?.rest)} a day`} color={NEON.rest} />
        {banquetMonths.length > 0 && (() => {
          const best = banquetMonths.reduce((a, b) => (b.expected * b.share > a.expected * a.share ? b : a), banquetMonths[0]);
          return <Insight icon="🎉" title="Banquet best month" value={dayjs(best.month + "-01").format("MMMM YYYY")} sub={`~${lakh(best.expected)} expected · ${best.muhurat} wedding dates${best.booked ? ` · ${best.booked} booked` : ""}`} color="#C084FC" />;
        })()}
        <Insight icon="🌙" title="Quietest week" value={wk(quiet)} sub={`${quiet?.rooms.toFixed(1)} rooms a day · good for offers & staff leave`} color={NEON.down} />
      </Stack>
      <Box ref={ref} sx={{ position: "relative" }} onMouseLeave={() => setHover(null)}>
        <svg width="100%" viewBox={`0 0 ${W} ${H}`} height={H} style={{ display: "block", overflow: "visible", touchAction: "pan-y" }} onMouseMove={onMove} onTouchMove={(e) => onMove(e.touches[0])}>
          <defs>
            <linearGradient id="fgRooms" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={NEON.rooms} stopOpacity="0.28" />
              <stop offset="1" stopColor={NEON.rooms} stopOpacity="0" />
            </linearGradient>
            <linearGradient id="fgRest" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={NEON.rest} stopOpacity="0.26" />
              <stop offset="1" stopColor={NEON.rest} stopOpacity="0" />
            </linearGradient>
            <filter id="fgGlow" x="-20%" y="-50%" width="140%" height="200%">
              <feGaussianBlur stdDeviation="1.6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {/* tyohar: number badge + (jagah ho to) naam */}
          {badges.map((bd) => (
            <g key={`bd${bd.a}`}>
              <path d={`M${bd.bx},${BY + 9} L${x(bd.a)},${T1 - 2}`} stroke="rgba(124,58,237,0.4)" strokeDasharray="2 2" fill="none" />
              <circle cx={bd.bx} cy={BY} r={hl === bd.a ? 11 : 9} fill={hl === bd.a ? "#5B21B6" : NEON.ev} stroke="#EDE9FE" strokeWidth={1.5} />
              <text x={bd.bx} y={BY + 3.8} fontSize={10} fontWeight={800} fill="#fff" textAnchor="middle">{bd.no}</text>
              {bd.showName && <text x={bd.bx + 13} y={BY + 4} fontSize={11.5} fontWeight={700} fill="#4C1D95">{bd.text}</text>}
            </g>
          ))}
          {/* tyohar ke din: dono track pe halki roshni */}
          {bands.map((b) => (
            <rect key={`b${b.a}`} x={x(b.a) - dx / 2} y={T1} width={Math.max(3, (b.b - b.a + 1) * dx)} height={T2 + TH - T1} fill={hl === b.a ? "rgba(124,58,237,0.22)" : "rgba(124,58,237,0.07)"} />
          ))}
          {/* mahine ki lines */}
          {months.map(({ d, i }) => (
            <g key={d.date}>
              <line x1={x(i) - dx / 2} x2={x(i) - dx / 2} y1={T1} y2={AX} stroke="#E2E8F0" />
              <text x={x(i) - dx / 2 + 4} y={AX + 14} fontSize={11} fill="#64748B">{dayjs(d.date).format(d.date.slice(5, 7) === "01" ? "MMM YY" : "MMM")}</text>
            </g>
          ))}
          {/* TRACK 1: Rooms */}
          <text x={L} y={T1 - 7} fontSize={10.5} fontWeight={800} fill={NEON.rooms} letterSpacing="1">🏨 ROOMS A DAY</text>
          <line x1={L} x2={W - R} y1={T1 + TH} y2={T1 + TH} stroke="#CBD5E1" />
          <line x1={L} x2={W - R} y1={yR(nRooms)} y2={yR(nRooms)} stroke="rgba(8,145,178,0.35)" strokeDasharray="3 4" />
          <text x={W - R} y={yR(nRooms) - 3} fontSize={10} textAnchor="end" fill={NEON.rooms}>all {nRooms} full</text>
          <path d={area(roomsLine, roomsPts, T1 + TH)} fill="url(#fgRooms)" />
          {lyRoomsLine && <path d={lyRoomsLine} fill="none" stroke="#94A3B8" strokeWidth={1.3} strokeDasharray="4 3" />}
          <line x1={L} x2={W - R} y1={yR(meanRooms)} y2={yR(meanRooms)} stroke={NEON.rooms} strokeOpacity={0.45} strokeDasharray="1 3" />
          <text x={L + 2} y={yR(meanRooms) - 3} fontSize={9.5} fill="#0E7490">usual {meanRooms.toFixed(1)}</text>
          <path d={roomsLine} fill="none" stroke={NEON.rooms} strokeWidth={2.2} filter="url(#fgGlow)" strokeLinecap="round" />
          {bestRooms && (
            <g>
              <circle cx={x(pk)} cy={yR(sm[pk].rooms)} r={4.5} fill="#fff" stroke={NEON.rooms} strokeWidth={2} filter="url(#fgGlow)" />
              <text x={Math.min(x(pk) + 8, W - 60)} y={yR(sm[pk].rooms) - 6} fontSize={11} fontWeight={800} fill="#0F172A">Peak</text>
            </g>
          )}
          {/* TRACK 2: Restaurant */}
          <text x={L} y={T2 - 7} fontSize={10.5} fontWeight={800} fill={NEON.rest} letterSpacing="1">🍽️ RESTAURANT SALE A DAY</text>
          <line x1={L} x2={W - R} y1={T2 + TH} y2={T2 + TH} stroke="#CBD5E1" />
          <path d={area(restLine, restPts, T2 + TH)} fill="url(#fgRest)" />
          {lyRestLine && <path d={lyRestLine} fill="none" stroke="#94A3B8" strokeWidth={1.3} strokeDasharray="4 3" />}
          <line x1={L} x2={W - R} y1={yS(meanRest)} y2={yS(meanRest)} stroke={NEON.rest} strokeOpacity={0.5} strokeDasharray="1 3" />
          <text x={L + 2} y={yS(meanRest) - 3} fontSize={9.5} fill="#B45309">usual {kTick(meanRest)}</text>
          <path d={restLine} fill="none" stroke={NEON.rest} strokeWidth={2.2} filter="url(#fgGlow)" strokeLinecap="round" />
          <text x={W - R} y={T2 + 10} fontSize={10} textAnchor="end" fill="#B45309">up to {kTick(maxRest)}</text>
          {/* aaj */}
          <line x1={x(0)} x2={x(0)} y1={T1} y2={T2 + TH} stroke="#0F172A" strokeOpacity={0.7} strokeWidth={1.5} />
          <text x={x(0)} y={AX + 14} fontSize={10.5} fontWeight={800} fill="#0F172A">TODAY</text>
          {/* shaadi */}
          <text x={L} y={WY + 13} fontSize={10.5} fontWeight={800} fill={NEON.wed}>💍</text>
          {weddings.map((w) => (
            <g key={`w${w.a}`}>
              <rect x={x(w.a) - dx / 2} y={WY} width={Math.max(4, (w.b - w.a + 1) * dx)} height={18} rx={9} fill="rgba(5,150,105,0.12)" stroke="rgba(5,150,105,0.55)" />
              {(w.b - w.a + 1) * dx > 120 && (
                <text x={x(w.a) + 6} y={WY + 13} fontSize={10.5} fontWeight={700} fill="#065F46">Weddings · {w.label.replace(/^Wedding season \(|\)$/g, "")}</text>
              )}
            </g>
          ))}
          {/* pakki banquet bookings */}
          {keyDates.filter((k) => k.kind === "Banquet" && idx[k.start] != null).map((k) => (
            <g key={`bk${k.start}${k.event}`}>
              <circle cx={x(idx[k.start])} cy={WY + 9} r={7} fill="#7E22CE" stroke="#E9D5FF" strokeWidth={1.5} filter="url(#fgGlow)" />
              <text x={x(idx[k.start])} y={WY + 12.5} fontSize={9} textAnchor="middle">🎉</text>
            </g>
          ))}
          {/* hover */}
          {hd && (
            <g>
              <line x1={x(hover.i)} x2={x(hover.i)} y1={T1} y2={T2 + TH} stroke="#0F172A" strokeOpacity={0.25} />
              <circle cx={x(hover.i)} cy={yR(sm[hover.i].rooms)} r={4} fill={NEON.rooms} stroke="#fff" strokeWidth={1.5} />
              <circle cx={x(hover.i)} cy={yS(sm[hover.i].rest)} r={4} fill={NEON.rest} stroke="#fff" strokeWidth={1.5} />
            </g>
          )}
        </svg>
        {hd && (
          <Box sx={{ position: "absolute", top: T1, left: Math.min(Math.max(0, hover.px + 12), (ref.current?.clientWidth || W) - 200), width: 190, pointerEvents: "none", p: 1.25, borderRadius: 2, bgcolor: "#FFFFFF", border: "1px solid #E2E8F0", boxShadow: "0 10px 30px rgba(15,23,42,0.15)" }}>
            <Typography sx={{ fontSize: 12, color: "#64748B" }}>{dayjs(hd.date).format("ddd, D MMM YYYY")}</Typography>
            {hd.event && <Typography sx={{ fontSize: 13, fontWeight: 800, color: "#5B21B6" }}>{EV_ICON[hd.event] || "✨"} {hd.event}</Typography>}
            <Typography sx={{ fontSize: 13, mt: 0.5 }}>
              <Box component="span" sx={{ color: NEON.rooms }}>🏨 {hd.rooms.toFixed(1)}</Box> rooms · <b>{level(hd.rooms)}</b>
            </Typography>
            <Typography sx={{ fontSize: 13 }}>
              <Box component="span" sx={{ color: NEON.rest }}>🍽️ {inr(hd.rest)}</Box> restaurant
            </Typography>
            <Typography sx={{ fontSize: 13 }}>💰 {inr(hd.gh)} GH revenue</Typography>
            {(hd.lyRooms != null || hd.lyRest != null) && (
              <Typography sx={{ fontSize: 11.5, color: "#64748B", mt: 0.25 }}>Last year: {hd.lyRooms != null ? `${hd.lyRooms.toFixed(1)} rooms` : "—"} · {hd.lyRest != null ? inr(hd.lyRest) : "—"}</Typography>
            )}
            {keyDates.filter((k) => k.kind === "Banquet" && k.start === hd.date).map((k) => (
              <Typography key={k.event} sx={{ fontSize: 12.5, color: "#7E22CE", fontWeight: 700 }}>🎉 {k.event.replace("Banquet booking: ", "")}</Typography>
            ))}
          </Box>
        )}
      </Box>
      {badges.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mt: 1 }}>
          {badges.map((bd) => (
            <Box key={`lg${bd.a}`} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1, py: 0.4, borderRadius: 5, bgcolor: hl === bd.a ? "#EDE9FE" : "#F5F3FF", border: `1px solid ${hl === bd.a ? "#7C3AED" : "#DDD6FE"}`, fontSize: 12, cursor: "pointer", transition: "all .15s" }} onMouseEnter={() => setHl(bd.a)} onMouseLeave={() => setHl(null)} onClick={() => setHl(hl === bd.a ? null : bd.a)}>
              <Box component="span" sx={{ width: 18, height: 18, borderRadius: "50%", bgcolor: NEON.ev, color: "#fff", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>{bd.no}</Box>
              <Box component="span" sx={{ fontWeight: 700, color: "#4C1D95" }}>{bd.text}</Box>
              <Box component="span" sx={{ color: "#64748B" }}>{fmtRange(bd)}</Box>
            </Box>
          ))}
        </Box>
      )}
      <Typography sx={{ mt: 0.75, fontSize: 11.5, color: "#64748B" }}>
        Numbers = festivals (list above) · Purple glow = festival days · green pill = wedding season · 🎉 = banquet already booked · dotted line = usual level for this period{hasLy ? " · grey dashed line = same days last year" : ""}{n > 45 ? " · lines show a 7-day average so the trend is easy to read" : ""}
      </Typography>
    </Box>
  );
};

// 🎯 Opportunity finder: har business ke liye kaun sa tyohar mauka hai (zyada kamai) ya khali jagah (offer chalao)
const GH_ACT = {
  boost: "Raise room rate 10–15%, keep a 2-night minimum, push on OTA / Google.",
  fill: "Room + dinner combo or 15% family/corporate offer; WhatsApp past guests.",
  Navratri: { fill: "Garba-night package: room + late dinner for out-of-town garba visitors." },
  "After Diwali": { boost: "Peak travel days: raise rates, take advance bookings now." },
  "Christmas–New Year": { fill: "New Year stay + party package; push to families and groups." },
  "Valentine's Day": { boost: "Couple room + candle-light dinner package." },
  Janmashtami: { boost: "Satam–Atham travellers: rate up, push online early." },
  "Akshaya Tritiya": { boost: "Big wedding day: block rooms for wedding parties at full rate." },
  Uttarayan: { fill: "Kite-festival stay: terrace access + undhiyu breakfast." },
};
const REST_ACT = {
  boost: "Extra staff & stock; special menu; take pre-orders.",
  fill: "Combo offers, delivery push and a festival-special menu.",
  "Diwali week": { boost: "Sweet/farsan boxes, corporate gift hampers, pre-orders from 1 week before." },
  Navratri: { fill: "Late-night garba snacks & fasting menu; deliver to garba grounds." },
  "Maha Shivratri": { fill: "Farali (fasting) thali and sabudana specials." },
  "Ganesh Chaturthi": { fill: "Modak / prasad pre-orders for pandals and homes." },
  "Holi / Dhuleti": { boost: "Holi lunch + thandai; book group tables." },
  Uttarayan: { boost: "Undhiyu-jalebi terrace orders; take bulk bookings." },
  "Raksha Bandhan": { boost: "Family thali + sweets; reserve tables." },
};
const PARTY_IDEA = {
  "Diwali week": "Corporate Diwali parties & family get-togethers",
  "Christmas–New Year": "New Year's Eve party night with dinner & DJ",
  Navratri: "Garba night with dinner for societies / companies",
  "Valentine's Day": "Couple dinner evening",
  "Raksha Bandhan": "Family lunch gatherings",
  Uttarayan: "Kite-festival terrace party",
  "Holi / Dhuleti": "Holi party with lunch",
  Dussehra: "Society / company Dussehra dinners",
};
const act = (map, ev, type) => map[ev]?.[type] || map[type];
const OppRow = ({ d, value, type, text, unit }) => (
  <Box sx={{ p: 1.25, borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", display: "grid", gap: 0.5 }}>
    <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
      <Typography fontWeight={800} sx={{ fontSize: 14 }}>
        {EV_ICON[d.event] || (d.kind === "Wedding" ? "💍" : d.kind === "Banquet" ? "🎉" : "✨")} {d.event}
      </Typography>
      <Chip size="small" label={type === "boost" ? `▲ ${unit === "₹" ? lakh(value) : value}` : type === "fill" ? `▼ ${unit === "₹" ? lakh(Math.abs(value)) : Math.abs(value)}` : value} sx={{ fontWeight: 800, bgcolor: type === "boost" ? "#DCFCE7" : type === "fill" ? "#FEE2E2" : "#F3E8FF", color: type === "boost" ? "#166534" : type === "fill" ? "#991B1B" : "#6B21A8" }} />
    </Stack>
    <Typography variant="caption" color="text.secondary">
      {d.start === d.end ? nice(d.start) : `${short(d.start)} – ${nice(d.end)}`} · {type === "boost" ? "Earn more" : type === "fill" ? "Fill the gap" : d.kind === "Banquet" ? "Already booked" : d.kind === "Wedding" ? "Wedding demand" : "Event idea"}
    </Typography>
    <Typography variant="body2">{text}</Typography>
  </Box>
);
const OpportunityFinder = ({ dates }) => {
  const fest = dates.filter((d) => d.days);
  const top = (k) => [...fest].filter((d) => Math.abs(d[k]) >= 1000).sort((a, b) => Math.abs(b[k]) - Math.abs(a[k])).slice(0, 5);
  const gh = top("extraGh"), rest = top("extraRest");
  const wed = dates.filter((d) => d.kind === "Wedding" || d.kind === "Banquet");
  const party = fest.filter((d) => PARTY_IDEA[d.event]);
  const Col = ({ title, color, sub, children }) => (
    <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: `${color}0D`, border: `1px solid ${color}40`, display: "grid", gap: 1, alignContent: "start" }}>
      <Box>
        <Typography fontWeight={800} sx={{ color }}>{title}</Typography>
        <Typography variant="caption" color="text.secondary">{sub}</Typography>
      </Box>
      {children}
    </Box>
  );
  return (
    <Section title="🎯 Festival opportunities for each business">
      <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1.5 }}>
        ▲ green = festival brings extra money (be ready, price up) · ▼ red = festival brings less (run an offer to fill). Amounts = extra / missing money vs a normal day, from your past data.
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" }, gap: 1.5 }}>
        <Col title="🏨 Guest House" color={COLORS.gh} sub="Biggest effect on room revenue">
          {gh.map((d) => <OppRow key={d.start + d.event} d={d} value={d.extraGh} unit="₹" type={d.extraGh >= 0 ? "boost" : "fill"} text={act(GH_ACT, d.event, d.extraGh >= 0 ? "boost" : "fill")} />)}
          {!gh.length && <Typography variant="body2" color="text.secondary">No big festival effect in this period.</Typography>}
        </Col>
        <Col title="🍽️ Restaurant" color={COLORS.rest} sub="Biggest effect on restaurant sales">
          {rest.map((d) => <OppRow key={d.start + d.event} d={d} value={d.extraRest} unit="₹" type={d.extraRest >= 0 ? "boost" : "fill"} text={act(REST_ACT, d.event, d.extraRest >= 0 ? "boost" : "fill")} />)}
          {!rest.length && <Typography variant="body2" color="text.secondary">No big festival effect in this period.</Typography>}
        </Col>
        <Col title="🎉 Banquet" color="#9333EA" sub="Wedding seasons, bookings and party ideas">
          {wed.map((d) => <OppRow key={d.start + d.event} d={d} value={d.kind === "Banquet" ? "Booked" : "Weddings"} type="idea" text={d.action} />)}
          {party.map((d) => <OppRow key={"p" + d.start + d.event} d={d} value="Party idea" type="idea" text={`${PARTY_IDEA[d.event]}. Sell a per-plate package with hall + decoration.`} />)}
          {!wed.length && !party.length && <Typography variant="body2" color="text.secondary">No wedding dates or party festivals in this period.</Typography>}
        </Col>
      </Box>
    </Section>
  );
};

const DailyChart = ({ data, field, lyField, recent, money, max }) => (
  <ResponsiveContainer width="100%" height={260}>
    <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
      <CartesianGrid strokeDasharray="3 3" vertical={false} />
      <XAxis dataKey="date" tickFormatter={(v) => dayjs(v).format(data.length > 200 ? "MMM YY" : "D MMM")} minTickGap={36} tick={{ fontSize: 11 }} />
      <YAxis tickFormatter={money ? kTick : undefined} domain={[0, max || "auto"]} width={42} tick={{ fontSize: 11 }} />
      <Tooltip labelFormatter={(v) => dayjs(v).format("ddd, D MMM YYYY")} formatter={(v, name) => [v == null ? "—" : money ? inr(v) : Number(v).toFixed(1), name]} />
      <Legend />
      <Bar dataKey={recent} name="Actual" fill="#CBD5E1" barSize={4} />
      <Area dataKey={field} name="Forecast" stroke={COLORS.in} fill={COLORS.in} fillOpacity={0.08} strokeWidth={2} dot={false} connectNulls />
      <Line dataKey={lyField} name="Same weekday last year" stroke={LY} strokeDasharray="3 3" dot={false} strokeWidth={1.4} connectNulls />
    </ComposedChart>
  </ResponsiveContainer>
);

const ForecastDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hz, setHz] = useState("3M");
  const [tab, setTab] = useState("overview");
  const [filt, setFilt] = useState("all");

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/forecast`)
      .then(({ data }) => !off && setData(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load forecast"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, []);

  const v = useMemo(() => {
    if (!data) return null;
    const months = HZ.find((h) => h.key === hz).months;
    const end = dayjs(data.today).add(months, "month").subtract(1, "day").format("YYYY-MM-DD");
    const daily = data.daily.filter((d) => d.date <= end);
    const sum = (a, f) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
    const mg = daily.filter((d) => d.lyGh != null), mr = daily.filter((d) => d.lyRest != null), mo = daily.filter((d) => d.lyRooms != null);
    const weeks = data.weeks.filter((w) => w.weekStart <= end);
    const weak = weeks.reduce((a, w) => (!a || w.net < a.net ? w : a), null);
    let run = 0, runP = 0;
    const running = weeks.map((w) => ({ ...w, running: (run += w.net), runningAfter: (runP += w.afterPersonal), err: [w.net - w.low, w.high - w.net] }));
    // Banquet: mahine ka andaza, chuni avadhi ke din ke hisaab se
    const t0 = dayjs(data.today), t1 = dayjs(end);
    const share = (m) => {
      const ms = dayjs(m + "-01"), me = ms.endOf("month");
      const a = ms.isBefore(t0) ? t0 : ms, b = me.isAfter(t1) ? t1 : me;
      return b.isBefore(a, "day") ? 0 : (b.diff(a, "day") + 1) / ms.daysInMonth();
    };
    const bqm = (data.banquetMonths || []).map((b) => ({ ...b, share: share(b.month) })).filter((b) => b.share > 0);
    const banquet = sum(bqm, (b) => b.expected * b.share);
    const banquetLy = sum(bqm, (b) => (b.lastYear || 0) * b.share);
    const bookings = data.keyDates.filter((d) => d.kind === "Banquet" && d.start >= data.today && d.start <= end);
    const bookedValue = sum(bqm, (b) => b.bookedValue);
    const muhurat = sum(bqm.filter((b) => b.share >= 0.5), (b) => b.muhurat);
    const chart = [...data.recent.map((r) => ({ date: r.date, actRooms: r.rooms, actRest: r.rest })), ...daily];
    return {
      end,
      daily,
      chart,
      gh: sum(daily, (d) => d.gh),
      rest: sum(daily, (d) => d.rest),
      rooms: sum(daily, (d) => d.rooms),
      ghChg: chg(sum(mg, (d) => d.gh), sum(mg, (d) => d.lyGh)),
      restChg: chg(sum(mr, (d) => d.rest), sum(mr, (d) => d.lyRest)),
      roomsChg: chg(sum(mo, (d) => d.rooms), sum(mo, (d) => d.lyRooms)),
      cash: sum(weeks, (w) => w.net),
      personal: sum(weeks, (w) => w.personal),
      weak,
      banquet, banquetChg: chg(banquet, banquetLy), bookings, bookedValue, muhurat, bqm,
      weeks: running,
      months: data.months.filter((m) => m.month <= end.slice(0, 7)),
      dates: data.keyDates.filter((d) => d.end >= data.today && d.start <= end),
    };
  }, [data, hz]);

  const yearCompare = useMemo(() => {
    if (!data) return [];
    const M = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const rows = M.map((m) => ({ m }));
    data.history.forEach((h) => {
      const r = rows[+h.month.slice(5, 7) - 1];
      r[`gh${h.month.slice(0, 4)}`] = h.gh;
      r[`rest${h.month.slice(0, 4)}`] = h.rest;
      r[`banquet${h.month.slice(0, 4)}`] = h.banquet;
    });
    data.months.forEach((f) => {
      const r = rows[+f.month.slice(5, 7) - 1];
      const y = f.month.slice(0, 4);
      r[`ghF${y}`] = f.gh;
      r[`restF${y}`] = f.rest;
      r[`banquetF${y}`] = f.banquet;
    });
    return rows;
  }, [data]);
  const years = useMemo(() => (data ? [...new Set(data.history.map((h) => h.month.slice(0, 4)))] : []), [data]);
  const fYears = useMemo(() => (data ? [...new Set(data.months.map((h) => h.month.slice(0, 4)))] : []), [data]);
  const YC = ["#94A3B8", "#2563EB", "#16A34A", "#9333EA"];

  const keep = (d) => filt === "all" || (filt === "gh" && d.roomsX != null && Math.abs(d.roomsX - 1) >= 0.1) || (filt === "rest" && d.restX != null && Math.abs(d.restX - 1) >= 0.1) || (filt === "banquet" && (d.kind === "Wedding" || d.kind === "Banquet"));

  return (
    <Box sx={{ maxWidth: 1280, mx: "auto" }}>
      <Card variant="outlined" sx={{ mb: 2, background: "linear-gradient(135deg, #EFF6FF 0%, #FFFFFF 60%)" }}>
        <CardContent>
          <Stack direction={{ xs: "column", md: "row" }} spacing={2} justifyContent="space-between" alignItems={{ md: "center" }}>
            <Box>
              <Typography variant="h5" fontWeight={800}>
                Forecast
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Built every time from your real entries: rooms, restaurant and cash for the period you pick, plus the year&apos;s important dates.
              </Typography>
            </Box>
            <ToggleButtonGroup size="small" exclusive value={hz} onChange={(e, x) => x && setHz(x)} color="primary">
              {HZ.map((h) => (
                <ToggleButton key={h.key} value={h.key} sx={{ px: 1.75, fontWeight: 700 }}>
                  {h.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Stack>
          {data && (
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap>
              {data.coverage.map((c) => (
                <Chip key={c.item} size="small" variant={c.item === "Forecast" ? "filled" : "outlined"} color={c.item === "Forecast" ? "primary" : "default"} label={`${c.item}: ${nice(c.from)} → ${nice(c.to)}`} />
              ))}
            </Stack>
          )}
          {v && (
            <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
              Showing {nice(data.today)} to {nice(v.end)}. Further out = less sure, so ranges get wider.
            </Typography>
          )}
          {v && <SeasonStrip daily={v.daily} keyDates={v.dates} nRooms={data.nRooms} banquetMonths={v.bqm} />}
        </CardContent>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}
      {!data && !loading && <Alert severity="info">No forecast yet.</Alert>}

      {v && (
        <>
          <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
            <Kpi label="Guest House revenue" value={lakh(v.gh)} delta={v.ghChg} sub="vs same days last year" color={COLORS.gh} />
            <Kpi label="Restaurant sales" value={lakh(v.rest)} delta={v.restChg} sub="vs same days last year" color={COLORS.rest} />
            <Kpi label="Room-nights sold" value={Math.round(v.rooms).toLocaleString("en-IN")} delta={v.roomsChg} sub={`${(v.rooms / v.daily.length).toFixed(1)} a day of ${data.nRooms}`} color={COLORS.office} />
            <Kpi label="Banquet (expected)" value={lakh(v.banquet)} delta={v.banquetChg} sub={`${v.bookings.length} booked (${lakh(v.bookedValue)}) · ${v.muhurat} wedding dates`} color="#9333EA" />
            <Kpi label="Business cash left" value={lakh(v.cash)} sub={`Personal withdrawals at past rate: ${lakh(v.personal)}`} color={COLORS.net} />
            <Kpi label="Tightest week" value={v.weak ? lakh(v.weak.net) : "—"} sub={v.weak?.label} color={COLORS.bad} />
          </Stack>

          <Tabs value={tab} onChange={(e, x) => setTab(x)} variant="scrollable" sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
            <Tab value="overview" label="Overview" />
            <Tab value="dates" label="Key dates" />
            <Tab value="cash" label="Cash" />
            <Tab value="months" label="Months" />
            <Tab value="year" label="Year vs year" />
          </Tabs>

          {tab === "overview" && (
            <>
              <Section title="Coming up">
                <Stack spacing={1}>
                  {v.dates.slice(0, 5).map((d) => (
                    <DateCard key={d.start + d.event} d={d} />
                  ))}
                  {!v.dates.length && <Typography color="text.secondary">No special dates in this period.</Typography>}
                </Stack>
              </Section>
              <OpportunityFinder dates={v.dates} />
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
                <Section title={`Rooms sold per day (of ${data.nRooms})`}>
                  <DailyChart data={v.chart} field="rooms" lyField="lyRooms" recent="actRooms" max={data.nRooms} />
                </Section>
                <Section title="Restaurant sales per day">
                  <DailyChart data={v.chart} field="rest" lyField="lyRest" recent="actRest" money />
                </Section>
              </Box>
            </>
          )}

          {tab === "dates" && (
            <>
              <Section
                title="Important dates"
                right={
                  <ToggleButtonGroup size="small" exclusive value={filt} onChange={(e, x) => x && setFilt(x)}>
                    <ToggleButton value="all">All</ToggleButton>
                    <ToggleButton value="gh">Guest House</ToggleButton>
                    <ToggleButton value="rest">Restaurant</ToggleButton>
                    <ToggleButton value="banquet">Banquet</ToggleButton>
                  </ToggleButtonGroup>
                }
              >
                <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                  Effect = how busy that day was vs a normal day of the same weekday in your past data (1.00× = normal). The forecast uses 60% of it.
                </Typography>
                <Stack spacing={1}>
                  {v.dates.filter(keep).map((d) => (
                    <DateCard key={d.start + d.event} d={d} />
                  ))}
                  {!v.dates.filter(keep).length && <Typography color="text.secondary">No dates for this filter in this period.</Typography>}
                </Stack>
              </Section>
              <Section title="Wedding dates per month (banquet demand) and banquet income in the same month before">
                <ResponsiveContainer width="100%" height={260}>
                  <ComposedChart data={data.banquetMonths}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="c" allowDecimals={false} width={30} tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="r" orientation="right" tickFormatter={kTick} width={44} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(x, name) => [name.includes("dates") ? x : inr(x), name]} labelFormatter={(l, p) => (p?.[0]?.payload?.dates ? `${l}: ${p[0].payload.dates}` : l)} />
                    <Legend />
                    <Bar yAxisId="c" dataKey="muhurat" name="Wedding dates" fill={COLORS.gh} radius={[4, 4, 0, 0]} />
                    <Line yAxisId="r" dataKey="lastYear" name="Banquet income, same month last year" stroke={COLORS.office} dot />
                  </ComposedChart>
                </ResponsiveContainer>
              </Section>
            </>
          )}

          {tab === "cash" && (
            <>
              <Section title="Cash left each week (red = tightest, line = likely range)">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={v.weeks}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="weekStart" tickFormatter={(x) => dayjs(x).format(v.weeks.length > 16 ? "MMM YY" : "D MMM")} minTickGap={20} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={kTick} width={44} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(x, p) => p?.[0]?.payload?.label || x} formatter={(x, name) => [inr(x), name]} />
                    <ReferenceLine y={0} stroke="#64748B" />
                    <Bar dataKey="net" name="Cash left" radius={[4, 4, 0, 0]}>
                      {v.weeks.map((w) => (
                        <Cell key={w.weekStart} fill={w === v.weeks.find((x) => x.weekStart === v.weak?.weekStart) || w.net < 0 ? COLORS.bad : COLORS.in} />
                      ))}
                      <ErrorBar dataKey="err" width={3} stroke="#64748B" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Section>
              <Section title="Cash built up over the period">
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={v.weeks}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="weekStart" tickFormatter={(x) => dayjs(x).format(v.weeks.length > 16 ? "MMM YY" : "D MMM")} minTickGap={20} tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={kTick} width={48} tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={(x, p) => p?.[0]?.payload?.label || x} formatter={(x, name) => [inr(x), name]} />
                    <Legend />
                    <ReferenceLine y={0} stroke="#64748B" />
                    <Line dataKey="running" name="Business cash left" stroke={COLORS.in} strokeWidth={2.5} dot={false} />
                    <Line dataKey="runningAfter" name="After personal withdrawals" stroke={COLORS.personal} strokeDasharray="4 3" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </Section>
            </>
          )}

          {tab === "months" && (
            <>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
                {[
                  ["gh", "Guest House revenue", COLORS.gh, true],
                  ["rest", "Restaurant sales", COLORS.rest, true],
                  ["rooms", "Room-nights sold", COLORS.office, false],
                  ["banquet", "Banquet income (expected · range = past years)", "#9333EA", true],
                ].map(([k, title, color, money]) => (
                  <Section key={k} title={title}>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={v.months.map((m) => ({ ...m, err: [m[k] - m[k + "Low"], m[k + "High"] - m[k]] }))}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tickFormatter={money ? kTick : undefined} width={42} tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(x, name) => [Array.isArray(x) ? "" : money ? inr(x) : x, name]} />
                        <Legend />
                        <Bar dataKey={k + "Ly"} name="Same month last year" fill="#CBD5E1" radius={[3, 3, 0, 0]} />
                        <Bar dataKey={k} name="Forecast" fill={color} radius={[3, 3, 0, 0]}>
                          <ErrorBar dataKey="err" width={3} stroke="#475569" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Section>
                ))}
              </Box>
              <Section title="Month table">
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Month</TableCell>
                        <TableCell align="right">GH forecast</TableCell>
                        <TableCell align="right">GH last year</TableCell>
                        <TableCell align="right">Restaurant forecast</TableCell>
                        <TableCell align="right">Restaurant last year</TableCell>
                        <TableCell align="right">Room-nights</TableCell>
                        <TableCell align="right">Last year</TableCell>
                        <TableCell align="right">Banquet expected</TableCell>
                        <TableCell align="right">Banquet booked</TableCell>
                        <TableCell align="right">Banquet last year</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {v.months.map((m) => (
                        <TableRow key={m.month} hover>
                          <TableCell>{m.label}</TableCell>
                          <TableCell align="right">{inr(m.gh)}</TableCell>
                          <TableCell align="right">{inr(m.ghLy)}</TableCell>
                          <TableCell align="right">{inr(m.rest)}</TableCell>
                          <TableCell align="right">{inr(m.restLy)}</TableCell>
                          <TableCell align="right">{m.rooms}</TableCell>
                          <TableCell align="right">{m.roomsLy}</TableCell>
                          <TableCell align="right">{inr(m.banquet)}</TableCell>
                          <TableCell align="right">{inr(m.banquetBooked)}</TableCell>
                          <TableCell align="right">{inr(m.banquetLy)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Section>
            </>
          )}

          {tab === "year" && (
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" }, gap: 2 }}>
              {[
                ["gh", "Guest House revenue by month"],
                ["rest", "Restaurant sales by month"],
                ["banquet", "Banquet income by month"],
              ].map(([k, title]) => (
                <Section key={k} title={title}>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={yearCompare}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="m" tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={kTick} width={44} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(x, name) => [inr(x), name]} />
                      <Legend />
                      {years.map((y, i) => (
                        <Line key={y} dataKey={`${k}${y}`} name={`${y} actual`} stroke={YC[i % YC.length]} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} />
                      ))}
                      {fYears.map((y) => (
                        <Line key={"f" + y} dataKey={`${k}F${y}`} name={`${y} forecast`} stroke={YC[(years.indexOf(y) >= 0 ? years.indexOf(y) : years.length) % YC.length]} strokeDasharray="5 4" strokeWidth={2} dot={false} />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </Section>
              ))}
            </Box>
          )}
        </>
      )}
    </Box>
  );
};

export default ForecastDashboard;
