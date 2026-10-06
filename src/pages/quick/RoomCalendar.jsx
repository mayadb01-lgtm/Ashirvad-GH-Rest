// Room calendar (tape chart): rooms × dates, guest stays / bookings / blocks as bars.
// Data: roomstays + bookings + purani GH entries (sirf padhta hai) + roomblocks/roomstatuses.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ChevronDownIcon from "@mui/icons-material/ExpandMore";
import AddIcon from "@mui/icons-material/Add";
import BlockIcon from "@mui/icons-material/Block";
import { API, Q, apiError, inr } from "./shared";
import { BookingForm } from "./BookingsPanel";

dayjs.extend(customParseFormat);
const F = "DD-MM-YYYY";
const LABEL_W = 132;
const COL_W = 84;
const ROW_H = 40;

const COLORS = {
  stay: { bg: "#2563EB", fg: "#fff", tag: "C" },
  out: { bg: "#94A3B8", fg: "#fff", tag: "O" },
  due: { bg: "#EA580C", fg: "#fff", tag: "D" },
  booking: { bg: "#7C3AED", fg: "#fff", tag: "B" },
  entry: { bg: "#0F766E", fg: "#fff", tag: "E" },
  block: { bg: "repeating-linear-gradient(135deg,#334155 0 6px,#475569 6px 12px)", fg: "#fff", tag: "" },
};
const colorOf = (b) => (b.type === "stay" ? (b.status === "out" ? COLORS.out : b.dueOut ? COLORS.due : COLORS.stay) : COLORS[b.type]);
const FILTERS = [
  ["all", "All"],
  ["vacant", "Vacant"],
  ["occupied", "Occupied"],
  ["reserved", "Reserved"],
  ["blocked", "Blocked"],
  ["dueout", "Due out"],
  ["dirty", "Dirty"],
];

const D = (s) => dayjs(s, F, true);
const endOf = (b) => b.expectedTo || b.to; // ruke guest ka andaaza bhi room ghera hua maana jaata hai
const covers = (b, d) => !D(b.from).isAfter(d, "day") && !D(endOf(b)).isBefore(d, "day");

