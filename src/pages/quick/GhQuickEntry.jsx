// Guest House: PC + mobile entry
// Niyam purane page jaise: staff din ek baar submit karta hai, uske baad sirf admin badal sakta hai.
// Data bilkul purane format mein jaata hai (/entry/create-entry, /entry/update-entry).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { LocalizationProvider, TimePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  Collapse,
  InputAdornment,
  MenuItem,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import GuestRegisterForm from "./GuestRegisterForm";
import RoomChargesPanel from "./RoomChargesPanel";
import RoomInvoiceButton from "../invoice/RoomInvoiceButton";
import BookingsPanel from "./BookingsPanel";
import RoomCalendar from "./RoomCalendar";
import { computeDues } from "./checkoutGuard";
import { MergeBillDialog, RemoveEntryDialog, RoomMoveDialog } from "./RoomMoveDialogs";
import SearchIcon from "@mui/icons-material/Search";
import LockIcon from "@mui/icons-material/Lock";
import {
  API,
  ChipChoice,
  ConfirmDialog,
  DATE_FMT,
  EditorDialog,
  MoneyField,
  Q,
  SaveBar,
  StatusPill,
  Stepper,
  apiError,
  cleanMobile,
  inr,
  num,
  useDraft,
} from "./shared";

const PERIODS = [
  { key: "day", label: "Day", idLabel: "Day" },
  { key: "night", label: "Night", idLabel: "Night" },
  { key: "extraDay", label: "Extra Day", idLabel: "extraDay" },
  { key: "extraNight", label: "Extra Night", idLabel: "extraNight" },
];
const ROOM_PERIODS = PERIODS.map((p) => p.key);
const TYPES = ["Single", "Couple", "Family", "Group", "Employee", "NRI", "Foreigner", "Other"];
const MODES = ["Cash", "Card", "PPS", "PPC", "UnPaid"];
const PAID_MODES = ["Cash", "Card", "PPS", "PPC"];
const EMPTY = { rooms: {}, jama: [] };

const digits = (v) => cleanMobile(v);
const keyOf = (period, roomNo) => `${period}|${roomNo}`;
dayjs.extend(customParseFormat);
// Time "hh:mm AM/PM" format mein hi save hota hai (purane data jaisa)
const toTime = (t) => {
  const d = dayjs(`2000-01-01 ${String(t || "").trim()}`, ["YYYY-MM-DD hh:mm A", "YYYY-MM-DD h:mm A", "YYYY-MM-DD HH:mm"], true);
  return d.isValid() ? d : null;
};
const nowTime = () => {
  const n = dayjs();
  return n.minute(Math.floor(n.minute() / 5) * 5).format("hh:mm A");
};
const TimeBox = ({ label, value, onChange, disabled }) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <TimePicker
      label={label}
      ampm
      minutesStep={5}
      value={toTime(value)}
      onChange={(v) => v && v.isValid() && onChange(v.format("hh:mm A"))}
      disabled={disabled}
      slotProps={{ textField: { fullWidth: true } }}
    />
  </LocalizationProvider>
);
const rowIssues = (r) => {
  const out = [];
  if (!(num(r.rate) > 0)) out.push("rate");
  if (!(num(r.noOfPeople) > 0)) out.push("guests");
  if (!r.type) out.push("guest type");
  if (!r.modeOfPayment) out.push("payment");
  if (!String(r.fullname || "").trim()) out.push("name");
  const m = digits(r.mobileNumber);
  if (m && m !== "0" && m.length !== 10) out.push("10-digit mobile");
  return out;
};
// Checkout ke baad usi din naya guest kis slot mein
const NEXT_PERIOD = { day: "extraDay", night: "extraNight" };
// Din raat 12 baje band hota hai; staff ko settle karne ke liye 2 ghante (server pe bhi yahi niyam)
const SETTLE_GRACE_HOURS = 2;
const advOf = (b) => (b?.advances || []).reduce((s, a) => s + num(a.amount), 0);
const chargesFor = (list, period, roomNo) => (list || []).filter((c) => c.roomNo === roomNo && (!c.period || c.period === period));
const isTouched = (r) => r && (num(r.rate) > 0 || String(r.fullname || "").trim() || r.modeOfPayment || r.type);

/* ---------------- Room card ---------------- */
const RoomCard = ({ room, row, onOpen, locked, fromServer, charges = [], checkout, booking, advance = 0, period, dueOut, group }) => {
  // Room pe "baaki" dikhao: room rent (agar UnPaid) + food/extra jo abhi paid nahi − booking advance
  const rentDue = row?.modeOfPayment === "UnPaid" ? Math.max(0, num(row?.rate)) : 0; // Rate = final
  const due = Math.max(0, rentDue + charges.filter((c) => !c.isPaid).reduce((s, c) => s + num(c.amount), 0) - advance - num(row?.discount)); // discount poore bill par
  const nextLabel = PERIODS.find((p) => p.key === NEXT_PERIOD[period])?.label;
  const filled = row && rowIssues(row).length === 0;
  const partial = row && !filled && isTouched(row);
  const low = filled && room.roomCost && num(row.rate) < room.roomCost * 0.7;
  // Rang: check-in = halka hara, check-out = halka laal, khaali (available) = halka neela
  const state = checkout ? "out" : filled || partial || dueOut ? "in" : "free";
  const tint = { in: { bg: "#DCFCE7", line: "#22C55E" }, out: { bg: "#FEF2F2", line: "#FCA5A5" }, free: { bg: "#F0F9FF", line: "#BAE6FD" } }[state];
  const border = low ? "#F59E0B" : partial ? Q.bad : tint.line;
  return (
    <ButtonBase
      onClick={onOpen}
      disabled={locked && !filled && !checkout}
      sx={{ width: "100%", height: "100%", textAlign: "left", borderRadius: 3, display: "block" }}
    >
      <Paper
        variant="outlined"
        sx={{
          height: "100%",
          boxSizing: "border-box",
          p: 1.5,
          borderRadius: 3,
          borderWidth: filled || partial || low ? 1.5 : 1.5,
          borderStyle: state === "free" ? "dashed" : "solid",
          borderColor: border,
          bgcolor: low ? "#FFFBEB" : tint.bg,
          minHeight: 132,
        }}
      >
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography fontWeight={800} fontSize={19}>
            {room.roomNumber}
          </Typography>
          <Typography variant="caption" color={Q.muted} sx={{ flex: 1 }}>
            {room.roomType} · {inr(room.roomCost)}
          </Typography>
          {filled && !low && (
            <Typography variant="caption" sx={{ color: fromServer ? Q.good : Q.gh, fontWeight: 800 }}>
              {fromServer ? "✓ Submitted" : "✓ Filled"}
            </Typography>
          )}
          {low && <StatusPill tone="warn">Check rate</StatusPill>}
          {partial && <StatusPill tone="warn">Incomplete</StatusPill>}
        </Stack>
        {(row?._stayDay || checkout || dueOut || group) && (
          <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
            {dueOut && <StatusPill tone="warn">⏰ {dueOut.guest?.fullname || "Guest"} · checkout due {dueOut.dueTime}</StatusPill>}
            {group && <StatusPill tone="info">🔗 {group.mainRoom === room.roomNumber ? `Main · ${group.rooms.length + 1} rooms` : `Bill → ${group.mainRoom}`}</StatusPill>}
            {row?._stayDay && <StatusPill tone="info">🔁 Day {row._stayDay}</StatusPill>}
            {checkout && <StatusPill tone="out">✓ Checkout {checkout.time}</StatusPill>}
          </Stack>
        )}
        {filled || partial ? (
          <>
            <Typography fontWeight={700} sx={{ mt: 0.5, opacity: checkout ? 0.6 : 1 }} noWrap>
              {row.fullname || "—"}
            </Typography>
            <Typography variant="caption" color={Q.muted} noWrap component="div">
              {digits(row.mobileNumber) && digits(row.mobileNumber) !== "0" ? digits(row.mobileNumber) + " · " : ""}
              {row.noOfPeople || 0} guests · {row.type || "—"}
            </Typography>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.75 }}>
              <Box
                component="span"
                sx={{
                  fontSize: 12,
                  fontWeight: 700,
                  px: 1.2,
                  py: 0.3,
                  borderRadius: 10,
                  bgcolor: row.modeOfPayment === "UnPaid" ? "#FEE2E2" : "#CCFBF1",
                  color: row.modeOfPayment === "UnPaid" ? Q.bad : "#115E59",
                }}
              >
                {row.modeOfPayment === "UnPaid" ? "Unpaid" : row.modeOfPayment || "—"}
              </Box>
              {/* Rate nahi, sirf guest se lena baaki (room + food + extra) */}
              <Typography fontWeight={800} fontSize={due > 0 && row.modeOfPayment ? 17 : 14} title="Due for room + food + extras" sx={{ color: !row.modeOfPayment ? Q.warn : due > 0 ? Q.bad : Q.good }}>
                {!row.modeOfPayment ? "Select payment" : due > 0 ? `Due ${inr(due)}` : "✓ Paid"}
              </Typography>
            </Stack>
            {partial && (
              <Typography variant="caption" sx={{ color: Q.bad, fontWeight: 700 }}>
                Missing: {rowIssues(row).join(", ")}
              </Typography>
            )}
            {checkout && nextLabel && (
              <Typography variant="caption" component="div" sx={{ color: Q.gh, fontWeight: 800, mt: 0.5 }}>
                Room vacant · new guest in {nextLabel}
              </Typography>
            )}
          </>
        ) : booking ? (
          <Box sx={{ mt: 1 }}>
            <Typography fontWeight={800} sx={{ color: "#7C3AED" }} noWrap>
              📅 {booking.guestName}
            </Typography>
            <Typography variant="caption" color={Q.muted} component="div">
              Booking · {booking.nights} nights · Adv {inr(advOf(booking))} · tap to check in
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ mt: 2.5, color: locked ? Q.muted : Q.gh, fontWeight: 700 }}>
            {locked ? "Vacant" : "+ Check in"}
          </Typography>
        )}
      </Paper>
    </ButtonBase>
  );
};

