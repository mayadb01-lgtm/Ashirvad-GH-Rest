// Room ka poora bill: Room rent + Restaurant food bill (Levana baaki se apne aap) + Extra charges.
// Ye sab alag "roomcharges" collection mein hai — GH entry submit/lock se iska koi lena-dena nahi,
// isliye checkout pe staff baad mein bhi food/extra ka "Paid" kar sakta hai.
import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Box, Button, IconButton, MenuItem, Paper, Stack, TextField, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { API, MoneyField, Q, apiError, inr, num } from "./shared";

const EXTRA_LABELS = ["Extra bed", "Extra person", "Laundry", "Late checkout", "Early check-in", "Mineral water", "Room service", "Other"];
const PAID_MODES = ["Cash", "Card", "PPS", "PPC"];

const Row = ({ c, isAdmin, onChanged }) => {
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const call = async (fn) => {
    setBusy(true);
    try {
      await fn();
      setPaying(false);
      onChanged?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const markPaid = (mode) => call(() => axios.put(`${API}/room-charges/paid/${c._id}`, { isPaid: true, paidMode: mode }));
  const unPay = () => call(() => axios.put(`${API}/room-charges/paid/${c._id}`, { isPaid: false }));
  const remove = () => call(() => axios.delete(`${API}/room-charges/extra/${c._id}`));

  return (
    <Box sx={{ py: 0.75, borderTop: `1px solid ${Q.line}` }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography sx={{ fontSize: 18 }}>{c.kind === "food" ? "🍽" : "➕"}</Typography>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography fontWeight={700} noWrap>
            {c.label}
          </Typography>
          <Typography variant="caption" color={Q.muted} noWrap component="div">
            {c.kind === "food" ? `Restaurant · ${c.restDate || c.date}` : `GH · ${c.enteredBy || ""}`}
            {c.guestName ? ` · ${c.guestName}` : ""}
          </Typography>
        </Box>
        <Typography fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {inr(c.amount)}
        </Typography>
        {c.isPaid ? (
          <Box
            component={isAdmin ? "button" : "span"}
            onClick={isAdmin ? unPay : undefined}
            title={isAdmin ? "Mark as unpaid" : ""}
            sx={{ fontSize: 12, fontWeight: 700, px: 1.1, py: 0.3, borderRadius: 10, bgcolor: "#CCFBF1", color: "#115E59", border: 0, cursor: isAdmin ? "pointer" : "default" }}
          >
            ✓ {c.paidMode}
            {c.paidAt === "rest" ? " · at restaurant" : c.paidAt === "office" ? " · at office" : ""}
          </Box>
        ) : (
          <Button size="small" variant="outlined" color="error" disabled={busy} onClick={() => setPaying((p) => !p)} sx={{ minWidth: 0, fontWeight: 700, px: 1 }}>
            Due
          </Button>
        )}
        {c.kind === "extra" && (!c.isPaid || isAdmin) && (
          <IconButton size="small" onClick={remove} disabled={busy} aria-label="Remove">
            <DeleteIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>
      {paying && (
        <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: 0.75, ml: 4 }} flexWrap="wrap" useFlexGap>
          <Typography variant="caption" color={Q.muted}>
            Paid via:
          </Typography>
          {(c.kind === "food" ? [...PAID_MODES, "PP"] : PAID_MODES).map((m) => (
            <Button key={m} size="small" variant="contained" disabled={busy} onClick={() => markPaid(m)} sx={{ bgcolor: Q.gh, minWidth: 0, px: 1.25, "&:hover": { bgcolor: Q.gh } }}>
              {m === "PP" ? "PP (Restaurant UPI)" : m}
            </Button>
          ))}
        </Stack>
      )}
    </Box>
  );
};

const RoomChargesPanel = ({ date, period, roomNo, guestName, mobile, charges = [], roomRate = 0, discount = 0, roomPaid, isAdmin, onChanged, advance = 0 }) => {
  const [label, setLabel] = useState("Extra bed");
  const [other, setOther] = useState("");
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState(false);

  const food = charges.filter((c) => c.kind === "food");
  const extra = charges.filter((c) => c.kind === "extra");
  const sumOf = (l) => l.reduce((s, c) => s + num(c.amount), 0);
  const rent = Math.max(0, num(roomRate)); // Rate = room ki final rakam
  // Discount poore bill (room + food + extra) par lagta hai
  const disc = Math.max(0, num(discount));
  const total = Math.max(0, rent + sumOf(food) + sumOf(extra) - disc);
  const due = Math.max(0, (roomPaid ? 0 : rent) + sumOf(charges.filter((c) => !c.isPaid)) - num(advance) - disc);

  const add = async () => {
    const l = label === "Other" ? other.trim() : label;
    if (!l || !(num(amount) > 0)) return toast.error("Fill in: item and amount");
    setBusy(true);
    try {
      await axios.post(`${API}/room-charges/extra`, { date, period, roomNo, label: l, amount: num(amount), guestName, mobile });
      toast.success("Extra charge added");
      setAmount(0);
      setOther("");
      onChanged?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2.5, borderColor: "#99F6E4", bgcolor: "#F0FDFA" }}>
      <Typography fontWeight={800} sx={{ mb: 0.5 }}>
        🧾 Food bill + Extra charges
      </Typography>
      <Typography variant="caption" color={Q.muted} component="div" sx={{ mb: 0.5 }}>
        Food bills entered for this room under Restaurant "Receivables" appear here automatically.
      </Typography>

      {charges.length === 0 && (
        <Typography variant="body2" color={Q.muted} sx={{ py: 0.75 }}>
          No food bill or extra charge yet.
        </Typography>
      )}
      {[...food, ...extra].map((c) => (
        <Row key={c._id} c={c} isAdmin={isAdmin} onChanged={onChanged} />
      ))}

      <Stack direction="row" spacing={1} sx={{ mt: 1.25 }} alignItems="flex-start">
        <TextField select size="small" label="Extra charge" value={label} onChange={(e) => setLabel(e.target.value)} sx={{ minWidth: 140 }}>
          {EXTRA_LABELS.map((x) => (
            <MenuItem key={x} value={x}>
              {x}
            </MenuItem>
          ))}
        </TextField>
        {label === "Other" && <TextField size="small" label="Item" value={other} onChange={(e) => setOther(e.target.value)} sx={{ flex: 1 }} />}
        <MoneyField label="Amount" value={amount} onChange={setAmount} sx={{ maxWidth: 130, "& .MuiInputBase-root": { height: 40 } }} />
        <Button variant="contained" onClick={add} disabled={busy || !roomNo} sx={{ bgcolor: Q.gh, height: 40, fontWeight: 800, "&:hover": { bgcolor: Q.gh } }}>
          Add
        </Button>
      </Stack>

      <Box sx={{ mt: 1.5, pt: 1, borderTop: `1px dashed ${Q.line}` }}>
        {[
          [`Room rent${roomPaid ? " (paid)" : ""}`, rent],
          ["Food bill", sumOf(food)],
          ["Extra charges", sumOf(extra)],
          ...(disc > 0 ? [["Discount (on total bill)", -disc]] : []),
          ...(num(advance) > 0 ? [["Booking advance (received)", -num(advance)]] : []),
        ].map(([l, v]) => (
          <Stack key={l} direction="row" justifyContent="space-between">
            <Typography variant="body2" color={Q.muted}>
              {l}
            </Typography>
            <Typography variant="body2" fontWeight={600}>
              {v < 0 ? `− ${inr(-v)}` : inr(v)}
            </Typography>
          </Stack>
        ))}
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 0.5 }}>
          <Typography fontWeight={800}>Total bill</Typography>
          <Typography fontWeight={800}>{inr(total)}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between">
          <Typography fontWeight={800} color={due > 0 ? Q.bad : Q.good}>
            {due > 0 ? "Balance due from guest" : "Fully paid"}
          </Typography>
          <Typography fontWeight={800} color={due > 0 ? Q.bad : Q.good}>
            {inr(due)}
          </Typography>
        </Stack>
      </Box>
    </Paper>
  );
};

export default RoomChargesPanel;
