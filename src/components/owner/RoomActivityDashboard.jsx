// Owner: GH room ka footprint — kisne kab check-in kiya, kya badla, kya hataaya (wajah ke saath), check-out.
// Plus: check-in hua lekin submit hui entry mein nahi (paisa gayab hone ka khatra).
import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import dayjs from "dayjs";
import axios from "axios";
import toast from "react-hot-toast";
import { API, PageTitle, Section, MonthStepBar } from "../insights/shared";

const F = "DD-MM-YYYY";
const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
const PERIOD = { day: "Day", night: "Night", extraDay: "Extra Day", extraNight: "Extra Night" };
const ACTION = {
  remove: { label: "Removed", color: "error" },
  edit: { label: "Changed", color: "warning" },
  checkin: { label: "Check in", color: "success" },
  checkout: { label: "Check out", color: "default" },
  "undo-checkout": { label: "Check-out undone", color: "warning" },
};

const RoomActivityDashboard = () => {
  const [start, setStart] = useState(dayjs().subtract(6, "day"));
  const [end, setEnd] = useState(dayjs());
  const [data, setData] = useState({ logs: [], missing: [] });
  const [show, setShow] = useState("important");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let off = false;
    setLoading(true);
    axios
      .get(`${API}/stay/activity/${start.format(F)}/${end.format(F)}`)
      .then(({ data: r }) => !off && setData(r.data || { logs: [], missing: [] }))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load activity"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [start, end]);

  const removed = data.logs.filter((l) => l.action === "remove");
  const removedAmt = removed.reduce((t, l) => t + (Number(l.guest?.rate) || 0), 0);
  const list = useMemo(
    () => (show === "all" ? data.logs : data.logs.filter((l) => l.action === "remove" || l.action === "edit" || l.action === "undo-checkout")),
    [data.logs, show]
  );

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Room Activity (footprint)" sub="Every GH check-in, change, removal and check-out with who did it and when. Removed entries cannot be hidden." />
      <MonthStepBar start={start} end={end} setStart={setStart} setEnd={setEnd} format={F}>
        <Button size="small" variant="outlined" onClick={() => { setStart(dayjs()); setEnd(dayjs()); }}>
          Today
        </Button>
        <Button size="small" variant="outlined" onClick={() => { setStart(dayjs().subtract(6, "day")); setEnd(dayjs()); }}>
          Last 7 days
        </Button>
      </MonthStepBar>
      {loading && <Typography color="text.secondary">Loading…</Typography>}

      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
        <Alert severity={removed.length ? "error" : "success"} sx={{ flex: "1 1 260px" }}>
          <b>{removed.length}</b> check-in {removed.length === 1 ? "entry" : "entries"} removed{removed.length ? ` · rate total ${inr(removedAmt)}` : ""}
        </Alert>
        <Alert severity={data.missing.length ? "error" : "success"} sx={{ flex: "1 1 260px" }}>
          <b>{data.missing.length}</b> checked-in {data.missing.length === 1 ? "room is" : "rooms are"} missing from the submitted entry
        </Alert>
      </Stack>

      {data.missing.length > 0 && (
        <Section title="⚠️ Checked in, but not in the submitted entry">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["Date", "Room", "Guest", "Rate", "Payment", "Check-in", "Status", "Checked in by"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {data.missing.map((m, i) => (
                  <TableRow key={i} sx={{ bgcolor: "#FEF2F2" }}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {m.date} <Typography component="span" variant="caption" color="text.secondary">{PERIOD[m.period] || m.period}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{m.roomNo}</TableCell>
                    <TableCell>
                      {m.guest?.fullname}
                      <Typography variant="caption" display="block" color="text.secondary">{m.guest?.mobileNumber}</Typography>
                    </TableCell>
                    <TableCell>{inr(m.guest?.rate)}</TableCell>
                    <TableCell>{m.guest?.modeOfPayment || "—"}</TableCell>
                    <TableCell>{m.guest?.checkInTime}</TableCell>
                    <TableCell>{m.status === "out" ? `Checked out ${m.checkoutTime || ""}` : "In room"}</TableCell>
                    <TableCell>{m.by}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Section>
      )}

      <Section
        title={`Activity — ${list.length}`}
        right={
          <ToggleButtonGroup size="small" exclusive value={show} onChange={(e, v) => v && setShow(v)}>
            <ToggleButton value="important">Removed / changed</ToggleButton>
            <ToggleButton value="all">All</ToggleButton>
          </ToggleButtonGroup>
        }
      >
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["When", "Room day", "Room", "Action", "Guest", "Rate", "Payment", "Details / reason", "By"].map((h) => (
                  <TableCell key={h} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {list.map((l) => {
                const a = ACTION[l.action] || { label: l.action, color: "default" };
                return (
                  <TableRow key={l._id} hover sx={{ bgcolor: l.action === "remove" ? "#FEF2F2" : undefined }}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{dayjs(l.createdAt).format("DD MMM, hh:mm A")}</TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {l.date} <Typography component="span" variant="caption" color="text.secondary">{PERIOD[l.period] || l.period}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{l.roomNo}</TableCell>
                    <TableCell>
                      <Chip size="small" color={a.color} label={a.label} />
                    </TableCell>
                    <TableCell>
                      {l.guest?.fullname}
                      <Typography variant="caption" display="block" color="text.secondary">
                        {l.guest?.mobileNumber}
                        {l.guest?.checkInTime ? ` · in ${l.guest.checkInTime}` : ""}
                      </Typography>
                    </TableCell>
                    <TableCell>{l.guest?.rate ? inr(l.guest.rate) : ""}</TableCell>
                    <TableCell>{l.guest?.modeOfPayment || ""}</TableCell>
                    <TableCell sx={{ minWidth: 180 }}>
                      {l.reason && <b>{l.reason}</b>}
                      {l.action === "remove" && l.stayStatus === "out" && <Typography variant="caption" display="block" color="error">Guest had already checked out</Typography>}
                      {(l.changes || []).map((c, i) => (
                        <Typography key={i} variant="caption" display="block">
                          {c.field}: {c.from || "—"} → {c.to || "—"}
                        </Typography>
                      ))}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {l.by}
                      <Typography variant="caption" display="block" color="text.secondary">{l.role}</Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!loading && !list.length && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Typography color="text.secondary">Nothing in this date range.</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Section>
    </Box>
  );
};

export default RoomActivityDashboard;
