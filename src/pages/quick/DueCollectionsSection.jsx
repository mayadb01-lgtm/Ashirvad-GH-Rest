// Restaurant: purana udhaar wasool karna ("Collect old dues").
// Kiska kitna baaki hai dikhata hai, aur paisa milne par Cash / Card / PP (UPI) se receive karta hai.
// Yeh SALE nahi hai — din ke Grand total mein nahi judta. Alag collection mein turant save hota hai.
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Box, Button, ButtonBase, Collapse, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { API, ChipChoice, EditorDialog, MoneyField, PickField, Q, Section, SplitPay, StatusPill, apiError, inr, num } from "./shared";
import { chargeModeText, chargeParts, fillSplit, splitProblem } from "../../utils/payParts";
const RAW_MODES = ["Cash", "Card", "PP"];

const COLOR = "#0E7490";
const MODES = [
  ["Cash", "Cash"],
  ["Card", "Card"],
  ["PP", "PP (UPI)"],
];
const modeLabel = (m) => (m === "PP" ? "PP (UPI)" : m);

export const useDueReceipts = (date) => {
  const [receipts, setReceipts] = useState([]);
  const [due, setDue] = useState({ due: [], total: 0 });
  const [ghCash, setGhCash] = useState([]); // GH counter par Cash mein wasool room food bill, jo abhi Restaurant ko nahi mile
  const [roomBills, setRoomBills] = useState({ due: [], paidToday: [] }); // room ke food bill: baaki + aaj Restaurant par wasool
  const [toOffice, setToOffice] = useState(0); // aaj Office ko diya cash (Office ne record kiya)
  const [ghCard, setGhCard] = useState(null); // GH ka Card — ek hi machine, Restaurant ke PP account mein
  const load = useCallback(() => {
    axios
      .get(`${API}/counter/gh-card/${date}`)
      .then(({ data }) => setGhCard(data.data || null))
      .catch(() => setGhCard(null));
    axios
      .get(`${API}/counter/handover/${date}`)
      .then(({ data }) => setToOffice((data.data || []).filter((h) => h.from === "rest" && !h.cancelled).reduce((t, h) => t + num(h.amount), 0)))
      .catch(() => setToOffice(0));
    axios
      .get(`${API}/rest-dues/room-bills/${date}`)
      .then(({ data }) => setRoomBills(data.data || { due: [], paidToday: [] }))
      .catch(() => setRoomBills({ due: [], paidToday: [] }));
    axios
      .get(`${API}/rest-dues/gh-cash/${date}`)
      .then(({ data }) => setGhCash(data.data || []))
      .catch(() => setGhCash([]));
    axios
      .get(`${API}/rest-dues/day/${date}`)
      .then(({ data }) => setReceipts(data.data || []))
      .catch(() => setReceipts([]));
    axios
      .get(`${API}/rest-dues/balances/${date}`)
      .then(({ data }) => setDue(data.data || { due: [], total: 0 }))
      .catch(() => setDue({ due: [], total: 0 }));
  }, [date]);
  useEffect(() => {
    load();
  }, [load]);
  const live = receipts.filter((r) => !r.cancelled && r.source !== "gh");
  const fromGh = receipts.filter((r) => !r.cancelled && r.source === "gh").reduce((t, r) => t + num(r.amount), 0);
  const byMode = useMemo(() => {
    const o = { Cash: 0, Card: 0, PP: 0 };
    live.forEach((r) => (o[r.mode] = (o[r.mode] || 0) + num(r.amount)));
    roomBills.paidToday.forEach((c) => chargeParts(c).forEach((p) => (o[p.mode] = (o[p.mode] || 0) + num(p.amount))));
    return o;
  }, [live, roomBills]);
  return { receipts, live, due, byMode, fromGh, ghCash, roomBills, toOffice, ghCard, total: byMode.Cash + byMode.Card + byMode.PP, reload: load };
};

