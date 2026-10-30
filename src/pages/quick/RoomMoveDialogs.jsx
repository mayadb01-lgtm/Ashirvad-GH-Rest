// Room shift / swap (wajah zaroori) aur bill merge ke dialogs.
import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { API, EditorDialog, Q, apiError } from "./shared";

const REASONS = ["Guest request", "AC / maintenance issue", "Upgrade", "Noise / cleanliness complaint", "Family wants rooms together"];

/* ---------- Shift / Swap ---------- */
export const RoomMoveDialog = ({ open, onClose, date, period, fromRoom, guest, rooms = [], occupant, onDone, presetTo = "", presetReason = "" }) => {
  const [toRoom, setToRoom] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setToRoom(presetTo ? Number(presetTo) : "");
      setReason(presetReason || "");
    }
  }, [open, presetTo, presetReason]);
  const target = toRoom ? occupant(Number(toRoom)) : null;
  const swap = !!target;

  const save = async () => {
    if (!toRoom) return toast.error("Choose the new room");
    if (reason.trim().length < 3) return toast.error("Reason is required");
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/stay/move`, {
        date,
        period,
        fromRoom,
        toRoom: Number(toRoom),
        reason: reason.trim(),
        guestFrom: guest,
        guestTo: target || null,
      });
      toast.success(data.data.type === "swap" ? `Rooms ${fromRoom} ⇄ ${toRoom} swapped` : `Guest shifted ${fromRoom} → ${toRoom}`);
      onDone?.(data.data.type, Number(toRoom), data.data.periodInB, data.data.periodInA);
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <EditorDialog
      open={open}
      onClose={onClose}
      subtitle={`Room ${fromRoom} · ${guest?.fullname || ""}`}
      title="⇄ Shift / swap room"
      actions={
        <Button fullWidth variant="contained" disabled={busy || !toRoom || reason.trim().length < 3} onClick={save} sx={{ bgcolor: Q.gh, py: 1.3, fontWeight: 800, "&:hover": { bgcolor: Q.gh } }}>
          {!toRoom ? "Choose a room" : swap ? `Swap ${fromRoom} ⇄ ${toRoom}` : `Shift to Room ${toRoom}`}
        </Button>
      }
    >
      <Stack spacing={2}>
        <TextField select label="New room" value={toRoom} onChange={(e) => setToRoom(e.target.value)} fullWidth>
          {rooms
            .filter((r) => r.roomNumber !== fromRoom)
            .map((r) => {
              const o = occupant(r.roomNumber);
              return (
                <MenuItem key={r.roomNumber} value={r.roomNumber}>
                  {r.roomNumber} · {r.roomType} — {o ? `occupied: ${o.fullname || "guest"} (swap)` : "vacant (shift)"}
                </MenuItem>
              );
            })}
        </TextField>
        {toRoom && (
          <Alert severity={swap ? "warning" : "info"}>
            {swap
              ? `Swap: ${guest?.fullname || "this guest"} goes to Room ${toRoom}, and ${target.fullname || "that guest"} comes to Room ${fromRoom}.`
              : `Shift: ${guest?.fullname || "this guest"} moves to Room ${toRoom}. Room ${fromRoom} becomes vacant (dirty).`}{" "}
            Today&apos;s rent, food/extra charges and registration move with the guest. Earlier days&apos; rent stays in the old room, and its unpaid food/extra bills show in the new room and are included at check-out.
          </Alert>
        )}
        <Box>
          <Typography variant="caption" color={Q.muted} fontWeight={700}>
            Reason (required)
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ my: 1 }}>
            {REASONS.map((r) => (
              <Chip key={r} label={r} onClick={() => setReason(r)} color={reason === r ? "primary" : "default"} variant={reason === r ? "filled" : "outlined"} />
            ))}
          </Stack>
          <TextField fullWidth label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required error={!!toRoom && reason.trim().length < 3} />
        </Box>
      </Stack>
    </EditorDialog>
  );
};

/* ---------- Bill merge (group) ---------- */
export const MergeBillDialog = ({ open, onClose, date, mainRoom, candidates = [], onDone }) => {
  const [picked, setPicked] = useState([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setPicked([]);
      setName("");
    }
  }, [open]);
  const save = async () => {
    if (!picked.length) return toast.error("Choose at least one room");
    setBusy(true);
    try {
      await axios.post(`${API}/stay/group`, { date, mainRoom, rooms: picked, name });
      toast.success(`Bills merged into Room ${mainRoom}`);
      onDone?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <EditorDialog
      open={open}
      onClose={onClose}
      subtitle={`Main room ${mainRoom}`}
      title="🔗 Merge bills"
      actions={
        <Button fullWidth variant="contained" disabled={busy || !picked.length} onClick={save} sx={{ bgcolor: Q.gh, py: 1.3, fontWeight: 800, "&:hover": { bgcolor: Q.gh } }}>
          Merge {picked.length ? `${picked.length + 1} rooms` : ""} into Room {mainRoom}
        </Button>
      }
    >
      <Stack spacing={1.5}>
        <Alert severity="info">
          The selected rooms&apos; rent, food and extra charges will be billed on Room {mainRoom}: one invoice, and check-out happens together from Room {mainRoom}.
        </Alert>
        <TextField label="Party / company name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        {candidates.length === 0 && <Typography color={Q.muted}>No other checked-in rooms today.</Typography>}
        {candidates.map((c) => (
          <FormControlLabel
            key={c.roomNo}
            control={<Checkbox checked={picked.includes(c.roomNo)} onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.roomNo] : p.filter((x) => x !== c.roomNo)))} />}
            label={`Room ${c.roomNo} · ${c.name || "guest"}`}
          />
        ))}
      </Stack>
    </EditorDialog>
  );
};

/* ---------- Check-in entry hataana (wajah zaroori, owner ko dikhta hai) ---------- */
const REMOVE_REASONS = ["Wrong room selected", "Duplicate entry", "Guest cancelled before staying", "Wrong guest details"];
export const RemoveEntryDialog = ({ open, onClose, roomNo, guest, onConfirm }) => {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setReason("");
  }, [open]);
  const go = async () => {
    if (reason.trim().length < 3) return toast.error("Reason is required");
    setBusy(true);
    try {
      await onConfirm(reason.trim());
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <EditorDialog
      open={open}
      onClose={onClose}
      subtitle={`Room ${roomNo || ""}${guest?.fullname ? ` · ${guest.fullname}` : ""}`}
      title="Remove check-in entry?"
      actions={
        <Button fullWidth variant="contained" color="error" disabled={busy || reason.trim().length < 3} onClick={go} sx={{ py: 1.3, fontWeight: 800 }}>
          Remove entry
        </Button>
      }
    >
      <Stack spacing={2}>
        <Alert severity="warning">
          This removal is recorded with your name, the time, the guest details{guest?.rate ? ` (rate ₹${Math.round(Number(guest.rate) || 0)}${guest?.modeOfPayment ? `, ${guest.modeOfPayment}` : ""})` : ""} and the reason. The owner can see it.
        </Alert>
        <Box>
          <Typography variant="caption" color={Q.muted} fontWeight={700}>
            Reason (required)
          </Typography>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ my: 1 }}>
            {REMOVE_REASONS.map((r) => (
              <Chip key={r} label={r} onClick={() => setReason(r)} color={reason === r ? "primary" : "default"} variant={reason === r ? "filled" : "outlined"} />
            ))}
          </Stack>
          <TextField fullWidth label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} required />
        </Box>
      </Stack>
    </EditorDialog>
  );
};
