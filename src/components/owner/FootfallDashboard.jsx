// Owner: people per day across the hotel — restaurant (POS footfall: dine-in + take-out), guest house arrivals,
// banquet guests, and the grand total. Read only.
import { useEffect, useState } from "react";
import { Alert, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import { API, PageTitle, Section, MonthStepBar } from "../insights/shared";

const F = "DD-MM-YYYY";
const nf = (v) => Math.round(Number(v) || 0).toLocaleString("en-IN");

const COLS = [
  ["restaurant", "Restaurant (POS)", "Dine-in guests + take-out (each take-out at least 1)"],
  ["ghArrivals", "Guest house arrivals", "People who checked in that day (a guest staying several days counts once)"],
  ["banquet", "Banquet guests", "Guests of the banquet events held that day"],
  ["grandTotal", "Grand total", "Restaurant + guest house arrivals + banquet"],
];

const FootfallDashboard = () => {
  const [start, setStart] = useState(dayjs().startOf("month"));
  const [end, setEnd] = useState(dayjs());
  const [data, setData] = useState(null);

  useEffect(() => {
    let off = false;
    setData(null);
    axios
      .get(`${API}/owner/footfall/${start.format(F)}/${end.format(F)}`)
      .then(({ data: r }) => !off && setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load footfall"));
    return () => {
      off = true;
    };
  }, [start, end]);

  const days = (data?.days || []).filter((d) => d.grandTotal > 0 || d.ghInHouse > 0).reverse();
  const t = data?.totals;

  return (
    <Box>
      <PageTitle title="Footfall: restaurant, guest house and banquet" sub="How many people came each day. Grand total = restaurant + guest house arrivals + banquet." />
      <MonthStepBar start={start} end={end} setStart={setStart} setEnd={setEnd} />
      {data && data.posDays === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No POS footfall for these days yet. Restaurant footfall comes from the POS sync of the hotel PC.
        </Alert>
      )}
      {t && (
        <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, mb: 2 }}>
          {COLS.map(([k, label, hint]) => (
            <Box key={k} sx={{ p: 1.5, border: "1px solid", borderColor: k === "grandTotal" ? "primary.main" : "divider", borderRadius: 2 }} title={hint}>
              <Typography variant="caption" color="text.secondary">
                {label}
              </Typography>
              <Typography variant="h6" fontWeight={800}>
                {nf(t[k])}
              </Typography>
              {k === "ghArrivals" && (
                <Typography variant="caption" color="text.secondary">
                  {nf(t.ghRooms)} rooms
                </Typography>
              )}
              {k === "banquet" && (
                <Typography variant="caption" color="text.secondary">
                  {nf(t.banquetEvents)} event{t.banquetEvents === 1 ? "" : "s"}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      )}
      <Section title="Day by day">
        {!data ? (
          <Typography color="text.secondary">Loading…</Typography>
        ) : days.length === 0 ? (
          <Typography color="text.secondary">No footfall in these days.</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell align="right">Restaurant (POS)</TableCell>
                  <TableCell align="right">GH arrivals</TableCell>
                  <TableCell align="right">GH rooms</TableCell>
                  <TableCell align="right">In the rooms</TableCell>
                  <TableCell align="right">Banquet</TableCell>
                  <TableCell align="right">
                    <b>Grand total</b>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {days.map((d) => (
                  <TableRow key={d.date} hover>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{dayjs(d.date, F).format("DD-MM-YYYY (ddd)")}</TableCell>
                    <TableCell align="right">{nf(d.restaurant)}</TableCell>
                    <TableCell align="right" title={d.ghFrom === "check-ins" ? "Day not submitted yet: from the check-ins" : undefined}>
                      {nf(d.ghArrivals)}
                      {d.ghFrom === "check-ins" ? "*" : ""}
                    </TableCell>
                    <TableCell align="right">{nf(d.ghRooms)}</TableCell>
                    <TableCell align="right">{nf(d.ghInHouse)}</TableCell>
                    <TableCell align="right">
                      {nf(d.banquet)}
                      {d.banquetEvents > 1 ? ` (${d.banquetEvents} events)` : ""}
                    </TableCell>
                    <TableCell align="right">
                      <b>{nf(d.grandTotal)}</b>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
          * Guest house day not submitted yet: arrivals counted from the check-ins on the Guest House screen. Every room and every banquet event counts as at least 1 person.
        </Typography>
      </Section>
    </Box>
  );
};

export default FootfallDashboard;