/* ---------------- Room editor ---------------- */
const RoomEditor = ({ open, room, period, date, initial, onClose, onSave, onClear, locked, isAdmin, charges, onChargesChanged, stay, onCheckout, onUndoCheckout, onNewGuest, advance = 0, checkedIn = false, onMove, onMerge, onUnmerge, group }) => {
  const [f, setF] = useState(initial);
  const [guest, setGuest] = useState(null);
  const lastLookup = useRef("");
  useEffect(() => {
    setF(initial);
    setGuest(null);
    lastLookup.current = "";
  }, [initial, open]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  // Koi room khula na ho to f = null hota hai (pehle isi se poora page safed ho jaata tha)
  const mobile = digits(f?.mobileNumber);

  useEffect(() => {
    if (!open || mobile.length !== 10 || lastLookup.current === mobile) return;
    lastLookup.current = mobile;
    axios
      .get(`${API}/quick/guest/${mobile}`)
      .then(({ data }) => {
        if (!data.found) return setGuest({ found: false });
        setGuest({ found: true, ...data.guest });
        setF((p) => ({
          ...p,
          fullname: p.fullname || data.guest.fullname || "",
          type: p.type || data.guest.type || "",
          noOfPeople: p.noOfPeople || data.guest.noOfPeople || 0,
        }));
      })
      .catch(() => {});
  }, [mobile, open]);

  if (!room || !f) return null;
  const issues = rowIssues(f);
  const low = room.roomCost && num(f.rate) > 0 && num(f.rate) < room.roomCost * 0.7;
  const periodLabel = PERIODS.find((p) => p.key === period)?.label;

  return (
    <EditorDialog
      open={open}
      onClose={onClose}
      subtitle={`${periodLabel} · ${date}`}
      title={`Room ${room.roomNumber} · ${room.roomType}`}
      actions={
        locked ? (
          <Button fullWidth onClick={onClose} variant="outlined">
            Close
          </Button>
        ) : (
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            {checkedIn && (!initial?._stayId || isAdmin) && (
              <Button color="error" onClick={onClear} sx={{ fontWeight: 700 }}>
                Remove
              </Button>
            )}
            <Button
              fullWidth
              variant="contained"
              disabled={issues.length > 0}
              onClick={() => onSave(f)}
              sx={{ bgcolor: Q.gh, py: 1.4, fontSize: 16, fontWeight: 800, "&:hover": { bgcolor: Q.gh } }}
            >
              {issues.length ? `Fill in: ${issues.join(", ")}` : checkedIn ? `Save changes · Room ${room.roomNumber}` : `✅ Check in · Room ${room.roomNumber}`}
            </Button>
          </Stack>
        )
      }
    >
      <Stack spacing={2}>
        {locked && (
          <Alert icon={<LockIcon />} severity="info">
            This day has been submitted. Only an admin can make changes.
          </Alert>
        )}
        <TextField
          label="Mobile number"
          value={mobile === "0" ? "" : mobile}
          onChange={(e) => set("mobileNumber", digits(e.target.value).slice(0, 10))}
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          disabled={locked}
          fullWidth
          autoFocus={!locked}
          InputProps={{ sx: { fontSize: 18 } }}
          helperText={mobile && mobile.length !== 10 ? `${mobile.length}/10 digits` : " "}
          error={!!mobile && mobile.length !== 10}
        />
        {guest?.found && (
          <Alert severity={guest.pendingAmount > 0 ? "warning" : "success"} sx={{ mt: -1.5 }}>
            <b>Returning guest: {guest.fullname}</b>
            <br />
            {guest.visits} previous visits · last {guest.lastVisit} (Room {guest.lastRoom}, {inr(guest.lastRate)})
            {guest.pendingAmount > 0 && (
              <>
                <br />
                <b>⚠ Previous due: {inr(guest.pendingAmount)}</b>
              </>
            )}
          </Alert>
        )}
        <TextField
          label="Guest name"
          value={f.fullname || ""}
          onChange={(e) => set("fullname", e.target.value)}
          disabled={locked}
          fullWidth
          InputProps={{ sx: { fontSize: 17 } }}
        />
        <Stack direction="row" spacing={1.5}>
          <Box sx={{ flex: 1.45, minWidth: 0 }}>
            <MoneyField label="Rate" value={f.rate} onChange={(v) => set("rate", v)} big disabled={locked} step={50} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stepper outlined label="Guests" value={num(f.noOfPeople)} onChange={(v) => !locked && set("noOfPeople", v)} />
          </Box>
        </Stack>
        {low && (
          <Alert severity="warning" sx={{ mt: -1 }}>
            Rate is {Math.round((1 - num(f.rate) / room.roomCost) * 100)}% below the room list price ({inr(room.roomCost)}). Is this
            correct?
          </Alert>
        )}
        <ChipChoice label="Guest type" options={TYPES} value={f.type} onChange={(v) => set("type", v)} color={Q.gh} disabled={locked} />
        <ChipChoice
          label="Payment"
          options={MODES}
          value={f.modeOfPayment}
          onChange={(v) => set("modeOfPayment", v)}
          color={Q.gh}
          danger={["UnPaid"]}
          disabled={locked}
        />
        <Stack direction="row" spacing={1.5}>
          <TimeBox label="Check-in time" value={f.checkInTime || "10:00 AM"} onChange={(v) => set("checkInTime", v)} disabled={locked} />
          <TimeBox label="Check-out time" value={f.checkOutTime || "11:00 AM"} onChange={(v) => set("checkOutTime", v)} disabled={locked} />
        </Stack>
        <MoneyField label="Discount on total bill (if any)" value={f.discount} onChange={(v) => set("discount", v)} disabled={locked} />

        {/* Stay: kitni raat / continue / checkout — alag collection, lock ka asar nahi */}
        {/* Checkout sirf check-in ke baad; naye check-in pe sirf niyam ki jaankari */}
        {!checkedIn && !stay?.checkout && (
          <Typography variant="caption" color={Q.muted}>
            Day count is automatic: check-in day = 1. If the guest is still here after 11:00 AM the next day, another day is added automatically.
          </Typography>
        )}
        {(checkedIn || stay?.checkout) && (
          <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, borderColor: "#C7D2FE", bgcolor: "#EEF2FF" }}>
            {stay?.checkout ? (
              <>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography fontWeight={800} color={Q.good}>
                    ✓ Checked out · {stay.checkout.time}
                  </Typography>
                  <Button size="small" onClick={() => onUndoCheckout?.(stay.checkout._id)}>
                    By mistake? Undo
                  </Button>
                </Stack>
                {NEXT_PERIOD[period] && (
                  <Button fullWidth variant="contained" onClick={() => onNewGuest?.()} sx={{ mt: 1, bgcolor: Q.gh, fontWeight: 800, "&:hover": { bgcolor: Q.gh } }}>
                    + New guest in this room ({PERIODS.find((p) => p.key === NEXT_PERIOD[period])?.label})
                  </Button>
                )}
              </>
            ) : f._stayId ? (
              <>
                <Typography fontWeight={800}>🔁 Continuing stay · Day {f._stayDay}</Typography>
                <Typography variant="caption" color={Q.muted} component="div" sx={{ mb: 1 }}>
                  Checked in on {f._stayStart}. Guest was still here after 11:00 AM, so today is counted automatically — just select payment.
                </Typography>
                <Button size="small" variant="contained" color="success" onClick={() => onCheckout?.(f)} sx={{ fontWeight: 800 }}>
                  ✅ Check out
                </Button>
              </>
            ) : (
              <Stack direction="row" spacing={1.5} alignItems="center">
                <Typography variant="caption" color={Q.muted} sx={{ flex: 1 }}>
                  Day count is automatic: check-in day = 1. If the guest is still here after 11:00 AM the next day, another day is added automatically. Only the owner can change it.
                </Typography>
                <Button variant="contained" color="success" onClick={() => onCheckout?.(f)} sx={{ fontWeight: 800, flexShrink: 0 }}>
                  ✅ Check out
                </Button>
              </Stack>
            )}
            {checkedIn && !stay?.checkout && (
              <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="outlined" onClick={() => onMove?.(f)} sx={{ fontWeight: 700 }}>
                  ⇄ Shift / swap room
                </Button>
                {!group && (
                  <Button size="small" variant="outlined" onClick={() => onMerge?.(f)} sx={{ fontWeight: 700 }}>
                    🔗 Merge bills
                  </Button>
                )}
              </Stack>
            )}
            {group && (
              <Alert severity="info" sx={{ mt: 1.25 }} action={<Button size="small" onClick={() => onUnmerge?.(group)}>Unmerge</Button>}>
                {group.mainRoom === room.roomNumber
                  ? `🔗 Merged bill (main room)${group.name ? ` · ${group.name}` : ""}: also includes Room ${group.rooms.join(", ")}. Invoice and check-out from here cover all rooms.`
                  : `🔗 This room's bill is merged with Room ${group.mainRoom}. Create the invoice and check out from Room ${group.mainRoom}.`}
              </Alert>
            )}
          </Paper>
        )}
        {/* Food bill (restaurant se) + extra charges — alag collection, lock ka asar nahi */}
        <RoomChargesPanel
          date={date}
          period={period}
          roomNo={room?.roomNumber}
          guestName={f.fullname}
          mobile={digits(f.mobileNumber)}
          charges={chargesFor(charges, period, room?.roomNumber)}
          roomRate={f.rate}
          discount={f.discount}
          roomPaid={!!f.modeOfPayment && f.modeOfPayment !== "UnPaid"}
          advance={advance}
          isAdmin={isAdmin}
          onChanged={onChargesChanged}
        />
        <RoomInvoiceButton date={date} period={period} roomNo={room?.roomNumber} roomType={room?.roomType} isAdmin={isAdmin} guestName={f.fullname} row={f} />
        {/* Optional: Govt/Police register ki details — alag collection mein, room entry pe koi asar nahi */}
        <GuestRegisterForm key={`${date}-${period}-${room?.roomNumber}`} date={date} period={period} roomNo={room?.roomNumber} seed={f} isAdmin={isAdmin} />
      </Stack>
    </EditorDialog>
  );
};

