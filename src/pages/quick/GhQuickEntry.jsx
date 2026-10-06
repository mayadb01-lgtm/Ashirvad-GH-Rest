// Guest House: PC + mobile entry
// Niyam purane page jaise: staff din ek baar submit karta hai, uske baad sirf admin badal sakta hai.
// Data bilkul purane format mein jaata hai (/entry/create-entry, /entry/update-entry).
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
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
const TIMES = ["06:00 AM", "08:00 AM", "10:00 AM", "12:00 PM", "02:00 PM", "04:00 PM", "06:00 PM", "08:00 PM", "10:00 PM"];
const EMPTY = { rooms: {}, jama: [] };

const digits = (v) => String(v ?? "").replace(/\D/g, "");
const keyOf = (period, roomNo) => `${period}|${roomNo}`;
const rowIssues = (r) => {
  const out = [];
  if (!(num(r.rate) > 0)) out.push("rate");
  if (!(num(r.noOfPeople) > 0)) out.push("log");
  if (!r.type) out.push("guest type");
  if (!r.modeOfPayment) out.push("payment");
  if (!String(r.fullname || "").trim()) out.push("naam");
  const m = digits(r.mobileNumber);
  if (m && m !== "0" && m.length !== 10) out.push("mobile 10 digit");
  return out;
};
const isTouched = (r) => r && (num(r.rate) > 0 || String(r.fullname || "").trim() || r.modeOfPayment || r.type);

/* ---------------- Room card ---------------- */
const RoomCard = ({ room, row, onOpen, locked, fromServer }) => {
  const filled = row && rowIssues(row).length === 0;
  const partial = row && !filled && isTouched(row);
  const low = filled && room.roomCost && num(row.rate) < room.roomCost * 0.7;
  const border = low ? "#F59E0B" : partial ? Q.bad : filled ? Q.line : "#CBD5E1";
  return (
    <ButtonBase
      onClick={onOpen}
      disabled={locked && !filled}
      sx={{ width: "100%", textAlign: "left", borderRadius: 3, display: "block" }}
    >
      <Paper
        variant="outlined"
        sx={{
          p: 1.5,
          borderRadius: 3,
          borderWidth: filled || partial || low ? 1.5 : 1.5,
          borderStyle: filled || partial ? "solid" : "dashed",
          borderColor: border,
          bgcolor: low ? "#FFFBEB" : filled ? "#fff" : "transparent",
          minHeight: 104,
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
              {fromServer ? "✓ Submitted" : "✓ Bhara"}
            </Typography>
          )}
          {low && <StatusPill tone="warn">Check karo</StatusPill>}
          {partial && <StatusPill tone="warn">Adhoora</StatusPill>}
        </Stack>
        {filled || partial ? (
          <>
            <Typography fontWeight={700} sx={{ mt: 0.5 }} noWrap>
              {row.fullname || "—"}
            </Typography>
            <Typography variant="caption" color={Q.muted} noWrap component="div">
              {digits(row.mobileNumber) && digits(row.mobileNumber) !== "0" ? digits(row.mobileNumber) + " · " : ""}
              {row.noOfPeople || 0} log · {row.type || "—"}
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
                {row.modeOfPayment === "UnPaid" ? "Baaki" : row.modeOfPayment || "—"}
              </Box>
              <Typography fontWeight={800} fontSize={17} sx={{ color: low ? Q.bad : Q.ink }}>
                {inr(row.rate)}
              </Typography>
            </Stack>
            {partial && (
              <Typography variant="caption" sx={{ color: Q.bad, fontWeight: 700 }}>
                Baaki: {rowIssues(row).join(", ")}
              </Typography>
            )}
          </>
        ) : (
          <Typography sx={{ mt: 2.5, color: locked ? Q.muted : Q.gh, fontWeight: 700 }}>
            {locked ? "Khaali" : "+ Guest jodo"}
          </Typography>
        )}
      </Paper>
    </ButtonBase>
  );
};