const DueCollectionsSection = ({ date, dues }) => {
  const { receipts, due, total, reload, ghCash, fromGh, roomBills } = dues;
  const [roomPay, setRoomPay] = useState(null); // room bill _id jiska mode chun rahe hain
  const [roomSplit, setRoomSplit] = useState(null); // room bill ka paisa do mode mein
  const [form, setForm] = useState(null); // { person, amount, mode, note }
  const [busy, setBusy] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const options = useMemo(() => due.due.map((d) => ({ ...d, label: `${d.name} · baaki ${inr(d.balance)}` })), [due]);
  const openFor = (d) => setForm({ person: d ? { ...d, label: `${d.name} · baaki ${inr(d.balance)}` } : null, amount: d ? d.balance : 0, mode: "Cash", note: "" });
  const over = form?.person && num(form.amount) > num(form.person.balance);

  const save = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const split = form.split ? fillSplit(form.split, num(form.amount)).filter((p) => p.amount > 0) : null;
      await axios.post(`${API}/rest-dues`, { date, name: form.person.name, amount: num(form.amount), mode: form.mode, note: form.note, ...(split ? { split } : {}) });
      toast.success(`${inr(form.amount)} received from ${form.person.name} by ${split ? split.map((p) => `${modeLabel(p.mode)} ${inr(p.amount)}`).join(" + ") : modeLabel(form.mode)}. Not added to sales.`);
      setForm(null);
      reload();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const takeFromGh = async (items) => {
    if (busy || !items.length) return;
    setBusy(true);
    try {
      await axios.post(`${API}/rest-dues/gh-handover`, { date, chargeIds: items.map((c) => c._id) });
      toast.success(`${inr(items.reduce((t, c) => t + num(c.amount), 0))} cash received from GH cashier. Not added to sales.`);
      reload();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const ghTotal = ghCash.reduce((t, c) => t + num(c.amount), 0);
  const receiveRoom = async (c, mode, split) => {
    if (busy) return;
    setBusy(true);
    try {
      await axios.post(`${API}/rest-dues/room-bills/${c._id}/receive`, { date, mode, ...(split ? { split } : {}) });
      toast.success(`Room ${c.roomNo} food bill ${inr(c.amount)} received by ${split ? split.map((p) => `${modeLabel(p.mode)} ${inr(p.amount)}`).join(" + ") : modeLabel(mode)}. It shows as paid on the GH screen too.`);
      setRoomPay(null);
      setRoomSplit(null);
      reload();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (r) => {
    if (!window.confirm(`Remove ${inr(r.amount)} received from ${r.name}?`)) return;
    try {
      await axios.put(`${API}/rest-dues/${r._id}/cancel`);
      toast.success("Removed.");
      reload();
    } catch (e) {
      toast.error(apiError(e));
    }
  };

  const list = showAll ? due.due : due.due.slice(0, 5);
  return (
    <>
      <Section
        title="💰 Collect old dues"
        subtitle={`Who still owes · total ${inr(due.total)} · not added to today's sales`}
        total={total + fromGh}
        color={COLOR}
        action={
          <Button size="small" startIcon={<AddIcon />} onClick={() => openFor(null)} sx={{ fontWeight: 800, color: COLOR }} disabled={!due.due.length}>
            Receive
          </Button>
        }
      >
        {due.due.length === 0 && (
          <Typography variant="body2" color={Q.muted} sx={{ py: 1 }}>
            Nobody owes the restaurant right now.
          </Typography>
        )}
        {list.map((d) => (
          <Stack key={d.name} direction="row" alignItems="center" spacing={1} sx={{ py: 0.75, borderTop: `1px solid ${Q.line}` }}>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={700} noWrap>
                {d.name}
              </Typography>
              <Typography variant="caption" color={d.days > 30 ? Q.bad : Q.muted}>
                Last credit {d.lastGiven || "—"}
                {d.days > 30 ? ` · ${d.days} days` : ""}
              </Typography>
            </Box>
            <Typography fontWeight={800} sx={{ color: Q.bad, fontVariantNumeric: "tabular-nums" }}>
              {inr(d.balance)}
            </Typography>
            <Button size="small" variant="outlined" onClick={() => openFor(d)} sx={{ fontWeight: 800, color: COLOR, borderColor: COLOR, minWidth: 0 }}>
              Receive
            </Button>
          </Stack>
        ))}
        {due.due.length > 5 && (
          <Button size="small" onClick={() => setShowAll((v) => !v)} sx={{ mt: 0.5, fontWeight: 700, color: COLOR }}>
            {showAll ? "Show less" : `Show all ${due.due.length}`}
          </Button>
        )}

        {roomBills.due.length > 0 && (
          <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: "#FFF7ED", border: "1px solid #FED7AA" }}>
            <Typography fontWeight={800}>🛏 Room food bills due · {inr(roomBills.due.reduce((t, c) => t + num(c.amount), 0))}</Typography>
            <Typography variant="caption" color={Q.muted}>
              Usually the GH cashier collects these with the room bill. If the guest pays here, receive it here — GH will see it as paid.
            </Typography>
            {roomBills.due.map((c) => (
              <Box key={c._id} sx={{ py: 0.6, borderTop: `1px solid #FED7AA`, mt: 0.5 }}>
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
                  <Button size="small" variant="outlined" disabled={busy} onClick={() => {
                      setRoomPay(roomPay === c._id ? null : c._id);
                      setRoomSplit(null);
                    }} sx={{ fontWeight: 800, color: COLOR, borderColor: COLOR, minWidth: 0 }}>
                    {roomPay === c._id ? "Cancel" : "Receive"}
                  </Button>
                </Stack>
                <Collapse in={roomPay === c._id}>
                  <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                    {MODES.map(([v, l]) => (
                      <Button key={v} size="small" variant="contained" disabled={busy} onClick={() => receiveRoom(c, v)} sx={{ bgcolor: COLOR, fontWeight: 800, "&:hover": { bgcolor: COLOR } }}>
                        {l}
                      </Button>
                    ))}
                    <Button size="small" variant={roomSplit ? "contained" : "outlined"} disabled={busy} onClick={() => setRoomSplit((s) => (s ? null : fillSplit([{ mode: "Cash", amount: 0 }, { mode: "PP", amount: num(c.amount) }], num(c.amount))))} sx={{ fontWeight: 800, color: roomSplit ? "#fff" : COLOR, borderColor: COLOR, bgcolor: roomSplit ? COLOR : undefined }}>
                      Split
                    </Button>
                  </Stack>
                  {roomSplit && roomPay === c._id && (
                    <Stack spacing={1} sx={{ pt: 1 }}>
                      <SplitPay total={num(c.amount)} modes={RAW_MODES} value={roomSplit} onChange={setRoomSplit} color={COLOR} disabled={busy} />
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy || !!splitProblem(fillSplit(roomSplit, num(c.amount)), num(c.amount))}
                        onClick={() => receiveRoom(c, "", fillSplit(roomSplit, num(c.amount)).filter((p) => p.amount > 0))}
                        sx={{ bgcolor: COLOR, fontWeight: 800, alignSelf: "flex-start", "&:hover": { bgcolor: COLOR } }}
                      >
                        Receive {inr(c.amount)} (split)
                      </Button>
                    </Stack>
                  )}
                </Collapse>
              </Box>
            ))}
          </Box>
        )}

        {ghCash.length > 0 && (
          <Box sx={{ mt: 1.5, p: 1.25, borderRadius: 2, bgcolor: "#F0FDFA", border: "1px solid #99F6E4" }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Box sx={{ flex: 1 }}>
                <Typography fontWeight={800}>🛏 Cash to take from GH cashier · {inr(ghTotal)}</Typography>
                <Typography variant="caption" color={Q.muted}>
                  Room food bills the GH cashier collected in cash. Tap when you get the money.
                </Typography>
              </Box>
              {ghCash.length > 1 && (
                <Button size="small" variant="contained" disabled={busy} onClick={() => takeFromGh(ghCash)} sx={{ bgcolor: COLOR, fontWeight: 800, "&:hover": { bgcolor: COLOR } }}>
                  All received
                </Button>
              )}
            </Stack>
            {ghCash.map((c) => (
              <Stack key={c._id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.6, borderTop: `1px solid #CCFBF1`, mt: 0.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography fontWeight={700} noWrap>
                    Room {c.roomNo}
                    {c.guestName ? ` · ${c.guestName}` : ""}
                  </Typography>
                  <Typography variant="caption" color={Q.muted}>
                    Bill {c.date} · paid at GH {c.paidDate}
                    {c.paidBy ? ` · ${c.paidBy}` : ""}
                  </Typography>
                </Box>
                <Typography fontWeight={800}>{inr(c.amount)}</Typography>
                <Button size="small" variant="outlined" disabled={busy} onClick={() => takeFromGh([c])} sx={{ fontWeight: 800, color: COLOR, borderColor: COLOR, minWidth: 0 }}>
                  Received
                </Button>
              </Stack>
            ))}
          </Box>
        )}

        <Collapse in={receipts.length > 0 || roomBills.paidToday.length > 0}>
          <Typography variant="caption" fontWeight={800} color={Q.muted} sx={{ display: "block", mt: 1.5, mb: 0.5 }}>
            RECEIVED TODAY
          </Typography>
          {roomBills.paidToday.map((c) => (
            <Stack key={c._id} direction="row" alignItems="center" sx={{ py: 0.75, borderTop: `1px solid ${Q.line}` }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} noWrap>
                  Room {c.roomNo} food bill{c.guestName ? ` · ${c.guestName}` : ""}
                </Typography>
                <Typography variant="caption" color={Q.muted}>
                  Bill of {c.date}
                  {c.paidBy ? ` · by ${c.paidBy}` : ""} · paid on GH screen too (only owner can undo)
                </Typography>
              </Box>
              <Stack alignItems="flex-end">
                <Typography fontWeight={800}>{inr(c.amount)}</Typography>
                <StatusPill tone={c.paidMode === "Cash" ? "good" : "info"}>{chargeModeText(c, modeLabel)}</StatusPill>
              </Stack>
            </Stack>
          ))}
          {receipts.map((r) => (
            <ButtonBase
              key={r._id}
              disabled={r.cancelled}
              onClick={() => cancel(r)}
              sx={{ width: "100%", textAlign: "left", display: "flex", py: 0.75, borderTop: `1px solid ${Q.line}`, opacity: r.cancelled ? 0.5 : 1 }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={700} noWrap sx={{ textDecoration: r.cancelled ? "line-through" : "none" }}>
                  {r.name}
                </Typography>
                <Typography variant="caption" color={Q.muted}>
                  {r.enteredBy ? `by ${r.enteredBy}` : ""}
                  {r.note ? ` · ${r.note}` : ""}
                  {r.cancelled ? " · removed" : " · tap to remove"}
                </Typography>
              </Box>
              <Stack alignItems="flex-end">
                <Typography fontWeight={800}>{inr(r.amount)}</Typography>
                <StatusPill tone={r.mode === "Cash" ? "good" : "info"}>{r.source === "gh" ? "Cash · from GH" : modeLabel(r.mode)}</StatusPill>
              </Stack>
            </ButtonBase>
          ))}
        </Collapse>
      </Section>

      <EditorDialog
        open={!!form}
        onClose={() => setForm(null)}
        subtitle={`Restaurant · ${date}`}
        title="Receive old dues"
        actions={
          <Button
            fullWidth
            variant="contained"
            disabled={busy || !form?.person || !(num(form?.amount) > 0) || (!!form?.split && !!splitProblem(fillSplit(form.split, num(form.amount)), num(form.amount)))}
            onClick={save}
            sx={{ bgcolor: COLOR, py: 1.4, fontWeight: 800, fontSize: 16, "&:hover": { bgcolor: COLOR } }}
          >
            {busy ? "Saving…" : `Receive ${inr(form?.amount)}`}
          </Button>
        }
      >
        {form && (
          <Stack spacing={2}>
            <PickField
              label="Who paid"
              options={options}
              value={form.person}
              getLabel={(o) => o?.label || o?.name || ""}
              onChange={(v) => setForm((f) => ({ ...f, person: v, amount: v ? v.balance : f.amount }))}
            />
            <MoneyField
              label="Amount received"
              value={form.amount}
              onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
              big
              helperText={over ? `More than the balance (${inr(form.person.balance)}). Please check.` : form.person ? `Balance ${inr(form.person.balance)}` : ""}
              error={over}
            />
            <ChipChoice
              label="Mode of payment"
              options={[...MODES.map(([, l]) => l), "Split"]}
              value={form.split ? "Split" : modeLabel(form.mode)}
              onChange={(l) =>
                setForm((f) =>
                  l === "Split"
                    ? { ...f, split: fillSplit([{ mode: "Cash", amount: 0 }, { mode: "PP", amount: num(f.amount) }], num(f.amount)) }
                    : { ...f, split: null, mode: MODES.find(([, x]) => x === l)[0] }
                )
              }
              color={COLOR}
            />
            {form.split && <SplitPay total={num(form.amount)} modes={RAW_MODES} value={form.split} onChange={(rows) => setForm((f) => ({ ...f, split: rows }))} color={COLOR} />}
            <TextField label="Note (optional)" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} fullWidth />
            <Typography variant="body2" color={Q.muted}>
              This money is <b>not</b> added to today's sales (the sale was already counted when credit was given). Cash received goes into the cash drawer — it is shown
              separately in the summary.
            </Typography>
          </Stack>
        )}
      </EditorDialog>
    </>
  );
};

export default DueCollectionsSection;