/* ---------------- Main ---------------- */
const GhQuickEntry = ({ date, isAdmin, canEdit = false }) => {
  const editor = isAdmin || canEdit; // submit ke baad badal sakta hai? (owner ya jise Super Admin ne "Edit" diya)
  const [rooms, setRooms] = useState(null);
  const [server, setServer] = useState({ loaded: false, entries: [] });
  const [status, setStatus] = useState(null);
  const [unpaid, setUnpaid] = useState([]);
  const [charges, setCharges] = useState([]);
  const [chargesPaidToday, setChargesPaidToday] = useState([]); // food / extra bill jo aaj wasool hue (kisi bhi din ke)
  const [ghToOffice, setGhToOffice] = useState(0); // aaj GH ne Office ko cash diya (Office ne record kiya)
  const [stayInfo, setStayInfo] = useState(null); // { continuing, started, checkouts, bookings, advances }
  const [regPending, setRegPending] = useState({ yesterday: [], today: [] });
  const [regEdit, setRegEdit] = useState(null); // pending item jiska form khula hai
  const loadRegPending = useCallback(
    () =>
      axios
        .get(`${API}/guest-register/pending/${date}`)
        .then(({ data }) => setRegPending(data.data || { yesterday: [], today: [] }))
        .catch(() => setRegPending({ yesterday: [], today: [] })),
    [date]
  );
  const loadStay = useCallback(
    () =>
      axios
        .get(`${API}/stay/day/${date}`)
        .then(({ data }) => setStayInfo({ ...data.data, _ok: true }))
        .catch(() => setStayInfo({ continuing: [], started: [], checkouts: [], bookings: [], advances: [] })),
    [date]
  );
  const loadCharges = useCallback(() => {
    axios
      .get(`${API}/counter/handover/${date}`)
      .then(({ data }) => setGhToOffice((data.data || []).filter((h) => h.from === "gh" && !h.cancelled).reduce((t, h) => t + num(h.amount), 0)))
      .catch(() => setGhToOffice(0));
    axios
      .get(`${API}/room-charges/paid-on/${date}`)
      .then(({ data }) => setChargesPaidToday(data.data || []))
      .catch(() => setChargesPaidToday([]));
    return axios
      .get(`${API}/room-charges/day/${date}`)
      .then(({ data }) => setCharges(data.data || []))
      .catch(() => setCharges([]));
  }, [date]);
  const [period, setPeriod] = useState("day");
  const [tab, setTab] = useState("rooms"); // rooms | jama
  const [editing, setEditing] = useState(null); // roomNo
  const [draft, setDraft, clearDraft] = useDraft(`qe-gh-${date}`, EMPTY);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [jamaPick, setJamaPick] = useState(null);
  const [jamaQuery, setJamaQuery] = useState("");
  const [error, setError] = useState("");
  const seededFor = useRef("");

  const load = useCallback(async () => {
    setError("");
    setServer({ loaded: false, entries: [] });
    try {
      const [r, e, s, u] = await Promise.all([
        rooms ? Promise.resolve({ data: { data: rooms } }) : axios.get(`${API}/room`),
        axios.get(`${API}/entry/get-entry/${date}`),
        axios.get(`${API}/quick/day-status/${date}`).catch(() => ({ data: {} })),
        axios.get(`${API}/entry/get-unpaid-entries`).catch(() => ({ data: { data: [] } })),
      ]);
      if (!rooms) setRooms([...(r.data.data || [])].sort((a, b) => a.roomNumber - b.roomNumber));
      setServer({ loaded: true, entries: e.data.data || [] });
      setStatus(s.data?.data?.gh || null);
      setUnpaid(u.data.data || []);
      loadCharges();
      loadStay();
      loadRegPending();
    } catch (err) {
      setError(apiError(err));
      setServer({ loaded: true, entries: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  useEffect(() => {
    seededFor.current = "";
    load();
  }, [load]);

  const submitted = server.entries.length > 0;
  const locked = submitted && !editor;

  // Submitted din ho to server ka data hi dikhao (admin ke edit ke liye bhi wahi shuruaat)
  useEffect(() => {
    if (!server.loaded || !submitted || seededFor.current === date) return;
    seededFor.current = date;
    const roomsMap = {};
    const jama = [];
    server.entries.forEach((e) => {
      if (ROOM_PERIODS.includes(e.period)) {
        roomsMap[keyOf(e.period, e.roomNo)] = { ...e, mobileNumber: digits(e.mobileNumber), _orig: e };
      } else if (e.period === "UnPaid") {
        jama.push({ ...e, _orig: e });
      }
    });
    setDraft({ rooms: roomsMap, jama });
  }, [server, submitted, date, setDraft]);

  // 🔁 Ruke hue guest (continue stay): aaj ke Day slot mein apne aap bharo — staff sirf payment chune
  useEffect(() => {
    // submit ho chuke din pe sirf admin ke liye (wo Update dabayega)
    if (!server.loaded || (submitted && !editor) || !stayInfo?.continuing?.length) return;
    if (submitted && seededFor.current !== date) return;
    setDraft((d) => {
      const dismissed = d._dismissed || [];
      const rooms = { ...d.rooms };
      let changed = false;
      stayInfo.continuing.forEach((c) => {
        const k = keyOf("day", c.roomNo);
        if (rooms[k] || dismissed.includes(c._id)) return;
        const g = c.guest || {};
        rooms[k] = {
          fullname: g.fullname,
          mobileNumber: g.mobileNumber,
          type: g.type,
          noOfPeople: g.noOfPeople,
          rate: g.rate,
          discount: g.discount,
          checkInTime: g.checkInTime || "10:00 AM",
          checkOutTime: g.checkOutTime || "10:00 AM",
          modeOfPayment: "",
          _stayId: c._id,
          _stayDay: c.dayNo,
          _stayStart: c.startDate,
        };
        changed = true;
      });
      return changed ? { ...d, rooms } : d;
    });
    }, [server.loaded, submitted, stayInfo, setDraft, editor, date]);

  // 🔗 Aaj ke check-in jo doosre phone / computer se hue (server pe stay hai, is screen ke draft mein nahi) → yahan bhi bharo
  useEffect(() => {
    if (!server.loaded || (submitted && !editor) || !stayInfo?._ok || !stayInfo?.started?.length) return;
    if (submitted && seededFor.current !== date) return;
    setDraft((d) => {
      const dismissed = d._dismissed || [];
      const rooms = { ...d.rooms };
      let changed = false;
      stayInfo.started.forEach((st) => {
        const k = keyOf(st.period, st.roomNo);
        if (rooms[k] || dismissed.includes(String(st._id)) || !st.guest) return;
        // checkout hone ke baad usi slot mein naya guest ho sakta hai — wo alag slot mein aata hai, isliye yahan sirf khaali slot
        const g = st.guest;
        rooms[k] = {
          fullname: g.fullname || "",
          mobileNumber: g.mobileNumber || "",
          type: g.type || "",
          noOfPeople: g.noOfPeople || 0,
          rate: g.rate || 0,
          discount: g.discount || 0,
          checkInTime: g.checkInTime || "",
          checkOutTime: g.checkOutTime || "11:00 AM",
          modeOfPayment: g.modeOfPayment || "",
          ...(st.bookingId ? { _bookingId: st.bookingId } : {}),
        };
        changed = true;
      });
      return changed ? { ...d, rooms } : d;
    });
  }, [server.loaded, submitted, stayInfo, setDraft, editor, date]);

  const others = useMemo(
    () => server.entries.filter((e) => !ROOM_PERIODS.includes(e.period) && e.period !== "UnPaid"),
    [server.entries]
  );

  const room = rooms?.find((r) => r.roomNumber === editing);
  // Screen pe bache purane draft rooms jinka database mein koi check-in (stay) nahi — jaise test data hatane ke baad
  const orphanKeys = useMemo(() => {
    if (!server.loaded || submitted || !stayInfo?._ok) return [];
    const ids = new Set([...(stayInfo.continuing || []), ...(stayInfo.dueOut || []), ...(stayInfo.started || [])].map((x) => String(x._id)));
    const slots = new Set((stayInfo.started || []).map((x) => keyOf(x.period, x.roomNo)));
    return Object.entries(draft.rooms || {})
      .filter(([k, r]) => r && (r._stayId ? !ids.has(String(r._stayId)) : (r.fullname || num(r.rate)) && !slots.has(k)))
      .map(([k]) => k);
  }, [server.loaded, submitted, stayInfo, draft.rooms]);
  const dropOrphans = () => {
    setDraft((d) => {
      const next = { ...d.rooms };
      orphanKeys.forEach((k) => delete next[k]);
      return { ...d, rooms: next };
    });
    toast.success(`${orphanKeys.length} old room ${orphanKeys.length === 1 ? "entry" : "entries"} removed from this screen`);
  };
  const bookingFor = (roomNo) => (stayInfo?.bookings || []).find((b) => b.status === "booked" && b.roomNo === roomNo);
  const editingInitial = useMemo(() => {
    if (!room) return null;
    const bk = !draft.rooms[keyOf(period, room.roomNumber)] && bookingFor(room.roomNumber);
    if (bk)
      return {
        rate: num(bk.rate),
        noOfPeople: bk.people || 1,
        type: "",
        modeOfPayment: "",
        fullname: bk.guestName,
        mobileNumber: bk.mobile || "",
        checkInTime: nowTime(),
        checkOutTime: "11:00 AM",
        discount: 0,
        _bookingId: bk._id,
      };
    return (
      draft.rooms[keyOf(period, room.roomNumber)] || {
        rate: num(room.roomCost), // base price apne aap (badal sakte hain)
        noOfPeople: 0,
        type: "",
        modeOfPayment: "",
        fullname: "",
        mobileNumber: "",
        checkInTime: nowTime(),
        checkOutTime: "11:00 AM",
        discount: 0,
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, draft.rooms, period, stayInfo]);

  const saveRoom = (f) => {
    const roomNo = room.roomNumber;
    setDraft((d) => ({ ...d, rooms: { ...d.rooms, [keyOf(period, roomNo)]: { ...(d.rooms[keyOf(period, roomNo)] || {}), ...f } } }));
    setEditing(null);
    // Stay plan / booking check-in (alag collection, turant save)
    if (f._stayId) return;
    const started = (stayInfo?.started || []).find((x) => x.roomNo === roomNo && x.period === period);
    // Submit ho chuke din ki purani row (server se aayi) badli → naya stay mat banao (warna ruka hua "bhoot" guest roz dikhta)
    const prevRow = draft.rooms[keyOf(period, roomNo)];
    if (!started && (f._orig || prevRow?._orig)) return;
    const nights = started?.nights || 1; // din apne aap gine jaate hain (checkout se)
    const jobs = [];
    if (f._bookingId) jobs.push(axios.put(`${API}/booking/${f._bookingId}/checkin`, { date, period, roomNo }));
    // har check-in ka plan (default 1 raat = agli subah checkout) taaki due-out pata chale
    jobs.push(
        axios.put(`${API}/stay/plan`, {
          startDate: date,
          period,
          roomNo,
          nights,
          bookingId: f._bookingId || "",
          guest: { fullname: f.fullname, mobileNumber: digits(f.mobileNumber), type: f.type, noOfPeople: num(f.noOfPeople), rate: num(f.rate), discount: num(f.discount), checkInTime: f.checkInTime, checkOutTime: f.checkOutTime, modeOfPayment: f.modeOfPayment || "" },
        })
      );
    if (jobs.length)
      Promise.all(jobs)
        .then(() => loadStay())
        .catch((e) => toast.error(`Room saved, but could not save stay/booking: ${apiError(e)}`));
  };
  // Check-in hataana: wajah zaroori, server pe footprint (owner dekhta hai)
  const [removeAsk, setRemoveAsk] = useState(null); // { roomNo, period, row }
  const clearRoom = () => {
    const row = draft.rooms[keyOf(period, room.roomNumber)];
    setRemoveAsk({ roomNo: room.roomNumber, period, row });
  };
  const doRemove = async (reason) => {
    const { roomNo, period: p, row } = removeAsk;
    // eslint-disable-next-line no-unused-vars
    const snap = Object.fromEntries(Object.entries(row || {}).filter(([k]) => !k.startsWith("_")));
    await axios.post(`${API}/stay/remove`, { date, period: p, roomNo, reason, stayId: row?._stayId || "", row: { ...snap, mobileNumber: digits(snap.mobileNumber), rate: num(snap.rate) } });
    setDraft((d) => {
      const next = { ...d.rooms };
      delete next[keyOf(p, roomNo)];
      return { ...d, rooms: next, _dismissed: row?._stayId ? [...(d._dismissed || []), row._stayId] : d._dismissed };
    });
    setRemoveAsk(null);
    setEditing(null);
    toast.success(`Room ${roomNo} entry removed (recorded for the owner)`);
    loadStay();
  };

  // ✅ Checkout: guest gaya → room khaali, usi din naya guest agle slot mein
  // 💰 Bina payment checkout nahi: pehle hisaab check (owner chahe to phir bhi kar sakta hai)
  const [payBlock, setPayBlock] = useState(null);
  const [moveDlg, setMoveDlg] = useState(null); // { fromRoom, period, guest }
  const [mergeDlg, setMergeDlg] = useState(null); // { mainRoom }
  const groupOf = (roomNo) => (stayInfo?.groups || []).find((g) => g.mainRoom === roomNo || (g.rooms || []).includes(roomNo));
  const rowOfRoom = (roomNo) => {
    for (const pk of ["day", "extraDay", "night", "extraNight"]) {
      const r = draft.rooms[keyOf(pk, roomNo)];
      if (r && isTouched(r)) return [pk, r];
    }
    return [null, null];
  };
  const doCheckout = async (roomNo, p, f, stayId, fromDate, force) => {
    const grp = groupOf(roomNo);
    if (grp && grp.mainRoom !== roomNo) {
      toast.error(`Room ${roomNo}'s bill is merged with Room ${grp.mainRoom} — check out from Room ${grp.mainRoom}.`);
      return false;
    }
    if (grp && !force) {
      // poore group ka hisaab ek saath
      const jk = new Set(draft.jama.map((j) => `${j.createDate}|${j.roomNo}|${j.mobileNumber}`));
      const all = [{ roomNo, row: f, from: fromDate || f._stayStart || date, today: stayId && !f._stayId ? [] : [f] }];
      grp.rooms.forEach((rn) => {
        const [, r] = rowOfRoom(rn);
        all.push({ roomNo: rn, row: r, from: r?._stayStart || date, today: r ? [r] : [] });
      });
      let due = 0;
      const lines = [];
      for (const x of all) {
        const d = await computeDues({ roomNo: x.roomNo, from: x.from, to: date, unpaid, todayRows: x.today, jamaKeys: jk });
        if (d.needMode) {
          toast.error(`Room ${x.roomNo}: select payment (Cash / Card / PPS / PPC / Unpaid) first`);
          return false;
        }
        due += d.due;
        d.lines.forEach((l) => lines.push(`Room ${x.roomNo}: ${l}`));
      }
      if (due > 0) {
        setPayBlock({ roomNo, guest: `${f.fullname} (merged bill)`, dues: { due, lines } });
        return false;
      }
      // pehle baaki rooms, phir main room
      for (const rn of grp.rooms) {
        const [pk, r] = rowOfRoom(rn);
        await axios.post(`${API}/stay/checkout`, { date, period: pk || "day", roomNo: rn, stayId: r?._stayId || "", guest: { fullname: r?.fullname || "" } });
      }
      await axios.put(`${API}/stay/group/${grp._id}/close`, {});
      return doCheckout(roomNo, p, f, stayId, fromDate, true);
    }
    if (!force) {
      const dues = await computeDues({
        roomNo,
        from: fromDate || f._stayStart || date,
        to: date,
        unpaid,
        todayRows: stayId && !f._stayId ? [] : [f],
        jamaKeys: new Set(draft.jama.map((j) => `${j.createDate}|${j.roomNo}|${j.mobileNumber}`)),
      });
      if (dues.needMode) {
        toast.error("Select payment (Cash / Card / PPS / PPC / Unpaid) before check-out");
        setEditing(roomNo);
        return false;
      }
      if (dues.due > 0) {
        setPayBlock({ roomNo, guest: f.fullname, dues });
        return false;
      }
    }
    const { data } = await axios.post(`${API}/stay/checkout`, {
      date,
      period: p,
      roomNo,
      stayId: stayId || f._stayId || "",
      ...(date === dayjs().format(DATE_FMT) ? { time: dayjs().format("hh:mm A") } : {}), // purane din: server poora din ginta hai
      guest: { fullname: f.fullname, mobileNumber: digits(f.mobileNumber), type: f.type, noOfPeople: num(f.noOfPeople), rate: num(f.rate), discount: num(f.discount) },
    });
    // 11:00 AM se pehle gaya → aaj ka charge nahi, auto-bhara row hata do
    if (f._stayId && !data?.billedToday)
      setDraft((d) => {
        const next = { ...d.rooms };
        delete next[keyOf(p, roomNo)];
        return { ...d, rooms: next, _dismissed: [...(d._dismissed || []), f._stayId] };
      });
    const next = PERIODS.find((x) => x.key === NEXT_PERIOD[p])?.label;
    toast.success(`Room ${roomNo} checked out${f._stayId || stayId ? (data?.billedToday ? " (after 11:00 AM — today is counted)" : " (before 11:00 AM — no charge today)") : ""}${next ? ` · new guest goes in ${next}` : ""}`);
    loadStay();
    return true;
  };
  // 📅 Calendar se check-out: payment ho chuka ho to seedha; warna room khol kar payment chunwao
  const PAID = ["Cash", "Card", "PPS", "PPC"];
  const calendarCheckout = async (b) => {
    const grp = groupOf(b.roomNo);
    const rn = grp ? grp.mainRoom : b.roomNo;
    const p = b.from === date ? b.period || "day" : "day";
    const [pk, row] = grp ? rowOfRoom(rn) : [p, draft.rooms[keyOf(p, rn)]];
    const openRoom = (msg) => {
      setTab("rooms");
      setPeriod(pk || p);
      setEditing(rn);
      toast(msg, { icon: "💳" });
      return false;
    };
    try {
      if (!row || !isTouched(row)) {
        // kal ka guest, aaj 11 baje se pehle ja raha (aaj ka kiraya nahi) → seedha hisaab
        if (!grp && (stayInfo?.dueOut || []).some((x) => String(x._id) === String(b.id))) return await doCheckout(rn, "day", { fullname: b.name }, b.id, b.from);
        return openRoom(`Room ${rn}: select payment, then press Check out`);
      }
      if (!PAID.includes(row.modeOfPayment)) return openRoom(row.modeOfPayment === "UnPaid" ? `Room ${rn} is Unpaid — collect payment, then check out` : `Room ${rn}: select payment, then press Check out`);
      return await doCheckout(rn, pk || p, row, undefined, row._stayStart || b.from || date);
    } catch (e) {
      toast.error(apiError(e));
      return false;
    }
  };
  const guestSnap = (r) => (r ? { fullname: r.fullname, mobileNumber: digits(r.mobileNumber), type: r.type, noOfPeople: num(r.noOfPeople), rate: num(r.rate), discount: num(r.discount), checkInTime: r.checkInTime, checkOutTime: r.checkOutTime } : null);
  const openMove = (f) => {
    if (submitted && !editor) return toast.error("This day is already submitted — ask the owner to change rooms.");
    setEditing(null);
    setMoveDlg({ fromRoom: room.roomNumber, period, guest: guestSnap(f) });
  };
  const afterMove = (type, toRoom, pInB, pInA) => {
    const { fromRoom, period: p } = moveDlg;
    const pb = pInB || p;
    const pa = pInA || p;
    const strip = (r) => (r ? Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith("_stay"))) : r);
    setDraft((d) => {
      const rooms = { ...d.rooms };
      const a = rooms[keyOf(p, fromRoom)];
      const b = rooms[keyOf(p, toRoom)];
      delete rooms[keyOf(p, fromRoom)];
      if (type === "swap") delete rooms[keyOf(p, toRoom)];
      if (a) rooms[keyOf(pb, toRoom)] = strip(a);
      if (type === "swap" && b) rooms[keyOf(pa, fromRoom)] = strip(b);
      return { ...d, rooms };
    });
    setMoveDlg(null);
    loadStay();
    loadCharges();
    loadRegPending();
  };
  const unmerge = async (g) => {
    try {
      await axios.put(`${API}/stay/group/${g._id}/close`, {});
      toast.success("Bills unmerged");
      setEditing(null);
      loadStay();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const checkoutRoom = async (f) => {
    try {
      const roomNo = room.roomNumber;
      saveRoom({ ...f }); // chuna hua payment draft mein bhi (continue stay ke liye bhi)
      await doCheckout(roomNo, period, f, undefined, f._stayStart || date);
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const undoCheckout = async (id) => {
    try {
      await axios.put(`${API}/stay/undo-checkout/${id}`, {});
      toast.success("Checkout undone");
      loadStay();
    } catch (e) {
      toast.error(apiError(e));
    }
  };
  const checkoutOf = (p, roomNo) => {
    const row = draft.rooms[keyOf(p, roomNo)];
    return (stayInfo?.checkouts || []).find(
      (x) => x.roomNo === roomNo && x.period === p && (!row || !isTouched(row) || (row._stayId ? String(x._id) === String(row._stayId) : x.startDate === date))
    );
  };
  const dueOutFor = (roomNo) => (stayInfo?.dueOut || []).find((x) => x.roomNo === roomNo && !(stayInfo?.checkouts || []).some((c) => String(c._id) === String(x._id)));
  const advanceFor = (p, roomNo, rowOverride) => {
    const row = rowOverride || draft.rooms[keyOf(p, roomNo)];
    return (stayInfo?.bookings || [])
      .filter((b) => (b.status === "checkedin" && b.checkedIn?.roomNo === roomNo && b.checkedIn?.period === p) || (row?._bookingId && row._bookingId === b._id))
      .reduce((s, b) => s + advOf(b), 0);
  };
  const advToday = (stayInfo?.advances || []).reduce((s, a) => s + num(a.amount), 0);
  const unassignedToday = (stayInfo?.bookings || []).filter((b) => b.status === "booked" && !b.roomNo);

  // ⏰ Subah 11 baje tak checkout ka time: in guests ko "Checked out" karo, warna 11 ke baad aaj ka din apne aap gina jaata hai
  const todayStr = dayjs().format(DATE_FMT);
  const yesterdayStr = dayjs().subtract(1, "day").format(DATE_FMT);
  const settleDay = date === todayStr || date === yesterdayStr; // sirf chalu din pe niyam (purane din admin ke liye khule)
  const unsettled = (() => {
    if (!rooms || !stayInfo || !settleDay) return [];
    return rooms
      .map((rm) => dueOutFor(rm.roomNumber))
      .filter(Boolean)
      .map((x) => ({ roomNo: x.roomNo, stayId: x._id, startDate: x.startDate, nights: x.nights, dueTime: x.dueTime, row: { ...(x.guest || {}) } }));
  })();
  // 📄 Kal check-in hue guests ki registration aaj ke settlement se pehle zaroori
  const regBlock = settleDay ? regPending.yesterday || [] : [];
  const hourNow = dayjs().hour();
  const settleBanner =
    date === todayStr && hourNow >= 21
      ? { tone: "info", text: `Day closes at 12:00 AM. Settle every room and submit by ${SETTLE_GRACE_HOURS}:00 AM.` }
      : date === yesterdayStr && hourNow < SETTLE_GRACE_HOURS
      ? { tone: "warning", text: `Yesterday is still open for settlement until ${SETTLE_GRACE_HOURS}:00 AM. Settle all rooms and submit now.` }
      : null;

  /* ----- counts & totals ----- */
  const summary = useMemo(() => {
    const per = {};
    const byMode = {};
    let total = 0;
    let incomplete = [];
    Object.entries(draft.rooms).forEach(([k, r]) => {
      const [p, roomNo] = k.split("|");
      if (!isTouched(r)) return;
      if (rowIssues(r).length) {
        incomplete.push(`${PERIODS.find((x) => x.key === p)?.label} ${roomNo}`);
        return;
      }
      per[p] = (per[p] || 0) + 1;
      total += num(r.rate);
      const m = r.modeOfPayment || "UnPaid";
      byMode[m] = byMode[m] || { amt: 0, rooms: 0, jama: 0 };
      byMode[m].amt += num(r.rate);
      byMode[m].rooms += 1;
    });
    const jamaTotal = draft.jama.reduce((s, j) => s + num(j.rate), 0);
    // purana baaki jo aaj mila: jis mode mein mila usi mein
    draft.jama.forEach((j) => {
      const m = j.modeOfPayment || "Cash";
      byMode[m] = byMode[m] || { amt: 0, rooms: 0, jama: 0 };
      byMode[m].amt += num(j.rate);
      byMode[m].jama += 1;
    });
    return { per, total, jamaTotal, incomplete, byMode, filled: Object.values(per).reduce((a, b) => a + b, 0) };
  }, [draft]);

  // 💵 GH galla: har mode mein aaj sach mein kitna aaya
  //   rooms + purana baaki (jama) + aaj mila booking advance − aaj check-in hue room ka pehle se mila advance + extra charges (GH par wasool)
  //   Food bill (restaurant ka) alag: Cash wala Restaurant ko dena hai, PP restaurant ke UPI mein
  const cashBox = useMemo(() => {
    const modes = ["Cash", "Card", "PPS", "PPC"];
    const o = Object.fromEntries(modes.map((m) => [m, { rooms: 0, adv: 0, extra: 0 }]));
    Object.entries(summary.byMode).forEach(([m, x]) => o[m] && (o[m].rooms += x.amt));
    (stayInfo?.advances || []).forEach((a) => o[a.mode] && (o[a.mode].adv += num(a.amount)));
    let advUsed = 0;
    Object.entries(draft.rooms).forEach(([, r]) => {
      if (!r?._bookingId || !r.modeOfPayment || r.modeOfPayment === "UnPaid" || !o[r.modeOfPayment]) return;
      const bk = (stayInfo?.bookings || []).find((b) => b._id === r._bookingId);
      const a = Math.min(advOf(bk), num(r.rate));
      if (a > 0) {
        o[r.modeOfPayment].adv -= a;
        advUsed += a;
      }
    });
    const atGh = chargesPaidToday.filter((c) => c.paidAt !== "rest" && c.paidAt !== "office");
    atGh.filter((c) => c.kind === "extra").forEach((c) => o[c.paidMode] && (o[c.paidMode].extra += num(c.amount)));
    const foodCash = atGh.filter((c) => c.kind === "food" && c.paidMode === "Cash").reduce((t, c) => t + num(c.amount), 0);
    const foodCashGiven = atGh.filter((c) => c.kind === "food" && c.paidMode === "Cash" && c.handedOver).reduce((t, c) => t + num(c.amount), 0);
    const rows = modes.map((m) => [m, o[m].rooms, o[m].adv, o[m].extra]);
    return { rows, advUsed, foodCash, foodCashGiven, any: rows.some((r) => r[1] || r[2] || r[3]) || foodCash > 0 };
  }, [summary, stayInfo, draft.rooms, chargesPaidToday]);

  /* ----- build payload exactly like old EntryPage ----- */
  const buildEntries = () => {
    const now = new Date().toString();
    const list = [];
    PERIODS.forEach((p) => {
      rooms.forEach((rm, idx) => {
        const r = draft.rooms[keyOf(p.key, rm.roomNumber)];
        if (!r || !isTouched(r) || rowIssues(r).length) return;
        const orig = r._orig || {};
        const mode = r.modeOfPayment;
        const keepPaid = orig.modeOfPayment === "UnPaid" && mode === "UnPaid";
        // eslint-disable-next-line no-unused-vars
        const clean = Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith("_")));
        list.push({
          ...orig,
          ...clean,
          id: orig.id || `${p.idLabel} - ${idx + 1}`,
          roomNo: rm.roomNumber,
          cost: rm.roomCost,
          roomType: rm.roomType,
          rate: num(r.rate),
          noOfPeople: num(r.noOfPeople),
          discount: num(r.discount),
          mobileNumber: Number(digits(r.mobileNumber)) || 0,
          fullname: String(r.fullname).trim(),
          checkInTime: r.checkInTime || "10:00 AM",
          checkOutTime: r.checkOutTime || "10:00 AM",
          period: p.key,
          date,
          createDate: orig.createDate || date,
          updatedDateTime: now,
          isPaid: keepPaid ? !!orig.isPaid : mode !== "UnPaid",
          paidDate: orig.paidDate || "",
        });
      });
    });
    // eslint-disable-next-line no-unused-vars
    const jama = draft.jama.map(({ _orig, ...j }) => ({ ...j, updatedDateTime: j.updatedDateTime || now }));
    return [...list, ...jama, ...others];
  };

  const submitting = useRef(false);
  const submit = async () => {
    if (submitting.current) return; // double-click / do baar nahi
    submitting.current = true;
    setConfirm(false);
    setBusy(true);
    try {
      const entries = buildEntries();
      if (!entries.length) {
        toast.error("No entries filled");
        return;
      }
      const body = { entries: JSON.stringify(entries), date };
      if (submitted) await axios.put(`${API}/entry/update-entry/${date}`, body);
      else await axios.post(`${API}/entry/create-entry`, body);
      toast.success(submitted ? "GH entry updated" : "GH entry submitted");
      clearDraft();
      setDraft(EMPTY);
      seededFor.current = "";
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  };

  /* ----- Jama (pending paisa aaya) ----- */
  // asli UnPaid row ki pehchaan _id se (ek hi din/room/mobile ki do rows alag rahein)
  const jamaIds = new Set(draft.jama.filter((j) => j.srcId).map((j) => String(j.srcId)));
  const jamaOldKeys = new Set(draft.jama.filter((j) => !j.srcId).map((j) => `${j.createDate}|${j.roomNo}|${j.mobileNumber}`));
  const isCollected = (u) => (u._id && jamaIds.has(String(u._id))) || jamaOldKeys.has(`${u.createDate}|${u.roomNo}|${u.mobileNumber}`);
  const pendingList = unpaid
    .filter((u) => !isCollected(u))
    .filter((u) => {
      const q = jamaQuery.trim().toLowerCase();
      return !q || `${u.fullname} ${u.mobileNumber} ${u.roomNo}`.toLowerCase().includes(q);
    })
    .sort((a, b) => dayjs(b.createDate, DATE_FMT).valueOf() - dayjs(a.createDate, DATE_FMT).valueOf()); // naya din pehle

  // Collections ka total: kul baaki (search se alag), aaj mila (mode-wise)
  const pendingAll = unpaid.filter((u) => !isCollected(u));
  const pendingAllTotal = pendingAll.reduce((t, u) => t + num(u.rate), 0);
  const pendingShownTotal = pendingList.reduce((t, u) => t + num(u.rate), 0);
  const jamaByMode = draft.jama.reduce((m, j) => ({ ...m, [j.modeOfPayment]: (m[j.modeOfPayment] || 0) + num(j.rate) }), {});

  const addJama = (u, mode) => {
    setDraft((d) => ({
      ...d,
      jama: [
        ...d.jama,
        {
          id: `Jama - ${d.jama.length + 1}-${Date.now() % 100000}`,
          srcId: u._id || "", // asli UnPaid row (server sirf usi ko paid karega)
          date: u.date,
          roomNo: u.roomNo,
          fullname: u.fullname,
          mobileNumber: u.mobileNumber,
          rate: u.rate,
          modeOfPayment: mode,
          period: "UnPaid",
          createDate: u.createDate,
          cost: u.cost,
          roomType: u.roomType,
          type: u.type,
          checkInTime: u.checkInTime || "10:00 AM",
          checkOutTime: u.checkOutTime || "10:00 AM",
          noOfPeople: u.noOfPeople,
          discount: u.discount || 0,
          paidDate: dayjs().format(DATE_FMT),
          isPaid: true,
        },
      ],
    }));
    setJamaPick(null);
  };
  const removeJama = (i) => setDraft((d) => ({ ...d, jama: d.jama.filter((_, idx) => idx !== i) }));

  /* ----- render ----- */
  if (error && !rooms) return <Alert severity="error">{error}</Alert>;
  if (!rooms || !server.loaded)
    return (
      <Grid container spacing={1.5}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Grid key={i} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
            <Skeleton variant="rounded" height={104} />
          </Grid>
        ))}
      </Grid>
    );

  const periodFilled = (p) => rooms.filter((r) => {
    const row = draft.rooms[keyOf(p, r.roomNumber)];
    return row && isTouched(row) && !rowIssues(row).length;
  }).length;
  const anyDraft = Object.keys(draft.rooms).length > 0 || draft.jama.length > 0;

  return (
    <Box sx={{ pb: { xs: 16, md: 0 } }}>
      {/* status */}
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mb: 1.5 }} useFlexGap>
        {submitted ? (
          <StatusPill tone={locked ? "lock" : "good"}>
            {locked ? "🔒 " : "✓ "}Submitted{status?.by ? ` · ${status.by}` : ""}
            {status?.at ? ` · ${dayjs(status.at).format("hh:mm A")}` : ""}
          </StatusPill>
        ) : anyDraft ? (
          <StatusPill tone="info">Draft saved on this device · not submitted yet</StatusPill>
        ) : (
          <StatusPill tone="warn">Today's GH entry not done yet</StatusPill>
        )}
        {status?.updatedBy && <StatusPill tone="lock">Edit: {status.updatedBy}</StatusPill>}
        <Box sx={{ flex: 1 }} />
        <Button
          size="small"
          variant={tab === "calendar" ? "contained" : "outlined"}
          onClick={() => setTab((t) => (t === "calendar" ? "rooms" : "calendar"))}
          sx={{ fontWeight: 800, ...(tab === "calendar" ? { bgcolor: Q.gh, "&:hover": { bgcolor: Q.gh } } : { color: Q.gh, borderColor: Q.gh }) }}
        >
          📅 {tab === "calendar" ? "Back to rooms" : "Room calendar"}
        </Button>
        {advToday > 0 && (
          <StatusPill tone="good">
            💰 Advance received today {inr(advToday)} (
            {Object.entries((stayInfo?.advances || []).reduce((m, a) => ({ ...m, [a.mode]: (m[a.mode] || 0) + num(a.amount) }), {}))
              .map(([m, v]) => `${m} ${inr(v)}`)
              .join(", ")}
            )
          </StatusPill>
        )}
      </Stack>
      {unassignedToday.length > 0 && (
        <Alert severity="info" sx={{ mb: 1.5 }}>
          Bookings arriving today (no room assigned): {unassignedToday.map((b) => `${b.guestName} (${b.people} guests)`).join(", ")} — assign a room via &quot;Edit&quot; in the &quot;Booking&quot; tab.
        </Alert>
      )}
      {orphanKeys.length > 0 && (
        <Alert
          severity="warning"
          sx={{ mb: 1.5 }}
          action={
            <Button color="inherit" size="small" onClick={dropOrphans} sx={{ fontWeight: 800 }}>
              Remove
            </Button>
          }
        >
          {orphanKeys.length} room {orphanKeys.length === 1 ? "entry is" : "entries are"} only on this screen and {orphanKeys.length === 1 ? "has" : "have"} no check-in record in the system (Room {orphanKeys.map((k) => k.split("|")[1]).join(", ")}). Remove {orphanKeys.length === 1 ? "it" : "them"}?
        </Alert>
      )}
      {locked && (
        <Alert severity="info" icon={<LockIcon />} sx={{ mb: 1.5 }}>
          This day's entry has been submitted. Report any mistakes to the admin.
        </Alert>
      )}

      {/* tabs */}
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={tab === "jama" || tab === "booking" ? tab : period}
        onChange={(_, v) => {
          if (!v) return;
          if (v === "jama" || v === "booking") setTab(v);
          else {
            setTab("rooms");
            setPeriod(v);
          }
        }}
        sx={{
          mb: 1.5,
          bgcolor: "#fff",
          "& .MuiToggleButton-root": { py: 1.1, fontWeight: 800, fontSize: 14, textTransform: "none", lineHeight: 1.2 },
          "& .Mui-selected": { bgcolor: `${Q.gh} !important`, color: "#fff !important" },
        }}
      >
        {PERIODS.map((p) => (
          <ToggleButton key={p.key} value={p.key}>
            <Box>
              {p.label}
              <Box component="span" sx={{ display: "block", fontSize: 11, fontWeight: 600, opacity: 0.85 }}>
                {periodFilled(p.key)} rooms
              </Box>
            </Box>
          </ToggleButton>
        ))}
        <ToggleButton value="booking">
          <Box>
            Booking
            <Box component="span" sx={{ display: "block", fontSize: 11, fontWeight: 600, opacity: 0.85 }}>
              📅 advance
            </Box>
          </Box>
        </ToggleButton>
        <ToggleButton value="jama">
          <Box>
            Collections
            <Box component="span" sx={{ display: "block", fontSize: 11, fontWeight: 600, opacity: 0.85 }}>
              {draft.jama.length ? `${draft.jama.length} received` : `${unpaid.length} due`}
            </Box>
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>

      {tab === "calendar" ? (
        <RoomCalendar
          pageDate={date}
          isAdmin={isAdmin}
          onOpenRoom={(rn, p) => {
            setTab("rooms");
            setPeriod(p || "day");
            setEditing(rn);
          }}
          onCheckout={calendarCheckout}
        />
      ) : tab === "booking" ? (
        <BookingsPanel rooms={rooms} isAdmin={isAdmin} onChanged={loadStay} />
      ) : tab === "rooms" ? (
        <>
          {settleBanner && (
            <Alert severity={settleBanner.tone} sx={{ mb: 1.5 }}>
              {settleBanner.text}
            </Alert>
          )}
          {unsettled.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 1.5, borderRadius: 3, borderColor: "#FCD34D", bgcolor: "#FFFBEB" }}>
              <Typography fontWeight={800}>⏰ Checkout due today · {unsettled.length} room{unsettled.length > 1 ? "s" : ""}</Typography>
              <Typography variant="caption" color={Q.muted} component="div" sx={{ mb: 1 }}>
                Checkout time is 11:00 AM. Mark guests who have left as checked out. Anyone still here after 11:00 AM is automatically counted for today.
              </Typography>
              {unsettled.map((u, i) => (
                <Stack key={`${u.period}-${u.roomNo}`} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ py: 0.75, borderTop: i ? `1px solid ${Q.line}` : "none" }}>
                  <Typography sx={{ flex: 1 }} fontWeight={700}>
                    Room {u.roomNo} · {u.row.fullname || "—"}{" "}
                    <Typography component="span" variant="caption" color={Q.muted}>
                      (due {u.dueTime})
                    </Typography>
                  </Typography>
                  <Stack direction="row" spacing={1}>
                    <Button size="small" variant="contained" color="success" onClick={() => doCheckout(u.roomNo, "day", u.row, u.stayId, u.startDate).catch((e) => toast.error(apiError(e)))} sx={{ fontWeight: 700 }}>
                      ✅ Checked out
                    </Button>
                  </Stack>
                </Stack>
              ))}
            </Paper>
          )}
          {regBlock.length > 0 && (
            <Alert
              severity="error"
              sx={{ mb: 1.5 }}
              action={
                <Button color="inherit" size="small" onClick={() => document.getElementById("gh-reg-panel")?.scrollIntoView({ behavior: "smooth" })} sx={{ fontWeight: 800 }}>
                  Fill
                </Button>
              }
            >
              Guest registration required now: Room {regBlock.map((u) => u.roomNo).join(", ")}
            </Alert>
          )}
          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color={Q.muted}>
                {periodFilled(period)} / {rooms.length} rooms filled
              </Typography>
              <Stack direction="row" spacing={1.25}>
                {[["#DCFCE7", "#22C55E", "Checked in"], ["#FEF2F2", "#FCA5A5", "Checked out"], ["#F0F9FF", "#BAE6FD", "Available"]].map(([bg, line, l]) => (
                  <Stack key={l} direction="row" spacing={0.5} alignItems="center">
                    <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: bg, border: `1.5px solid ${line}` }} />
                    <Typography variant="caption" color={Q.muted}>{l}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
            <Box sx={{ height: 6, bgcolor: "#E2E8F0", borderRadius: 3 }}>
              <Box sx={{ height: "100%", width: `${(periodFilled(period) / rooms.length) * 100}%`, bgcolor: Q.gh, borderRadius: 3, transition: "width .3s" }} />
            </Box>
          </Box>
          <Grid container spacing={1.5}>
            {rooms.map((rm) => (
              <Grid key={rm.roomNumber} size={{ xs: 12, sm: 6, md: 4, lg: 3 }} sx={{ display: "flex" }}>
                <RoomCard
                  room={rm}
                  row={draft.rooms[keyOf(period, rm.roomNumber)]}
                  locked={locked}
                  fromServer={submitted && !!draft.rooms[keyOf(period, rm.roomNumber)]?._orig}
                  onOpen={() => setEditing(rm.roomNumber)}
                  charges={chargesFor(charges, period, rm.roomNumber)}
                  checkout={checkoutOf(period, rm.roomNumber)}
                  dueOut={period === "day" ? dueOutFor(rm.roomNumber) : null}
                  group={groupOf(rm.roomNumber)}
                  booking={!draft.rooms[keyOf(period, rm.roomNumber)] ? bookingFor(rm.roomNumber) : null}
                  advance={advanceFor(period, rm.roomNumber)}
                  period={period}
                />
              </Grid>
            ))}
          </Grid>
          {(regBlock.length > 0 || (settleDay && regPending.today?.length > 0)) && (
            <Paper id="gh-reg-panel" variant="outlined" sx={{ p: 1.5, mt: 2, mb: 1.5, borderRadius: 3, borderColor: regBlock.length ? "#FCA5A5" : Q.line, bgcolor: regBlock.length ? "#FEF2F2" : "#fff" }}>
              <Typography fontWeight={800}>📄 Guest registration</Typography>
              <Typography variant="caption" color={Q.muted} component="div" sx={{ mb: 1 }}>
                Registration can be filled on the check-in day or the next day. It must be complete before the next day is submitted.
              </Typography>
              {[...(regBlock || []).map((x) => ({ ...x, must: true })), ...(regPending.today || []).map((x) => ({ ...x, must: false }))].map((u, i) => (
                <Stack key={`${u.date}-${u.period}-${u.roomNo}`} direction={{ xs: "column", sm: "row" }} spacing={1} alignItems={{ sm: "center" }} sx={{ py: 0.75, borderTop: i ? `1px solid ${Q.line}` : "none" }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={700}>
                      Room {u.roomNo} · {u.guest?.fullname || "—"}{" "}
                      <Typography component="span" variant="caption" sx={{ color: u.must ? Q.bad : Q.muted, fontWeight: 700 }}>
                        {u.must ? `checked in ${u.date} — required now` : "due by tomorrow"}
                      </Typography>
                    </Typography>
                    <Typography variant="caption" color={Q.muted}>
                      Missing: {u.missing.join(", ")}
                    </Typography>
                  </Box>
                  <Button size="small" variant={u.must ? "contained" : "outlined"} onClick={() => setRegEdit(u)} sx={{ fontWeight: 700, ...(u.must ? { bgcolor: Q.bad, "&:hover": { bgcolor: Q.bad } } : {}) }}>
                    Fill details
                  </Button>
                </Stack>
              ))}
            </Paper>
          )}
        </>
      ) : (
        <Stack spacing={1.5}>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 6 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: "#FCA5A5", bgcolor: "#FEF2F2", height: "100%" }}>
                <Typography variant="caption" color={Q.muted} fontWeight={700}>
                  Total pending
                </Typography>
                <Typography fontWeight={800} fontSize={22} color={Q.bad}>
                  {inr(pendingAllTotal)}
                </Typography>
                <Typography variant="caption" color={Q.muted}>
                  {pendingAll.length} {pendingAll.length === 1 ? "entry" : "entries"}
                  {jamaQuery.trim() ? ` · search: ${pendingList.length} · ${inr(pendingShownTotal)}` : ""}
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: "#22C55E", bgcolor: "#DCFCE7", height: "100%" }}>
                <Typography variant="caption" color={Q.muted} fontWeight={700}>
                  Received today
                </Typography>
                <Typography fontWeight={800} fontSize={22} color={Q.good}>
                  {inr(summary.jamaTotal)}
                </Typography>
                <Typography variant="caption" color={Q.muted}>
                  {draft.jama.length ? Object.entries(jamaByMode).map(([m, v]) => `${m} ${inr(v)}`).join(" · ") : "Nothing collected yet"}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          {cashBox.any && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: "#A5F3FC", bgcolor: "#ECFEFF" }}>
              <Typography fontWeight={800}>💵 Total by payment mode (GH)</Typography>
              <Typography variant="caption" color={Q.muted} sx={{ display: "block", mb: 1 }}>
                Rooms & dues = today&apos;s rooms + old dues received · Advance = booking advance received today − advance already taken for today&apos;s check-ins
              </Typography>
              {(() => {
                const cell = { textAlign: "right", fontVariantNumeric: "tabular-nums", minWidth: 80, pl: 1 };
                const tot = cashBox.rows.reduce((a, r) => [0, a[1] + r[1], a[2] + r[2], a[3] + r[3]], [0, 0, 0, 0]);
                const cashTotal = cashBox.rows[0][1] + cashBox.rows[0][2] + cashBox.rows[0][3];
                return (
                  <>
                    <Stack direction="row" sx={{ py: 0.4, borderBottom: "1px solid #A5F3FC" }}>
                      {["MODE", "ROOMS & DUES", "ADVANCE", "EXTRA", "TOTAL"].map((h, i) => (
                        <Typography key={h} variant="caption" fontWeight={800} color={Q.muted} sx={i ? cell : { flex: 1 }}>
                          {h}
                        </Typography>
                      ))}
                    </Stack>
                    {[...cashBox.rows, ["Total", tot[1], tot[2], tot[3]]].map(([m, a, b, c]) => (
                      <Stack key={m} direction="row" sx={{ py: 0.4, ...(m === "Total" ? { borderTop: "1px solid #A5F3FC", mt: 0.5 } : {}) }}>
                        <Typography fontWeight={m === "Cash" || m === "Total" ? 800 : 600} sx={{ flex: 1 }}>
                          {m === "Cash" ? "Total cash" : m}
                          {["Card", "PPS", "PPC"].includes(m) && (
                            <Typography component="span" variant="caption" color={Q.muted} sx={{ display: "block", fontWeight: 400 }}>
                              {{ Card: "restaurant machine → PP (restaurant a/c)", PPS: "GH saving a/c (non-GST)", PPC: "GH current a/c" }[m]}
                            </Typography>
                          )}
                        </Typography>
                        <Typography sx={cell}>{inr(a)}</Typography>
                        <Typography sx={cell}>{b < 0 ? `− ${inr(-b)}` : inr(b)}</Typography>
                        <Typography sx={cell}>{inr(c)}</Typography>
                        <Typography fontWeight={800} sx={{ ...cell, color: "#155E75" }}>
                          {inr(a + b + c)}
                        </Typography>
                      </Stack>
                    ))}
                    {(cashBox.foodCash > 0 || ghToOffice > 0) && (
                      <Box sx={{ mt: 1, pt: 1, borderTop: "1px dashed #A5F3FC" }}>
                        {cashBox.foodCash > 0 && (
                          <Typography variant="body2" sx={{ py: 0.25 }}>
                            + Food bill cash (restaurant&apos;s money): {inr(cashBox.foodCash)}
                            {cashBox.foodCashGiven ? ` · given to restaurant ${inr(cashBox.foodCashGiven)}` : ""}
                          </Typography>
                        )}
                        {ghToOffice > 0 && (
                          <Typography variant="body2" sx={{ py: 0.25 }}>
                            − Cash given to Office today (recorded by Office): {inr(ghToOffice)}
                          </Typography>
                        )}
                        <Typography fontWeight={800} sx={{ color: "#155E75" }}>
                          Cash left in GH drawer: {inr(cashTotal + cashBox.foodCash - cashBox.foodCashGiven - ghToOffice)}
                        </Typography>
                      </Box>
                    )}
                  </>
                );
              })()}
            </Paper>
          )}
          {chargesPaidToday.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: "#99F6E4", bgcolor: "#F0FDFA" }}>
              <Typography fontWeight={800}>
                🍽 Food / extra bills received today ({inr(chargesPaidToday.reduce((t, c) => t + num(c.amount), 0))})
              </Typography>
              <Typography variant="caption" color={Q.muted} sx={{ display: "block", mb: 1 }}>
                Food bills are restaurant sales (already counted in the restaurant entry), not GH room sales. Cash food bills go to the restaurant cashier; the restaurant cashier marks them received. PP = paid to the restaurant UPI (nothing to hand over).{" "}
                {Object.entries(chargesPaidToday.reduce((o, c) => ({ ...o, [c.paidMode]: (o[c.paidMode] || 0) + num(c.amount) }), {}))
                  .map(([m, v]) => `${m} ${inr(v)}`)
                  .join(" · ")}
              </Typography>
              {chargesPaidToday.map((c, i) => (
                <Stack key={c._id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.5, borderTop: i ? `1px solid ${Q.line}` : "none" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>
                      {c.kind === "food" ? "🍽" : "➕"} Room {c.roomNo} · {c.label}
                    </Typography>
                    <Typography variant="caption" color={Q.muted}>
                      Bill of {c.date}
                      {c.guestName ? ` · ${c.guestName}` : ""} · {c.paidMode}
                      {c.paidBy ? ` · by ${c.paidBy}` : ""}
                    </Typography>
                    {(c.paidAt === "rest" || c.paidAt === "office") && (
                      <Typography variant="caption" fontWeight={700} display="block" color={Q.good}>
                        ✓ Received at the {c.paidAt === "rest" ? "restaurant counter" : "office"} (not in GH cash)
                      </Typography>
                    )}
                    {c.kind === "food" && c.paidMode === "Cash" && c.paidAt !== "rest" && c.paidAt !== "office" && (
                      <Typography variant="caption" fontWeight={700} display="block" color={c.handedOver ? Q.good : "#B45309"}>
                        {c.handedOver ? `✓ Given to restaurant cashier (${c.handedOver.date})` : "⏳ Give this cash to the restaurant cashier"}
                      </Typography>
                    )}
                  </Box>
                  <Typography fontWeight={800}>{inr(c.amount)}</Typography>
                </Stack>
              ))}
            </Paper>
          )}
          {draft.jama.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Received today ({inr(summary.jamaTotal)})
              </Typography>
              {draft.jama.map((j, i) => (
                <Stack key={j.id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.75, borderTop: i ? `1px solid ${Q.line}` : "none" }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>
                      {j.fullname}
                    </Typography>
                    <Typography variant="caption" color={Q.muted}>
                      {j.createDate} · Room {j.roomNo} · {j.modeOfPayment}
                    </Typography>
                  </Box>
                  <Typography fontWeight={800}>{inr(j.rate)}</Typography>
                  {!locked && (
                    <Button size="small" color="error" onClick={() => removeJama(i)}>
                      Remove
                    </Button>
                  )}
                </Stack>
              ))}
            </Paper>
          )}
          {!locked && (
            <>
              <TextField
                size="small"
                placeholder="Search by name, mobile or room"
                value={jamaQuery}
                onChange={(e) => setJamaQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
                sx={{ bgcolor: "#fff" }}
              />
              {pendingList.length === 0 && <Alert severity="success">No pending payments 🎉</Alert>}
              <Grid container spacing={1.5}>
                {pendingList.map((u, i) => {
                  const age = dayjs().diff(dayjs(u.createDate, DATE_FMT), "day");
                  const open = jamaPick === i;
                  return (
                    <Grid key={`${u.createDate}-${u.roomNo}-${i}`} size={{ xs: 12, md: 6 }}>
                      <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderLeft: `4px solid ${age > 30 ? Q.bad : age > 7 ? "#F59E0B" : Q.line}` }}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography fontWeight={700} noWrap>
                              {u.fullname || "—"}
                            </Typography>
                            <Typography variant="caption" color={Q.muted}>
                              {u.createDate} · Room {u.roomNo} · {age} days ago
                            </Typography>
                          </Box>
                          <Typography fontWeight={800}>{inr(u.rate)}</Typography>
                          <Button size="small" variant={open ? "outlined" : "contained"} onClick={() => setJamaPick(open ? null : i)} sx={{ bgcolor: open ? undefined : Q.gh, fontWeight: 700 }}>
                            {open ? "Cancel" : "Received"}
                          </Button>
                        </Stack>
                        <Collapse in={open}>
                          <Box sx={{ pt: 1.5 }}>
                            <ChipChoice label="Payment mode" options={PAID_MODES} value="" onChange={(m) => addJama(u, m)} color={Q.gh} />
                          </Box>
                        </Collapse>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
            </>
          )}
        </Stack>
      )}

      {!locked && (
        <SaveBar
          label={`Total · ${summary.filled} rooms${summary.jamaTotal ? ` + collections ${inr(summary.jamaTotal)}` : ""}`}
          amount={summary.total + summary.jamaTotal}
          sub={
            summary.incomplete.length
              ? { text: `Incomplete: ${summary.incomplete.slice(0, 3).join(", ")}${summary.incomplete.length > 3 ? "…" : ""}`, color: Q.bad }
              : unsettled.length
              ? { text: `Settle rooms: ${unsettled.map((u) => u.roomNo).slice(0, 4).join(", ")}${unsettled.length > 4 ? "…" : ""}`, color: Q.bad }
              : regBlock.length
              ? { text: `Guest registration pending: ${regBlock.map((u) => u.roomNo).slice(0, 4).join(", ")}`, color: Q.bad }
              : null
          }
          buttonText={submitted ? "Update" : "Submit day"}
          color={Q.gh}
          busy={busy}
          disabled={summary.incomplete.length > 0 || unsettled.length > 0 || regBlock.length > 0 || (summary.filled === 0 && draft.jama.length === 0 && others.length === 0)}
          onClick={() => setConfirm(true)}
        />
      )}

      <RoomEditor
        open={!!room}
        room={room}
        period={period}
        date={date}
        initial={editingInitial}
        checkedIn={!!(room && draft.rooms[keyOf(period, room.roomNumber)] && isTouched(draft.rooms[keyOf(period, room.roomNumber)]))}
        locked={locked}
        onClose={() => {
          setEditing(null);
          loadRegPending();
        }}
        onSave={saveRoom}
        onClear={clearRoom}
        isAdmin={isAdmin}
        charges={charges}
        onChargesChanged={loadCharges}
        stay={
          room
            ? {
                checkout: checkoutOf(period, room.roomNumber),
                started: (stayInfo?.started || []).find((x) => x.roomNo === room.roomNumber && x.period === period),
              }
            : null
        }
        onCheckout={checkoutRoom}
        onUndoCheckout={undoCheckout}
        onMove={openMove}
        onMerge={() => {
          setEditing(null);
          setMergeDlg({ mainRoom: room.roomNumber });
        }}
        onUnmerge={unmerge}
        group={room ? groupOf(room.roomNumber) : null}
        onNewGuest={() => {
          const rn = room?.roomNumber;
          setEditing(null);
          setPeriod(NEXT_PERIOD[period]);
          setTimeout(() => setEditing(rn), 0);
        }}
        advance={room ? advanceFor(period, room.roomNumber, editingInitial) : 0}
      />

      <RemoveEntryDialog
        open={!!removeAsk}
        roomNo={removeAsk?.roomNo}
        guest={removeAsk?.row}
        onClose={() => setRemoveAsk(null)}
        onConfirm={doRemove}
      />
      <RoomMoveDialog
        open={!!moveDlg}
        onClose={() => setMoveDlg(null)}
        date={date}
        period={moveDlg?.period || period}
        fromRoom={moveDlg?.fromRoom}
        guest={moveDlg?.guest}
        rooms={rooms || []}
        occupant={(rn) => guestSnap(draft.rooms[keyOf(moveDlg?.period || period, rn)] && isTouched(draft.rooms[keyOf(moveDlg?.period || period, rn)]) ? draft.rooms[keyOf(moveDlg?.period || period, rn)] : null)}
        onDone={afterMove}
      />
      <MergeBillDialog
        open={!!mergeDlg}
        onClose={() => setMergeDlg(null)}
        date={date}
        mainRoom={mergeDlg?.mainRoom}
        candidates={(rooms || [])
          .filter((rm) => rm.roomNumber !== mergeDlg?.mainRoom && !groupOf(rm.roomNumber))
          .map((rm) => ({ roomNo: rm.roomNumber, name: rowOfRoom(rm.roomNumber)[1]?.fullname }))
          .filter((x) => x.name !== undefined)}
        onDone={() => {
          setMergeDlg(null);
          loadStay();
        }}
      />

      <EditorDialog
        open={!!payBlock}
        onClose={() => setPayBlock(null)}
        subtitle={payBlock ? `Room ${payBlock.roomNo} · ${payBlock.guest || ""}` : ""}
        title={payBlock ? `Payment pending ${inr(payBlock.dues.due)}` : ""}
        actions={
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            <Button fullWidth variant="outlined" onClick={() => setPayBlock(null)}>
              OK
            </Button>
          </Stack>
        }
      >
        {payBlock && (
          <Stack spacing={1}>
            <Alert severity="error">The guest cannot be checked out until the full amount is paid.</Alert>
            {payBlock.dues.lines.map((l) => (
              <Typography key={l} variant="body2">
                • {l}
              </Typography>
            ))}
            <Typography variant="caption" color={Q.muted}>
              To collect: select the payment mode for today&apos;s room, mark food/extra charges as paid in the room bill, and add earlier unpaid days under Collections. If something is to be waived, enter it as Discount — it is taken off the total bill (room + food + extra). Then check out again.
            </Typography>
          </Stack>
        )}
      </EditorDialog>

      <EditorDialog open={!!regEdit} onClose={() => { setRegEdit(null); loadRegPending(); }} subtitle={regEdit ? `Checked in ${regEdit.date}` : ""} title={regEdit ? `Guest registration · Room ${regEdit.roomNo}` : ""} actions={<Button fullWidth variant="outlined" onClick={() => { setRegEdit(null); loadRegPending(); }}>Done</Button>}>
        {regEdit && (
          <GuestRegisterForm
            key={`${regEdit.date}-${regEdit.period}-${regEdit.roomNo}`}
            date={regEdit.date}
            period={regEdit.period}
            roomNo={regEdit.roomNo}
            seed={{ fullname: regEdit.guest?.fullname, mobileNumber: regEdit.guest?.mobileNumber, noOfPeople: regEdit.guest?.noOfPeople, checkInTime: regEdit.guest?.checkInTime, checkOutTime: regEdit.guest?.checkOutTime }}
            isAdmin={isAdmin}
            defaultOpen
            onSaved={loadRegPending}
          />
        )}
      </EditorDialog>

      <ConfirmDialog
        open={confirm}
        color={Q.gh}
        title={submitted ? `Update GH entry for ${date}?` : `Submit GH entry for ${date}?`}
        confirmText={submitted ? "Yes, update" : "Yes, submit"}
        lines={[
          ...PERIODS.filter((p) => summary.per[p.key]).map((p) => ({ label: p.label, value: `${summary.per[p.key]} rooms` })),
          ...(draft.jama.length ? [{ label: "Pending collections", value: `${draft.jama.length} · ${inr(summary.jamaTotal)}` }] : []),
          ...MODES.filter((m) => summary.byMode[m]).map((m) => {
            const x = summary.byMode[m];
            const parts = [x.rooms ? `${x.rooms} room${x.rooms > 1 ? "s" : ""}` : "", x.jama ? `${x.jama} collection${x.jama > 1 ? "s" : ""}` : ""].filter(Boolean).join(" + ");
            return { label: `${m === "UnPaid" ? "Unpaid" : m} (${parts})`, value: inr(x.amt), color: m === "UnPaid" ? Q.bad : undefined };
          }),
          ...(summary.byMode.UnPaid ? [{ label: "Received today", value: inr(summary.total + summary.jamaTotal - summary.byMode.UnPaid.amt), color: Q.good || Q.ink }] : []),
          ...(cashBox.advUsed > 0 ? [{ label: "Less: booking advance taken earlier (not in today's drawer)", value: `− ${inr(cashBox.advUsed)}`, color: Q.warn }] : []),
          { label: "Total", value: inr(summary.total + summary.jamaTotal), color: Q.ink },
          ...(!submitted && !editor ? [{ label: "Note", value: "After submitting, only an admin can make changes", color: Q.warn }] : []),
        ]}
        onCancel={() => setConfirm(false)}
        onConfirm={submit}
      />
    </Box>
  );
};

export default GhQuickEntry;