/* ---------------- Room editor ---------------- */
const RoomEditor = ({ open, room, period, date, initial, onClose, onSave, onClear, locked }) => {
  const [f, setF] = useState(initial);
  const [guest, setGuest] = useState(null);
  const lastLookup = useRef("");
  useEffect(() => {
    setF(initial);
    setGuest(null);
    lastLookup.current = "";
  }, [initial, open]);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const mobile = digits(f.mobileNumber);

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

  if (!room) return null;
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
            Band karo
          </Button>
        ) : (
          <Stack direction="row" spacing={1} sx={{ width: "100%" }}>
            {initial && isTouched(initial) && (
              <Button color="error" onClick={onClear} sx={{ fontWeight: 700 }}>
                Hatao
              </Button>
            )}
            <Button
              fullWidth
              variant="contained"
              disabled={issues.length > 0}
              onClick={() => onSave(f)}
              sx={{ bgcolor: Q.gh, py: 1.4, fontSize: 16, fontWeight: 800, "&:hover": { bgcolor: Q.gh } }}
            >
              {issues.length ? `Bharo: ${issues.join(", ")}` : `Room ${room.roomNumber} theek hai`}
            </Button>
          </Stack>
        )
      }
    >
      <Stack spacing={2}>
        {locked && (
          <Alert icon={<LockIcon />} severity="info">
            Ye din submit ho chuka hai. Badlav sirf admin kar sakta hai.
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
          helperText={mobile && mobile.length !== 10 ? `${mobile.length}/10 digit` : " "}
          error={!!mobile && mobile.length !== 10}
        />
        {guest?.found && (
          <Alert severity={guest.pendingAmount > 0 ? "warning" : "success"} sx={{ mt: -1.5 }}>
            <b>Purana guest: {guest.fullname}</b>
            <br />
            {guest.visits} baar aa chuke · last {guest.lastVisit} (Room {guest.lastRoom}, {inr(guest.lastRate)})
            {guest.pendingAmount > 0 && (
              <>
                <br />
                <b>⚠ {inr(guest.pendingAmount)} pehle ka baaki hai</b>
              </>
            )}
          </Alert>
        )}
        <TextField
          label="Guest ka naam"
          value={f.fullname || ""}
          onChange={(e) => set("fullname", e.target.value)}
          disabled={locked}
          fullWidth
          InputProps={{ sx: { fontSize: 17 } }}
        />
        <Stack direction="row" spacing={1.5}>
          <Box sx={{ flex: 1.2 }}>
            <MoneyField label="Rate" value={f.rate} onChange={(v) => set("rate", v)} big disabled={locked} />
          </Box>
          <Box sx={{ flex: 1 }}>
            <Stepper label="Kitne log" value={num(f.noOfPeople)} onChange={(v) => !locked && set("noOfPeople", v)} />
          </Box>
        </Stack>
        {low && (
          <Alert severity="warning" sx={{ mt: -1 }}>
            Rate room ki list price ({inr(room.roomCost)}) se {Math.round((1 - num(f.rate) / room.roomCost) * 100)}% kam hai. Sahi
            hai?
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
          <TextField select label="Check-in" value={f.checkInTime || "10:00 AM"} onChange={(e) => set("checkInTime", e.target.value)} fullWidth disabled={locked}>
            {Array.from(new Set([f.checkInTime || "10:00 AM", ...TIMES])).map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Check-out" value={f.checkOutTime || "10:00 AM"} onChange={(e) => set("checkOutTime", e.target.value)} fullWidth disabled={locked}>
            {Array.from(new Set([f.checkOutTime || "10:00 AM", ...TIMES])).map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <MoneyField label="Discount (agar diya ho)" value={f.discount} onChange={(v) => set("discount", v)} disabled={locked} />
      </Stack>
    </EditorDialog>
  );
};

/* ---------------- Main ---------------- */
const GhQuickEntry = ({ date, isAdmin }) => {
  const [rooms, setRooms] = useState(null);
  const [server, setServer] = useState({ loaded: false, entries: [] });
  const [status, setStatus] = useState(null);
  const [unpaid, setUnpaid] = useState([]);
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
  const locked = submitted && !isAdmin;

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

  const others = useMemo(
    () => server.entries.filter((e) => !ROOM_PERIODS.includes(e.period) && e.period !== "UnPaid"),
    [server.entries]
  );

  const room = rooms?.find((r) => r.roomNumber === editing);
  const editingInitial = useMemo(() => {
    if (!room) return null;
    return (
      draft.rooms[keyOf(period, room.roomNumber)] || {
        rate: 0,
        noOfPeople: 0,
        type: "",
        modeOfPayment: "",
        fullname: "",
        mobileNumber: "",
        checkInTime: "10:00 AM",
        checkOutTime: "10:00 AM",
        discount: 0,
      }
    );
  }, [room, draft.rooms, period]);

  const saveRoom = (f) => {
    setDraft((d) => ({ ...d, rooms: { ...d.rooms, [keyOf(period, room.roomNumber)]: { ...(d.rooms[keyOf(period, room.roomNumber)] || {}), ...f } } }));
    setEditing(null);
  };
  const clearRoom = () => {
    setDraft((d) => {
      const next = { ...d.rooms };
      delete next[keyOf(period, room.roomNumber)];
      return { ...d, rooms: next };
    });
    setEditing(null);
  };

  /* ----- counts & totals ----- */
  const summary = useMemo(() => {
    const per = {};
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
    });
    const jamaTotal = draft.jama.reduce((s, j) => s + num(j.rate), 0);
    return { per, total, jamaTotal, incomplete, filled: Object.values(per).reduce((a, b) => a + b, 0) };
  }, [draft]);

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
        const { _orig, ...clean } = r;
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

  const submit = async () => {
    setConfirm(false);
    setBusy(true);
    try {
      const entries = buildEntries();
      if (!entries.length) {
        toast.error("Koi entry nahi bhari");
        return;
      }
      const body = { entries: JSON.stringify(entries), date };
      if (submitted) await axios.put(`${API}/entry/update-entry/${date}`, body);
      else await axios.post(`${API}/entry/create-entry`, body);
      toast.success(submitted ? "GH entry update ho gayi" : "GH entry submit ho gayi");
      clearDraft();
      setDraft(EMPTY);
      seededFor.current = "";
      await load();
    } catch (err) {
      toast.error(apiError(err));
    } finally {
      setBusy(false);
    }
  };

  /* ----- Jama (pending paisa aaya) ----- */
  const jamaKeys = new Set(draft.jama.map((j) => `${j.createDate}|${j.roomNo}|${j.mobileNumber}`));
  const pendingList = unpaid
    .filter((u) => !jamaKeys.has(`${u.createDate}|${u.roomNo}|${u.mobileNumber}`))
    .filter((u) => {
      const q = jamaQuery.trim().toLowerCase();
      return !q || `${u.fullname} ${u.mobileNumber} ${u.roomNo}`.toLowerCase().includes(q);
    })
    .sort((a, b) => dayjs(a.createDate, DATE_FMT).valueOf() - dayjs(b.createDate, DATE_FMT).valueOf());

  const addJama = (u, mode) => {
    setDraft((d) => ({
      ...d,
      jama: [
        ...d.jama,
        {
          id: `Jama - ${d.jama.length + 1}-${Date.now() % 100000}`,
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
          <StatusPill tone="info">Draft phone mein safe hai · abhi submit nahi hua</StatusPill>
        ) : (
          <StatusPill tone="warn">Aaj ki GH entry abhi nahi hui</StatusPill>
        )}
        {status?.updatedBy && <StatusPill tone="lock">Edit: {status.updatedBy}</StatusPill>}
      </Stack>
      {locked && (
        <Alert severity="info" icon={<LockIcon />} sx={{ mb: 1.5 }}>
          Is din ki entry submit ho chuki hai. Koi galti ho to admin ko batao.
        </Alert>
      )}

      {/* tabs */}
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={tab === "jama" ? "jama" : period}
        onChange={(_, v) => {
          if (!v) return;
          if (v === "jama") setTab("jama");
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
        <ToggleButton value="jama">
          <Box>
            Jama
            <Box component="span" sx={{ display: "block", fontSize: 11, fontWeight: 600, opacity: 0.85 }}>
              {draft.jama.length ? `${draft.jama.length} aaya` : `${unpaid.length} baaki`}
            </Box>
          </Box>
        </ToggleButton>
      </ToggleButtonGroup>

      {tab === "rooms" ? (
        <>
          <Box sx={{ mb: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" color={Q.muted}>
                {periodFilled(period)} / {rooms.length} rooms bhare
              </Typography>
            </Stack>
            <Box sx={{ height: 6, bgcolor: "#E2E8F0", borderRadius: 3 }}>
              <Box sx={{ height: "100%", width: `${(periodFilled(period) / rooms.length) * 100}%`, bgcolor: Q.gh, borderRadius: 3, transition: "width .3s" }} />
            </Box>
          </Box>
          <Grid container spacing={1.5}>
            {rooms.map((rm) => (
              <Grid key={rm.roomNumber} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                <RoomCard
                  room={rm}
                  row={draft.rooms[keyOf(period, rm.roomNumber)]}
                  locked={locked}
                  fromServer={submitted && !!draft.rooms[keyOf(period, rm.roomNumber)]?._orig}
                  onOpen={() => setEditing(rm.roomNumber)}
                />
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <Stack spacing={1.5}>
          {draft.jama.length > 0 && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Aaj paisa aaya ({inr(summary.jamaTotal)})
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
                      Hatao
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
                placeholder="Naam, mobile ya room se dhoondo"
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
              {pendingList.length === 0 && <Alert severity="success">Koi baaki payment nahi 🎉</Alert>}
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
                              {u.createDate} · Room {u.roomNo} · {age} din pehle
                            </Typography>
                          </Box>
                          <Typography fontWeight={800}>{inr(u.rate)}</Typography>
                          <Button size="small" variant={open ? "outlined" : "contained"} onClick={() => setJamaPick(open ? null : i)} sx={{ bgcolor: open ? undefined : Q.gh, fontWeight: 700 }}>
                            {open ? "Ruko" : "Paisa aaya"}
                          </Button>
                        </Stack>
                        <Collapse in={open}>
                          <Box sx={{ pt: 1.5 }}>
                            <ChipChoice label="Kaise aaya?" options={PAID_MODES} value="" onChange={(m) => addJama(u, m)} color={Q.gh} />
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
          label={`Total · ${summary.filled} rooms${summary.jamaTotal ? ` + jama ${inr(summary.jamaTotal)}` : ""}`}
          amount={summary.total + summary.jamaTotal}
          sub={summary.incomplete.length ? { text: `Adhoore: ${summary.incomplete.slice(0, 3).join(", ")}${summary.incomplete.length > 3 ? "…" : ""}`, color: Q.bad } : null}
          buttonText={submitted ? "Update karo" : "Din submit karo"}
          color={Q.gh}
          busy={busy}
          disabled={summary.incomplete.length > 0 || (summary.filled === 0 && draft.jama.length === 0 && others.length === 0)}
          onClick={() => setConfirm(true)}
        />
      )}

      <RoomEditor
        open={!!room}
        room={room}
        period={period}
        date={date}
        initial={editingInitial}
        locked={locked}
        onClose={() => setEditing(null)}
        onSave={saveRoom}
        onClear={clearRoom}
      />

      <ConfirmDialog
        open={confirm}
        color={Q.gh}
        title={submitted ? `${date} ki GH entry update karein?` : `${date} ki GH entry submit karein?`}
        confirmText={submitted ? "Haan, update karo" : "Haan, submit karo"}
        lines={[
          ...PERIODS.filter((p) => summary.per[p.key]).map((p) => ({ label: p.label, value: `${summary.per[p.key]} rooms` })),
          ...(draft.jama.length ? [{ label: "Pending jama", value: `${draft.jama.length} · ${inr(summary.jamaTotal)}` }] : []),
          { label: "Kul", value: inr(summary.total + summary.jamaTotal), color: Q.ink },
          ...(!submitted && !isAdmin ? [{ label: "Dhyan do", value: "Submit ke baad sirf admin badal sakta hai", color: Q.warn }] : []),
        ]}
        onCancel={() => setConfirm(false)}
        onConfirm={submit}
      />
    </Box>
  );
};

export default GhQuickEntry;
