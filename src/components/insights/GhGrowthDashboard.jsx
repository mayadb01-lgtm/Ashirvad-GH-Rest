// Guest House growth: occupancy, rate, kaun se guest, kaun se room, purane guests (WhatsApp offer). Sirf padhta hai.
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Typography, TextField } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import DownloadIcon from "@mui/icons-material/Download";
import { ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { API, COLORS, Kpi, PageTitle, Section, inr, kTick, lakh } from "./shared";

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
  const [msg, setMsg] = useState("Namaste {name} ji 🙏 Ashirvad Guest House mein aapka phir se swagat hai. Aapke liye is baar special rate rakha hai. Booking ke liye isi number pe message karein.");

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/insights/gh-growth/${start.format(F)}/${end.format(F)}`)
      .then(({ data }) => !off && setData(data.data))
      .catch((e) => toast.error(e?.response?.data?.message || "GH report load nahi hua"))
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
      data.topGuests.map((g) => ({ Naam: g.name, Mobile: g.mobile, Type: g.type, Stays: g.stays, "Total kharch": g.spent, "Pehli baar": g.first, "Aakhri baar": g.last, "Kitne din pehle": g.daysSinceLast }))
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Purane guests");
    XLSX.writeFile(wb, "GH_purane_guests.xlsx");
  };

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Guest House Growth" sub="Rooms kitne bharte hain, kis rate pe, kaun se guest aate hain — aur kahan se zyada kamai ho sakti hai." />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }}>
          <DatePicker label="Shuru" value={start} onChange={(v) => v && setStart(v)} format={F} slotProps={{ textField: { size: "small" } }} />
          <DatePicker label="Tak" value={end} onChange={(v) => v && setEnd(v)} format={F} slotProps={{ textField: { size: "small" } }} />
        </Stack>
      </LocalizationProvider>

      {loading && <Typography color="text.secondary">Load ho raha hai…</Typography>}

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="Kamai" value={lakh(k.revenue)} sub={`${k.stays || 0} stays`} color={COLORS.gh} />
        <Kpi label="Occupancy" value={`${k.occupancy || 0}%`} sub={`${data?.rooms || 0} rooms · ${data?.days || 0} din`} />
        <Kpi label="Average rate (ADR)" value={inr(k.adr)} sub={`RevPAR ${inr(k.revPar)}`} />
        <Kpi label="Khaali room-nights" value={(k.emptyRoomNights || 0).toLocaleString("en-IN")} sub={k.adr ? `Mauka ≈ ${lakh((k.emptyRoomNights || 0) * k.adr * 0.2)} (20% bhi bhare to)` : ""} color={COLORS.bad} />
        <Kpi label="List rate se discount" value={lakh(k.discount)} />
        <Kpi label="Purane guest" value={`${k.repeatShare || 0}%`} sub={`${k.repeatGuests || 0} / ${k.guests || 0} guests`} color={COLORS.net} />
      </Stack>

      {data && (
        <Alert severity="success" sx={{ mb: 2 }}>
          <b>Sujhav:</b> {bestDay && worstDay && `Sabse bhara din ${bestDay.day} (${bestDay.occupancy}%), sabse khaali ${worstDay.day} (${worstDay.occupancy}%) — khaali din pe offer/company tie-up. `}
          {lowRooms.length > 0 && `Sabse kam bharne wale rooms: ${lowRooms.map((r) => `${r.roomNo} (${r.occupancy}%)`).join(", ")}. `}
          Purane guests ko neeche list se WhatsApp offer bhejo.
        </Alert>
      )}

      <Section title="Mahina-wise occupancy aur rate">
        <Box sx={{ width: "100%", height: 320 }}>
          <ResponsiveContainer>
            <ComposedChart data={data?.monthly || []} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" />
              <YAxis yAxisId="l" tickFormatter={kTick} />
              <YAxis yAxisId="r" orientation="right" unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v, name) => (name === "Occupancy %" ? `${v}%` : inr(v))} />
              <Legend />
              <Bar yAxisId="l" dataKey="revenue" name="Kamai" fill={COLORS.gh} />
              <Line yAxisId="r" dataKey="occupancy" name="Occupancy %" stroke={COLORS.out} strokeWidth={3} />
              <Line yAxisId="l" dataKey="adr" name="Avg rate" stroke={COLORS.in} strokeDasharray="4 4" />
            </ComposedChart>
          </ResponsiveContainer>
        </Box>
      </Section>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
        <Section title="Hafte ke din: occupancy %" sx={{ flex: 1 }}>
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
        <Section title="Kaun se guest (kamai)" sx={{ flex: 1 }}>
          <Split obj={data?.byType} />
        </Section>
        <Section title="Payment kaise" sx={{ flex: 1 }}>
          <Split obj={data?.byMode} />
        </Section>
      </Stack>

      <Section title="Room-wise">
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Room", "Type", "List rate", "Avg rate", "Stays", "Occupancy", "Kamai"].map((h) => (
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
        title={`Purane guests (2+ baar aaye) — ${data?.topGuests?.length || 0}`}
        right={
          <Button size="small" variant="outlined" startIcon={<DownloadIcon />} onClick={exportGuests}>
            Excel
          </Button>
        }
      >
        <TextField fullWidth multiline minRows={2} size="small" label="WhatsApp message ({name} ki jagah naam aayega)" value={msg} onChange={(e) => setMsg(e.target.value)} sx={{ mb: 1.5 }} />
        <TableContainer sx={{ maxHeight: 480 }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {["Naam", "Mobile", "Type", "Stays", "Total kharch", "Aakhri baar", ""].map((h) => (
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
                    {g.last} ({g.daysSinceLast} din)
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
          Laal = 90 din se nahi aaye. "Offer" dabane pe WhatsApp khulega, message aap khud bhejoge.
        </Typography>
      </Section>
    </Box>
  );
};

export default GhGrowthDashboard;
