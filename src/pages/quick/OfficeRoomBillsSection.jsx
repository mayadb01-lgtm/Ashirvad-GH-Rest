// Office: room ka food bill (Restaurant → room) agar Office mein wasool ho.
// Receive karte hi GH aur Restaurant dono jagah se "baaki" hat jaata hai. Office Book mein alag line NAHI banti
// (warna paisa do baar ginta) — reports mein yeh "old dues received" ki tarah apne mode mein aata hai.
import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Box, Button, Collapse, Stack, Typography } from "@mui/material";
import { API, Q, Section, StatusPill, apiError, inr, num } from "./shared";
import { chargeModeText } from "../../utils/payParts";

const MODES = ["Cash", "PP", "PPS", "PPC"];

const OfficeRoomBillsSection = ({ date, onChanged }) => {
  const [data, setData] = useState({ due: [], paidToday: [] });
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(
    () =>
      axios
        .get(`${API}/rest-dues/room-bills/${date}?at=office`)
        .then(({ data: r }) => setData(r.data || { due: [], paidToday: [] }))
        .catch(() => setData({ due: [], paidToday: [] })),
    [date]
  );
  useEffect(() => {
    load();
  }, [load]);

  const receive = async (c, mode) => {
    if (busy) return;
    setBusy(true);
    try {
      await axios.post(`${API}/rest-dues/room-bills/${c._id}/receive`, { date, mode, at: "office" });
      toast.success(`Room ${c.roomNo} food bill ${inr(c.amount)} received by ${mode}. Removed from Restaurant and GH dues.`);
      setOpen(null);
      load();
      onChanged?.();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  if (!data.due.length && !data.paidToday.length) return null;
  const color = Q.office;
  return (
    <Section
      title="🛏 Room food bills (restaurant)"
      subtitle="If the guest pays the food bill in the Office, receive it here. Do not add it again in Money in."
      total={data.paidToday.reduce((t, c) => t + num(c.amount), 0)}
      color={color}
      sx={{ mb: 2 }}
    >
      {data.due.map((c) => (
        <Box key={c._id} sx={{ py: 0.75, borderTop: `1px solid ${Q.line}` }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>
                Room {c.roomNo}
                {c.guestName ? ` · ${c.guestName}` : ""}
              </Typography>
              <Typography variant="caption" color={Q.muted}>
                Bill of {c.date}
              </Typography>
            </Box>
            <Typography fontWeight={800} sx={{ color: Q.bad }}>
              {inr(c.amount)}
            </Typography>
            <Button size="small" variant="outlined" disabled={busy} onClick={() => setOpen(open === c._id ? null : c._id)} sx={{ fontWeight: 800, color, borderColor: color, minWidth: 0 }}>
              {open === c._id ? "Cancel" : "Receive"}
            </Button>
          </Stack>
          <Collapse in={open === c._id}>
            <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
              {MODES.map((m) => (
                <Button key={m} size="small" variant="contained" disabled={busy} onClick={() => receive(c, m)} sx={{ bgcolor: color, fontWeight: 800, "&:hover": { bgcolor: color } }}>
                  {m}
                </Button>
              ))}
            </Stack>
          </Collapse>
        </Box>
      ))}
      {data.paidToday.length > 0 && (
        <>
          <Typography variant="caption" fontWeight={800} color={Q.muted} sx={{ display: "block", mt: 1.5, mb: 0.5 }}>
            RECEIVED IN OFFICE TODAY
          </Typography>
          {data.paidToday.map((c) => (
            <Stack key={c._id} direction="row" alignItems="center" sx={{ py: 0.6, borderTop: `1px solid ${Q.line}` }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>
                  Room {c.roomNo} food bill{c.guestName ? ` · ${c.guestName}` : ""}
                </Typography>
                <Typography variant="caption" color={Q.muted}>
                  Bill of {c.date}
                  {c.paidBy ? ` · by ${c.paidBy}` : ""} · only owner can undo
                </Typography>
              </Box>
              <Stack alignItems="flex-end">
                <Typography fontWeight={800}>{inr(c.amount)}</Typography>
                <StatusPill tone={c.paidMode === "Cash" ? "good" : "info"}>{chargeModeText(c)}</StatusPill>
              </Stack>
            </Stack>
          ))}
        </>
      )}
    </Section>
  );
};

export default OfficeRoomBillsSection;
