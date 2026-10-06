// Advance booking: nayi booking, advance lena, aane wali bookings ki list.
// Advance hamesha AAJ ki date se judta hai (jis din paisa mila) — us din ke galla mein dikhta hai.
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { API, MoneyField, Q, apiError, cleanMobile, inr, num } from "./shared";

const F = "DD-MM-YYYY";
const MODES = ["Cash", "Card", "PPS", "PPC"];
const advTotal = (b) => (b.advances || []).reduce((s, a) => s + num(a.amount), 0);
const blank = () => ({ guestName: "", mobile: "", company: "", people: 1, roomNo: "", checkInDate: dayjs().add(1, "day").format(F), nights: 1, rate: 0, notes: "", advAmount: 0, advMode: "Cash" });

export const BookingForm = ({ open, onClose, rooms = [], initial, onSaved }) => {
  const [b, setB] = useState(blank());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setB(initial ? { ...blank(), ...initial, mobile: cleanMobile(initial.mobile), roomNo: initial.roomNo || "", advAmount: 0 } : blank());
  }, [open, initial]);
  const set = (k, v) => setB((x) => ({ ...x, [k]: v }));
  const editing = !!initial?._id;
  const room = rooms.find((r) => r.roomNumber === Number(b.roomNo));

  const save = async () => {
    if (!b.guestName.trim()) return toast.error("Enter guest name");
    const mob = cleanMobile(b.mobile);
    if (mob && mob.length !== 10) return toast.error("Mobile number must be 10 digits");
    setBusy(true);
    try {
      const body = {
        guestName: b.guestName,
        mobile: cleanMobile(b.mobile),
        company: b.company,
        people: b.people,
        roomNo: b.roomNo ? Number(b.roomNo) : null,
        roomType: room?.roomType || "",
        checkInDate: b.checkInDate,
        nights: b.nights,
        rate: num(b.rate),
        notes: b.notes,
      };
      if (editing) await axios.put(`${API}/booking/${initial._id}`, body);
      else await axios.post(`${API}/booking`, { ...body, advance: num(b.advAmount) > 0 ? { amount: num(b.advAmount), mode: b.advMode } : undefined });
      toast.success(editing ? "Booking updated" : "Booking created");
      onSaved?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle fontWeight={800}>{editing ? `Edit booking ${initial.bookingNo}` : "📅 New advance booking"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <TextField label="Guest name" value={b.guestName} onChange={(e) => set("guestName", e.target.value)} autoFocus />
          <Stack direction="row" spacing={1.5}>
            <TextField fullWidth label="Mobile" value={b.mobile} onChange={(e) => set("mobile", cleanMobile(e.target.value))}
              error={!!b.mobile && b.mobile.length !== 10}
              helperText={b.mobile && b.mobile.length !== 10 ? `${b.mobile.length}/10 digits` : " "} inputProps={{ inputMode: "numeric" }} />
            <TextField sx={{ width: 110 }} type="number" label="Guests" value={b.people} onChange={(e) => set("people", Number(e.target.value) || 1)} />
          </Stack>
          <TextField label="Company (if any)" value={b.company} onChange={(e) => set("company", e.target.value)} />
          <Stack direction="row" spacing={1.5}>
            <TextField
              fullWidth
              type="date"
              label="Check-in date"
              value={dayjs(b.checkInDate, F).format("YYYY-MM-DD")}
              onChange={(e) => e.target.value && set("checkInDate", dayjs(e.target.value).format(F))}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: dayjs().format("YYYY-MM-DD") }}
            />
            <TextField sx={{ width: 120 }} type="number" label="Nights" value={b.nights} onChange={(e) => set("nights", Math.max(1, Number(e.target.value) || 1))} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField select fullWidth label="Room (can be chosen later)" value={b.roomNo} onChange={(e) => set("roomNo", e.target.value)}>
              <MenuItem value="">Not decided yet</MenuItem>
              {rooms.map((r) => (
                <MenuItem key={r.roomNumber} value={r.roomNumber}>
                  {r.roomNumber} · {r.roomType} · {inr(r.roomCost)}
                </MenuItem>
              ))}
            </TextField>
            <MoneyField label="Rate / night" value={b.rate} onChange={(v) => set("rate", v)} sx={{ width: 150 }} />
          </Stack>
          {!editing && (
            <Paper variant="outlined" sx={{ p: 1.5, bgcolor: "#F0FDF4", borderColor: "#BBF7D0" }}>
              <Typography fontWeight={800} sx={{ mb: 1 }}>
                Advance (received today)
              </Typography>
              <Stack direction="row" spacing={1.5}>
                <MoneyField label="Advance amount" value={b.advAmount} onChange={(v) => set("advAmount", v)} />
                <TextField select sx={{ width: 130 }} label="Mode" value={b.advMode} onChange={(e) => set("advMode", e.target.value)}>
                  {MODES.map((m) => (
                    <MenuItem key={m} value={m}>
                      {m}
                    </MenuItem>
                  ))}
                </TextField>
              </Stack>
            </Paper>
          )}
          <TextField label="Note (optional)" value={b.notes} onChange={(e) => set("notes", e.target.value)} />
          {num(b.rate) > 0 && (
            <Typography variant="body2" color={Q.muted}>
              Estimated total: {inr(num(b.rate) * b.nights)} ({b.nights} nights){!editing && num(b.advAmount) > 0 ? ` · Due after advance ${inr(num(b.rate) * b.nights - num(b.advAmount))}` : ""}
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Close
        </Button>
        <Button variant="contained" onClick={save} disabled={busy} sx={{ bgcolor: Q.gh, fontWeight: 800, "&:hover": { bgcolor: Q.gh } }}>
          {editing ? "Save" : "Create booking"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AdvanceDialog = ({ booking, onClose, onSaved }) => {
  const [amount, setAmount] = useState(0);
  const [mode, setMode] = useState("Cash");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setAmount(0);
    setMode("Cash");
  }, [booking]);
  const save = async () => {
    if (!(num(amount) > 0)) return toast.error("Enter amount");
    setBusy(true);
    try {
      await axios.post(`${API}/booking/${booking._id}/advance`, { amount: num(amount), mode });
      toast.success("Advance added");
      onSaved?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={!!booking} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle fontWeight={800}>Add advance · {booking?.guestName}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          <MoneyField label="Amount (received today)" value={amount} onChange={setAmount} big autoFocus />
          <TextField select label="Mode" value={mode} onChange={(e) => setMode(e.target.value)}>
            {MODES.map((m) => (
              <MenuItem key={m} value={m}>
                {m}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button variant="contained" disabled={busy} onClick={save} sx={{ bgcolor: Q.gh, "&:hover": { bgcolor: Q.gh } }}>
          Add
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const BookingsPanel = ({ rooms, isAdmin, onChanged }) => {
  const [list, setList] = useState(null);
  const [form, setForm] = useState(null); // {initial}
  const [adv, setAdv] = useState(null);
  const [cancel, setCancel] = useState(null);
  const [reason, setReason] = useState("");

  const load = useCallback(() => {
    axios
      .get(`${API}/booking/upcoming`)
      .then(({ data }) => setList(data.data || []))
      .catch((e) => {
        toast.error(apiError(e));
        setList([]);
      });
  }, []);
  useEffect(() => load(), [load]);
  const changed = () => {
    setForm(null);
    setAdv(null);
    setCancel(null);
    setReason("");
    load();
    onChanged?.();
  };
  const doCancel = async () => {
    try {
      await axios.put(`${API}/booking/${cancel._id}/cancel`, { reason });
      toast.success("Booking cancelled");
      changed();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const today = dayjs().format(F);
  return (
    <Stack spacing={1.5}>
      <Button variant="contained" startIcon={<AddIcon />} onClick={() => setForm({ initial: null })} sx={{ bgcolor: Q.gh, py: 1.2, fontWeight: 800, "&:hover": { bgcolor: Q.gh } }}>
        New advance booking
      </Button>
      <Typography variant="caption" color={Q.muted}>
        On the check-in day, the room card will show &quot;📅 Booking&quot;. Tap it to fill in guest details; the advance is deducted from the room bill.
      </Typography>
      {list === null && <Typography color={Q.muted}>Loading…</Typography>}
      {list?.length === 0 && <Alert severity="info">No upcoming bookings.</Alert>}
      {(list || []).map((b) => {
        const adv = advTotal(b);
        const total = num(b.rate) * (b.nights || 1);
        const isToday = b.checkInDate === today;
        const late = dayjs(b.checkInDate, F).isBefore(dayjs(), "day");
        return (
          <Paper key={b._id} variant="outlined" sx={{ p: 1.5, borderRadius: 3, borderColor: isToday ? Q.gh : late ? "#FCA5A5" : Q.line, borderWidth: isToday ? 2 : 1 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
              <Box sx={{ minWidth: 0 }}>
                <Typography fontWeight={800} noWrap>
                  {b.guestName}
                  {b.company ? ` · ${b.company}` : ""}
                </Typography>
                <Typography variant="caption" color={Q.muted} component="div">
                  {b.bookingNo} · {b.mobile || "No mobile"} · {b.people} guests
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 700, color: isToday ? Q.gh : late ? Q.bad : Q.ink }}>
                  📅 {b.checkInDate}
                  {isToday ? " (TODAY)" : late ? " (no-show)" : ""} · {b.nights} nights · {b.roomNo ? `Room ${b.roomNo}` : "Room not assigned"}
                </Typography>
                {b.notes && (
                  <Typography variant="caption" color={Q.muted}>
                    {b.notes}
                  </Typography>
                )}
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography variant="caption" color={Q.muted} component="div">
                  Total {inr(total)}
                </Typography>
                <Typography fontWeight={800} color={Q.good}>
                  Adv {inr(adv)}
                </Typography>
                <Typography variant="caption" sx={{ color: total - adv > 0 ? Q.bad : Q.good, fontWeight: 700 }}>
                  Due {inr(Math.max(0, total - adv))}
                </Typography>
              </Box>
            </Stack>
            {(b.advances || []).length > 0 && (
              <Typography variant="caption" color={Q.muted} component="div" sx={{ mt: 0.5 }}>
                {b.advances.map((a) => `${inr(a.amount)} ${a.mode} (${a.date})`).join(" · ")}
              </Typography>
            )}
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              <Button size="small" variant="outlined" onClick={() => setAdv(b)}>
                + Advance
              </Button>
              <Button size="small" onClick={() => setForm({ initial: b })}>
                Edit
              </Button>
              {isAdmin && (
                <Button size="small" color="error" onClick={() => setCancel(b)}>
                  Cancel
                </Button>
              )}
            </Stack>
          </Paper>
        );
      })}

      <BookingForm open={!!form} initial={form?.initial} rooms={rooms} onClose={() => setForm(null)} onSaved={changed} />
      <AdvanceDialog booking={adv} onClose={() => setAdv(null)} onSaved={changed} />
      <Dialog open={!!cancel} onClose={() => setCancel(null)}>
        <DialogTitle>Cancel booking {cancel?.bookingNo}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ mb: 1.5 }}>
            Advance of {inr(cancel ? advTotal(cancel) : 0)} was received. Mention in the reason whether it was refunded.
          </Typography>
          <TextField fullWidth autoFocus label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancel(null)}>No</Button>
          <Button color="error" variant="contained" disabled={!reason.trim()} onClick={doCancel}>
            Yes, cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default BookingsPanel;