const RoomCalendar = ({ pageDate, isAdmin, onOpenRoom }) => {
  const small = useMediaQuery("(max-width:700px)");
  const [start, setStart] = useState(() => dayjs().subtract(1, "day").startOf("day"));
  const [days, setDays] = useState(small ? 7 : 14);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("all");
  const [bar, setBar] = useState(null); // details dialog
  const [bookingForm, setBookingForm] = useState(null); // { initial }
  const [blockDlg, setBlockDlg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(null); // { key, delta } — patti ka right edge kheench rahe hain
  const justDragged = useRef(false);

  const load = useCallback(() => {
    axios
      .get(`${API}/stay/calendar/${start.format(F)}/${days}`)
      .then(({ data }) => setData(data.data))
      .catch((e) => toast.error(apiError(e)));
  }, [start, days]);
  useEffect(() => load(), [load]);

  const dates = useMemo(() => Array.from({ length: days }, (_, i) => start.add(i, "day")), [start, days]);
  const today = data ? D(data.today) : dayjs().startOf("day");
  const focus = dates.some((d) => d.isSame(today, "day")) ? today : start;

  // Har room ka status (focus din ke liye) — filter chips ke liye
  const roomState = useMemo(() => {
    const m = {};
    (data?.rooms || []).forEach((r) => {
      const mine = (data.bars || []).filter((b) => b.roomNo === r.roomNo && covers(b, focus));
      const st = new Set();
      if (mine.some((b) => b.type === "block")) st.add("blocked");
      if (mine.some((b) => b.type === "stay" || b.type === "entry")) st.add("occupied");
      if (mine.some((b) => b.type === "booking")) st.add("reserved");
      if (mine.some((b) => b.type === "stay" && b.dueOut)) st.add("dueout");
      if ((data.dirty || []).includes(r.roomNo)) st.add("dirty");
      if (!st.has("blocked") && !st.has("occupied") && !st.has("reserved")) st.add("vacant");
      m[r.roomNo] = st;
    });
    return m;
  }, [data, focus]);
  const counts = useMemo(() => {
    const c = { all: data?.rooms?.length || 0 };
    Object.values(roomState).forEach((st) => st.forEach((k) => (c[k] = (c[k] || 0) + 1)));
    return c;
  }, [roomState, data]);

  const rooms = (data?.rooms || []).filter((r) => filter === "all" || roomState[r.roomNo]?.has(filter));
  // Floor ke hisaab se: 101–108, phir 201–208 (room number ke kram mein)
  const groups = useMemo(() => {
    const g = [];
    [...rooms].sort((a, b) => a.roomNo - b.roomNo).forEach((r) => {
      const floor = Math.floor(r.roomNo / 100);
      let grp = g.find((x) => x.floor === floor);
      if (!grp) g.push((grp = { floor, rooms: [] }));
      grp.rooms.push(r);
    });
    g.forEach((x) => (x.label = `Floor ${x.floor} · ${x.rooms[0].roomNo}–${x.rooms[x.rooms.length - 1].roomNo}`));
    return g;
  }, [rooms]);

  // Din ke hisaab se: kitne room bhare / khaali
  const dayStats = useMemo(
    () =>
      dates.map((d) => {
        const total = data?.rooms?.length || 0;
        const busyRooms = new Set();
        let occupied = 0;
        (data?.rooms || []).forEach((r) => {
          const mine = (data.bars || []).filter((b) => b.roomNo === r.roomNo && covers(b, d));
          if (mine.some((b) => b.type === "stay" || b.type === "entry")) occupied++;
          if (mine.length) busyRooms.add(r.roomNo);
        });
        return { available: total - busyRooms.size, occ: total ? Math.round((100 * occupied) / total) : 0 };
      }),
    [dates, data]
  );
  const groupAvail = (grp, d) =>
    grp.rooms.filter((r) => !(data.bars || []).some((b) => b.roomNo === r.roomNo && covers(b, d))).length;

  const cellClick = (roomNo, d) => {
    if (d.isBefore(today, "day")) return;
    if (d.isSame(today, "day")) {
      if (pageDate === today.format(F) && onOpenRoom) onOpenRoom(roomNo);
      else toast("Open today's page to check in");
      return;
    }
    setBookingForm({ initial: { roomNo, checkInDate: d.format(F), nights: 1 } });
  };

  const checkout = async (b) => {
    setBusy(true);
    try {
      const { data: r } = await axios.post(`${API}/stay/checkout`, { date: today.format(F), period: b.period || "day", roomNo: b.roomNo, stayId: b.id, guest: { fullname: b.name } });
      toast.success(`Room ${b.roomNo} checked out${r.billedToday ? " (after 11:00 AM — today is counted)" : ""}`);
      setBar(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const unblock = async (b) => {
    try {
      await axios.delete(`${API}/stay/block/${b.id}`);
      toast.success("Room unblocked");
      setBar(null);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const markClean = async (roomNo) => {
    try {
      await axios.put(`${API}/stay/clean/${roomNo}`, { dirty: false });
      toast.success(`Room ${roomNo} marked clean`);
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const gridCols = `${LABEL_W}px repeat(${days}, ${COL_W}px)`;
  const headCell = { borderLeft: `1px solid ${Q.line}`, textAlign: "center", fontSize: 11, lineHeight: 1.25, py: 0.5 };

  // Kaun si patti kheench sakte hain: booking (sab), ruke guest ka andaaza (sab), block (sirf owner)
  const canDrag = (b) => b.type === "booking" || (b.type === "stay" && b.status === "active") || (b.type === "block" && isAdmin);
  const commitDrag = async (b, delta) => {
    if (!delta) return;
    const newTo = D(endOf(b)).add(delta, "day");
    const from = D(b.from);
    try {
      if (b.type === "booking") {
        const nights = Math.max(1, newTo.diff(from, "day") + 1);
        await axios.put(`${API}/booking/${b.id}`, { nights });
        toast.success(`${b.name}: ${nights} night${nights > 1 ? "s" : ""}`);
      } else if (b.type === "stay") {
        // aaj se pehle tak nahi ghata sakte (wo din gine ja chuke)
        const minTo = D(b.to);
        const to = newTo.isBefore(minTo, "day") ? minTo : newTo;
        const nights = Math.max(1, to.diff(from, "day") + 1);
        await axios.put(`${API}/stay/expected/${b.id}`, { nights });
        toast.success(`${b.name}: expected till ${to.format("DD MMM")}`);
      } else if (b.type === "block") {
        const to = newTo.isBefore(from, "day") ? from : newTo;
        await axios.put(`${API}/stay/block/${b.id}`, { to: to.format(F) });
        toast.success(`Room ${b.roomNo} blocked till ${to.format("DD MMM")}`);
      }
      load();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const startDrag = (ev, b) => {
    ev.stopPropagation();
    ev.preventDefault();
    const key = `${b.type}-${b.id}`;
    const x0 = ev.clientX;
    let delta = 0;
    setDrag({ key, delta: 0 });
    const move = (e) => {
      delta = Math.round((e.clientX - x0) / COL_W);
      setDrag({ key, delta });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      justDragged.current = true;
      setTimeout(() => (justDragged.current = false), 300);
      setDrag(null);
      commitDrag(b, delta);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const renderBars = (roomNo) =>
    (data?.bars || [])
      .filter((b) => b.roomNo === roomNo)
      .map((b) => {
        const key = `${b.type}-${b.id}`;
        const delta = drag?.key === key ? drag.delta : 0;
        const s0 = Math.max(0, D(b.from).diff(start, "day"));
        const realEnd = D(b.to).diff(start, "day");
        const e = Math.min(days - 1, Math.max(D(b.from).diff(start, "day"), D(endOf(b)).diff(start, "day") + delta));
        const s = s0;
        if (e < 0 || s > days - 1 || e < s) return null;
        const c = colorOf(b);
        const cutLeft = D(b.from).isBefore(start, "day");
        const span = e - s + 1;
        // ruke guest: asli din gaadha, andaaze wale din halke
        const solidCols = b.type === "stay" && b.status === "active" ? Math.max(0, Math.min(span, realEnd - s + 1)) : span;
        const bg = solidCols < span ? `linear-gradient(90deg, ${c.bg} ${(100 * solidCols) / span}%, #93C5FD ${(100 * solidCols) / span}%)` : c.bg;
        const draggable = canDrag(b);
        return (
          <Box
            key={key}
            onClick={(ev) => {
              ev.stopPropagation();
              if (!drag && !justDragged.current) setBar(b);
            }}
            title={`${b.name} · ${b.from} → ${endOf(b)}${draggable ? " · drag the right edge to add/remove days" : ""}`}
            sx={{
              position: "relative",
              gridRow: 1,
              gridColumn: `${s + 2} / span ${span}`,
              zIndex: delta ? 6 : 2,
              m: "5px 2px",
              pl: 0.75,
              pr: draggable ? 1.75 : 0.75,
              borderRadius: cutLeft ? "0 6px 6px 0" : "6px",
              background: bg,
              color: c.fg,
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              overflow: "hidden",
              whiteSpace: "nowrap",
              cursor: "pointer",
              outline: delta ? "2px dashed #111" : "none",
              boxShadow: "0 1px 2px rgba(0,0,0,.15)",
              "&:hover": { filter: "brightness(1.08)" },
            }}
          >
            {c.tag && span > 1 && (
              <Box component="span" sx={{ bgcolor: "rgba(255,255,255,.9)", color: "#111", borderRadius: "4px", fontSize: 10, px: 0.5, lineHeight: "16px", flexShrink: 0 }}>
                {c.tag}
              </Box>
            )}
            <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {b.type === "block" ? b.name.toUpperCase() : b.name}
              {delta ? ` (${delta > 0 ? "+" : ""}${delta}d)` : ""}
            </Box>
            {draggable && (
              <Box
                onPointerDown={(ev) => startDrag(ev, b)}
                onClick={(ev) => ev.stopPropagation()}
                sx={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 12,
                  cursor: "ew-resize",
                  touchAction: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  "&::after": { content: '""', width: 3, height: 14, borderLeft: "1px solid rgba(255,255,255,.9)", borderRight: "1px solid rgba(255,255,255,.9)" },
                }}
              />
            )}
          </Box>
        );
      });

  return (
    <Box>
      {/* toolbar */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        <TextField
          type="date"
          size="small"
          label="From"
          value={start.format("YYYY-MM-DD")}
          onChange={(e) => e.target.value && setStart(dayjs(e.target.value))}
          InputLabelProps={{ shrink: true }}
          inputProps={isAdmin ? {} : { min: dayjs().subtract(1, "day").format("YYYY-MM-DD") }}
          sx={{ width: 160 }}
        />
        <IconButton size="small" onClick={() => setStart((s) => (isAdmin || s.subtract(7, "day").isAfter(dayjs().subtract(2, "day")) ? s.subtract(7, "day") : dayjs().subtract(1, "day")))} sx={{ border: `1px solid ${Q.line}` }}>
          <ChevronLeftIcon />
        </IconButton>
        <IconButton size="small" onClick={() => setStart((s) => s.add(7, "day"))} sx={{ border: `1px solid ${Q.line}` }}>
          <ChevronRightIcon />
        </IconButton>
        <Button size="small" variant="outlined" onClick={() => setStart(dayjs().subtract(1, "day").startOf("day"))}>
          Today
        </Button>
        <TextField select size="small" value={days} onChange={(e) => setDays(Number(e.target.value))} sx={{ width: 100 }}>
          {[7, 14, 21, 31].map((n) => (
            <MenuItem key={n} value={n}>
              {n} days
            </MenuItem>
          ))}
        </TextField>
        <Box sx={{ flex: 1 }} />
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setBookingForm({ initial: null })} sx={{ bgcolor: "#7C3AED", "&:hover": { bgcolor: "#6D28D9" } }}>
          New booking
        </Button>
        {isAdmin && (
          <Button size="small" variant="outlined" startIcon={<BlockIcon />} onClick={() => setBlockDlg({ roomNo: data?.rooms?.[0]?.roomNo || "", from: dayjs().format(F), to: dayjs().format(F), reason: "Maintenance" })}>
            Block room
          </Button>
        )}
      </Stack>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
        {FILTERS.map(([k, l]) => (
          <Chip
            key={k}
            label={`${l} ${counts[k] || 0}`}
            onClick={() => setFilter(k)}
            color={filter === k ? "primary" : "default"}
            variant={filter === k ? "filled" : "outlined"}
            sx={{ fontWeight: 700 }}
          />
        ))}
        <Typography variant="caption" color={Q.muted} sx={{ alignSelf: "center" }}>
          Status for {focus.format("DD MMM")}
        </Typography>
      </Stack>

      {!data ? (
        <Typography color={Q.muted}>Loading…</Typography>
      ) : (
        <Box sx={{ overflowX: "auto", border: `1px solid ${Q.line}`, borderRadius: 2, bgcolor: "#fff" }}>
          <Box sx={{ minWidth: LABEL_W + days * COL_W }}>
            {/* header */}
            <Box sx={{ display: "grid", gridTemplateColumns: gridCols, position: "sticky", top: 0, zIndex: 4, bgcolor: "#F8FAFC", borderBottom: `1px solid ${Q.line}` }}>
              <Box sx={{ position: "sticky", left: 0, bgcolor: "#F8FAFC", zIndex: 5, px: 1, display: "flex", alignItems: "center", fontWeight: 700, fontSize: 13 }}>Room</Box>
              {dates.map((d) => {
                const isToday = d.isSame(today, "day");
                return (
                  <Box key={d.format(F)} sx={{ ...headCell, bgcolor: isToday ? "#DBEAFE" : "transparent", fontWeight: isToday ? 800 : 600 }}>
                    <div>{d.format("ddd").toUpperCase()}</div>
                    <div>{d.format("D MMM")}</div>
                  </Box>
                );
              })}
            </Box>

            {groups.map((g) => (
              <Box key={g.floor}>
                {/* room type row: khaali rooms + list rate */}
                <Box sx={{ display: "grid", gridTemplateColumns: gridCols, bgcolor: "#F8FAFC", borderBottom: `1px solid ${Q.line}` }}>
                  <Box sx={{ position: "sticky", left: 0, bgcolor: "#F8FAFC", zIndex: 3, px: 1, py: 0.5, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", gap: 0.5 }}>
                    <ChevronDownIcon sx={{ fontSize: 16 }} /> {g.label}
                  </Box>
                  {dates.map((d) => (
                    <Box key={d.format(F)} sx={{ ...headCell, color: Q.muted }}>
                      <div style={{ fontWeight: 700, color: "#1E293B" }}>{groupAvail(g, d)}</div>
                      <div>free</div>
                    </Box>
                  ))}
                </Box>
                {g.rooms.map((r) => {
                  const dirty = (data.dirty || []).includes(r.roomNo);
                  return (
                    <Box key={r.roomNo} sx={{ display: "grid", gridTemplateColumns: gridCols, gridTemplateRows: `${ROW_H}px`, borderBottom: `1px solid ${Q.line}` }}>
                      <Box sx={{ gridRow: 1, gridColumn: 1, position: "sticky", left: 0, bgcolor: "#fff", zIndex: 3, px: 1, display: "flex", alignItems: "center", gap: 0.75, borderRight: `1px solid ${Q.line}` }}>
                        <Box sx={{ lineHeight: 1.1 }}>
                          <Typography fontWeight={800} fontSize={14} lineHeight={1.1}>
                            {r.roomNo}
                          </Typography>
                          <Typography fontSize={10} color={Q.muted} noWrap>
                            {r.type}
                          </Typography>
                        </Box>
                        {dirty && (
                          <Tooltip title="Dirty — tap to mark clean">
                            <Chip size="small" label="🧹 Dirty" onClick={() => markClean(r.roomNo)} sx={{ height: 20, fontSize: 10, bgcolor: "#FEF3C7" }} />
                          </Tooltip>
                        )}
                      </Box>
                      {dates.map((d, i) => {
                        const isToday = d.isSame(today, "day");
                        const past = d.isBefore(today, "day");
                        return (
                          <Box
                            key={d.format(F)}
                            onClick={() => cellClick(r.roomNo, d)}
                            sx={{
                              gridRow: 1,
                              gridColumn: i + 2,
                              borderLeft: `1px solid ${Q.line}`,
                              bgcolor: isToday ? "#EFF6FF" : past ? "#FAFAFA" : "transparent",
                              cursor: past ? "default" : "pointer",
                              "&:hover": past ? {} : { bgcolor: "#F0FDF4" },
                            }}
                          />
                        );
                      })}
                      {renderBars(r.roomNo)}
                    </Box>
                  );
                })}
              </Box>
            ))}

            {/* totals */}
            {[
              ["Available rooms", (s) => s.available],
              ["Occupancy", (s) => `${s.occ}%`],
            ].map(([label, fn]) => (
              <Box key={label} sx={{ display: "grid", gridTemplateColumns: gridCols, bgcolor: "#F8FAFC", borderTop: `1px solid ${Q.line}` }}>
                <Box sx={{ position: "sticky", left: 0, bgcolor: "#F8FAFC", zIndex: 3, px: 1, py: 0.75, fontSize: 12, fontWeight: 700 }}>{label}</Box>
                {dayStats.map((s, i) => (
                  <Box key={i} sx={{ ...headCell, fontWeight: 800 }}>
                    {label === "Occupancy" ? (
                      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                        <Box component="span" sx={{ width: 14, height: 6, borderRadius: 3, bgcolor: s.occ >= 90 ? "#EF4444" : s.occ >= 60 ? "#F59E0B" : s.occ > 0 ? "#10B981" : "#E2E8F0" }} />
                        {fn(s)}
                      </Box>
                    ) : (
                      fn(s)
                    )}
                  </Box>
                ))}
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* legend */}
      <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
        {[
          [COLORS.stay, "In house"],
          [{ bg: "#93C5FD" }, "Expected stay"],
          [COLORS.due, "Due out (before 11 AM)"],
          [COLORS.out, "Checked out"],
          [COLORS.booking, "Booking"],
          [COLORS.entry, "Earlier entry"],
          [COLORS.block, "Blocked"],
        ].map(([c, l]) => (
          <Stack key={l} direction="row" spacing={0.5} alignItems="center">
            <Box sx={{ width: 14, height: 14, borderRadius: 0.5, background: c.bg }} />
            <Typography variant="caption">{l}</Typography>
          </Stack>
        ))}
        <Typography variant="caption" color={Q.muted}>
          Tap a free cell: today = check in, future = new booking. Drag the right edge of a bar to add or remove days.
        </Typography>
      </Stack>

      {/* bar details */}
      <Dialog open={!!bar} onClose={() => setBar(null)} fullWidth maxWidth="xs">
        {bar && (
          <>
            <DialogTitle fontWeight={800}>
              {bar.type === "block" ? `Room ${bar.roomNo} · ${bar.name}` : bar.name}
              <Typography variant="body2" color={Q.muted}>
                {bar.type === "stay" ? (bar.status === "out" ? "Checked out" : bar.dueOut ? "Due out today (before 11:00 AM)" : "In house") : bar.type === "booking" ? `Booking ${bar.bookingNo}` : bar.type === "entry" ? "Earlier entry" : "Blocked"}
              </Typography>
            </DialogTitle>
            <DialogContent dividers>
              <Stack spacing={0.75}>
                {bar.roomNo && <Typography>Room: <b>{bar.roomNo}</b></Typography>}
                <Typography>
                  {bar.type === "booking" ? "Arrival" : "From"}: <b>{bar.from}</b> → <b>{bar.to}</b>
                  {bar.days ? ` · ${bar.days} day${bar.days > 1 ? "s" : ""}` : ""}
                  {bar.nights ? ` · ${bar.nights} night${bar.nights > 1 ? "s" : ""}` : ""}
                </Typography>
                {bar.mobile && <Typography>Mobile: {bar.mobile}</Typography>}
                {bar.people ? <Typography>Guests: {bar.people}</Typography> : null}
                {bar.type === "stay" && bar.status === "out" && (
                  <Typography>
                    Checked out: {bar.checkoutDate} {bar.checkoutTime}
                  </Typography>
                )}
                {bar.type === "booking" && (
                  <Typography>
                    Advance: <b>{inr(bar.advance)}</b>
                    {bar.rate ? ` · Rate ${inr(bar.rate)}/night` : ""}
                  </Typography>
                )}
                {bar.type === "booking" && !bar.roomNo && <Alert severity="warning">No room assigned yet — use Edit to assign one.</Alert>}
              </Stack>
            </DialogContent>
            <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
              {bar.type === "stay" && bar.status === "active" && (
                <Button variant="contained" color="success" disabled={busy} onClick={() => checkout(bar)}>
                  ✅ Check out
                </Button>
              )}
              {bar.type === "stay" && bar.status === "active" && onOpenRoom && pageDate === today.format(F) && (
                <Button onClick={() => (setBar(null), onOpenRoom(bar.roomNo))}>Open room</Button>
              )}
              {bar.type === "booking" && bar.roomNo && bar.from === today.format(F) && onOpenRoom && pageDate === today.format(F) && (
                <Button variant="contained" onClick={() => (setBar(null), onOpenRoom(bar.roomNo))}>
                  Check in now
                </Button>
              )}
              {bar.type === "booking" && (
                <Button
                  onClick={async () => {
                    try {
                      const { data: r } = await axios.get(`${API}/booking/upcoming`);
                      const full = (r.data || []).find((x) => x._id === bar.id);
                      setBar(null);
                      if (full) setBookingForm({ initial: full });
                      else toast.error("Booking not found");
                    } catch (e) {
                      toast.error(apiError(e));
                    }
                  }}
                >
                  Edit booking
                </Button>
              )}
              {bar.type === "block" && isAdmin && (
                <Button color="error" onClick={() => unblock(bar)}>
                  Unblock
                </Button>
              )}
              <Button onClick={() => setBar(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <BookingForm
        open={!!bookingForm}
        initial={bookingForm?.initial}
        rooms={(data?.rooms || []).map((r) => ({ roomNumber: r.roomNo, roomType: r.type, roomCost: r.rate }))}
        onClose={() => setBookingForm(null)}
        onSaved={() => {
          setBookingForm(null);
          load();
        }}
      />

      {/* block room (owner) */}
      <Dialog open={!!blockDlg} onClose={() => setBlockDlg(null)} fullWidth maxWidth="xs">
        <DialogTitle fontWeight={800}>Block room</DialogTitle>
        {blockDlg && (
          <DialogContent dividers>
            <Stack spacing={1.5}>
              <TextField select label="Room" value={blockDlg.roomNo} onChange={(e) => setBlockDlg((b) => ({ ...b, roomNo: e.target.value }))}>
                {(data?.rooms || []).map((r) => (
                  <MenuItem key={r.roomNo} value={r.roomNo}>
                    {r.roomNo} · {r.type}
                  </MenuItem>
                ))}
              </TextField>
              {["from", "to"].map((k) => (
                <TextField
                  key={k}
                  type="date"
                  label={k === "from" ? "From" : "To (inclusive)"}
                  value={D(blockDlg[k]).format("YYYY-MM-DD")}
                  onChange={(e) => e.target.value && setBlockDlg((b) => ({ ...b, [k]: dayjs(e.target.value).format(F) }))}
                  InputLabelProps={{ shrink: true }}
                />
              ))}
              <TextField label="Reason" value={blockDlg.reason} onChange={(e) => setBlockDlg((b) => ({ ...b, reason: e.target.value }))} />
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setBlockDlg(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={async () => {
              try {
                await axios.post(`${API}/stay/block`, blockDlg);
                toast.success("Room blocked");
                setBlockDlg(null);
                load();
              } catch (e) {
                toast.error(apiError(e));
              }
            }}
          >
            Block
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoomCalendar;
