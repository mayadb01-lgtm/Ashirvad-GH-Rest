// Guest House growth: occupancy, rate, kaun se guest, kaun se room, purane guests (WhatsApp offer). Sirf padhta hai.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Typography, TextField } from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import DownloadIcon from "@mui/icons-material/Download";
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { API, COLORS, Kpi, PageTitle, Section, inr, kTick, lakh , MonthRangeBar, MonthStepBar } from "./shared";
import { BUSINESS } from "../../business";

const F = "DD-MM-YYYY";
const Split = ({ obj }) => {
  const list = Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);
  const total = list.reduce((s, [, v]) => s + v, 0);
  return (
    <Stack spacing={0.75}>
      {list.map(([k, v]) => (
        <Box key={k}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="body2">{k}</Typography>
            <Typography variant="body2">
              {inr(v)} · {total ? Math.round((100 * v) / total) : 0}%
            </Typography>
          </Stack>
          <Box sx={{ height: 8, borderRadius: 4, bgcolor: "#F1F5F9" }}>
            <Box sx={{ height: 8, borderRadius: 4, width: `${total ? (100 * v) / total : 0}%`, bgcolor: COLORS.gh }} />
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

const GhGrowthDashboard = () => {
  const [start, setStart] = useState(dayjs().subtract(5, "month").startOf("month"));
  const [end, setEnd] = useState(dayjs());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(`Hello {name} 🙏 Welcome back to ${BUSINESS.shortName || BUSINESS.name} Guest House. We have a special rate for you this time. Message us on this number to book.`);

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/insights/gh-growth/${start.format(F)}/${end.format(F)}`)
      .then(({ data }) => !off && setData(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load GH report"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [start, end]);

  const k = data?.kpi || {};
  const wa = (g) => `https://wa.me/91${g.mobile}?text=${encodeURIComponent(msg.replace("{name}", g.name || ""))}`;
  const lowRooms = useMemo(() => [...(data?.roomWise || [])].sort((a, b) => a.occupancy - b.occupancy).slice(0, 3), [data]);
  const bestDay = useMemo(() => [...(data?.weekday || [])].sort((a, b) => b.occupancy - a.occupancy)[0], [data]);
  const worstDay = useMemo(() => [...(data?.weekday || [])].sort((a, b) => a.occupancy - b.occupancy)[0], [data]);

  const exportGuests = () => {
    if (!data?.topGuests?.length) return;
    const ws = XLSX.utils.json_to_sheet(
      data.topGuests.map((g) => ({ Name: g.name, Mobile: g.mobile, Type: g.type, Stays: g.stays, "Total spent": g.spent, "First visit": g.first, "Last visit": g.last, "Days since last visit": g.daysSinceLast }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Repeat guests");
    XLSX.writeFile(wb, "GH_repeat_guests.xlsx");
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Guest House Growth" sub="How full the rooms are, at what rate, which guests come — and where revenue can grow." />
      <MonthStepBar start={start} end={end} setStart={setStart} setEnd={setEnd} format={F} />

      {loading && <Typography color="text.secondary">Loading…</Typography>}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="Revenue" value={lakh(k.revenue)} sub={`${k.stays || 0} stays`} color={COLORS.gh} />
        <Kpi label="Occupancy" value={`${k.occupancy || 0}%`} sub={`${data?.rooms || 0} rooms · ${data?.days || 0} days`} />
        <Kpi label="Average rate (ADR)" value={inr(k.adr)} sub={`RevPAR ${inr(k.revPar)}`} />
        <Kpi label="Vacant room-nights" value={(k.emptyRoomNights || 0).toLocaleString("en-IN")} sub={k.adr ? `Potential ≈ ${lakh((k.emptyRoomNights || 0) * k.adr * 0.2)} (if 20% are filled)` : ""} color={COLORS.bad} />
        <Kpi label="Discount from list rate" value={lakh(k.discount)} />
        <Kpi label="Repeat guests" value={`${k.repeatShare || 0}%`} sub={`${k.repeatGuests || 0} / ${k.guests || 0} guests`} color={COLORS.net} />
      </Stack>

      {data && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <b>Tip:</b> {bestDay && worstDay && `Busiest day ${bestDay.day} (${bestDay.occupancy}%), quietest ${worstDay.day} (${worstDay.occupancy}%) — try offers or company tie-ups on quiet days. `}
          {lowRooms.length > 0 && `Least occupied rooms: ${lowRooms.map((r) => `${r.roomNo} (${r.occupancy}%)`).join(", ")}. `}
          Send WhatsApp offers to repeat guests from the list below.
        </Alert>
      )}

      <Section title="Monthly occupancy and rate">
        <Box sx={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart data={data?.monthly || []} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis yAxisId="l" tickFormatter={kTick} />
              <YAxis yAxisId="r" orientation="right" unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v, name) => (name === "Occupancy %" ? `${v}%` : inr(v))} />
              <Legend />
              <Bar yAxisId="l" dataKey="revenue" name="Revenue" fill={COLORS.gh} />
              <Line yAxisId="r" dataKey="occupancy" name="Occupancy %" stroke={COLORS.out} strokeWidth={3} />
              <Line yAxisId="l" dataKey="adr" name="Avg rate" stroke={COLORS.in} strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Section>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Section title="Day of week: occupancy %" sx={{ flex: 1 }}>
          <Box sx={{ width: "100%", height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={data?.weekday || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" />
                <YAxis unit="%" />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="occupancy" name="Occupancy" fill={COLORS.gh} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Section>
        <Section title="Guest types (revenue)" sx={{ flex: 1 }}>
          <Split obj={data?.byType} />
        </Section>
        <Section title="Payment modes" sx={{ flex: 1 }}>
          <Split obj={data?.byMode} />
        </Section>
      </Stack>

      <Section title="Room-wise">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Room", "Type", "List rate", "Avg rate", "Stays", "Occupancy", "Revenue"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700 }} align={h === "Room" || h === "Type" ? "left" : "right"}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.roomWise || []).map((r) => (
                <TableRow key={r.roomNo} hover>
                  <TableCell>{r.roomNo}</TableCell>
                  <TableCell>{r.roomType}</TableCell>
                  <TableCell align="right">{inr(r.listRate)}</TableCell>
                  <TableCell align="right" sx={{ color: r.avgRate < r.listRate ? COLORS.bad : "inherit" }}>{inr(r.avgRate)}</TableCell>
                  <TableCell align="right">{r.stays}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: r.occupancy < 25 ? COLORS.bad : r.occupancy > 50 ? COLORS.net : "inherit" }}>{r.occupancy}%</TableCell>
                  <TableCell align="right">{inr(r.revenue)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>

      <Section
        title={`Repeat guests (2+ visits) — ${data?.topGuests?.length || 0}`}
        right={
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportGuests}>
            Excel
          </Button>
        }
      >
        <TextField fullWidth multiline minRows={2} size="small" label="WhatsApp message ({name} is replaced with the guest name)" value={msg} onChange={(e) => setMsg(e.target.value)} sx={{ mb: 1.5 }} />
        <TableContainer sx={{ maxHeight: 480 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {["Name", "Mobile", "Type", "Stays", "Total spent", "Last visit", ""].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700 }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {(data?.topGuests || []).map((g) => (
                <TableRow key={g.mobile} hover>
                  <TableCell>{g.name}</TableCell>
                  <TableCell>{g.mobile}</TableCell>
                  <TableCell>{g.type}</TableCell>
                  <TableCell>{g.stays}</TableCell>
                  <TableCell>{inr(g.spent)}</TableCell>
                  <TableCell sx={{ color: g.daysSinceLast > 90 ? COLORS.bad : "inherit" }}>
                    {g.last} ({g.daysSinceLast} days)
                  </TableCell>
                  <TableCell>
                    <Button size="small" color="success" startIcon={<WhatsAppIcon />} href={wa(g)} target="_blank" rel="noopener">
                      Offer
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary">
          Red = not visited in 90 days. Tapping "Offer" opens WhatsApp; you send the message yourself.
        </Typography>
      </Section>
    </Box>
  );
};

export default GhGrowthDashboard;
