// Restaurant: purana udhaar wasool karna ("Collect old dues").
// Kiska kitna baaki hai dikhata hai, aur paisa milne par Cash / Card / PP (UPI) se receive karta hai.
// Yeh SALE nahi hai — din ke Grand total mein nahi judta. Alag collection mein turant save hota hai.
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Box, Button, ButtonBase, Collapse, Stack, TextField, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { API, ChipChoice, EditorDialog, MoneyField, PickField, Q, Section, StatusPill, apiError, inr, num } from "./shared";

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
  const load = useCallback(() => {
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
  const live = receipts.filter((r) => !r.cancelled);
  const byMode = useMemo(() => {
    const o = { Cash: 0, Card: 0, PP: 0 };
    live.forEach((r) => (o[r.mode] = (o[r.mode] || 0) + num(r.amount)));
    return o;
  }, [live]);
  return { receipts, live, due, byMode, total: byMode.Cash + byMode.Card + byMode.PP, reload: load };
};

const DueCollectionsSection = ({ date, dues }) => {
  const { receipts, due, total, reload } = dues;
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
      await axios.post(`${API}/rest-dues`, { date, name: form.person.name, amount: num(form.amount), mode: form.mode, note: form.note });
      toast.success(`${inr(form.amount)} received from ${form.person.name} by ${modeLabel(form.mode)}. Not added to sales.`);
      setForm(null);
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
        total={total}
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

        <Collapse in={receipts.length > 0}>
          <Typography variant="caption" fontWeight={800} color={Q.muted} sx={{ display: "block", mt: 1.5, mb: 0.5 }}>
            RECEIVED TODAY
          </Typography>
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
                <StatusPill tone={r.mode === "Cash" ? "good" : "info"}>{modeLabel(r.mode)}</StatusPill>
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
            disabled={busy || !form?.person || !(num(form?.amount) > 0)}
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
              options={MODES.map(([, l]) => l)}
              value={modeLabel(form.mode)}
              onChange={(l) => setForm((f) => ({ ...f, mode: MODES.find(([, x]) => x === l)[0] }))}
              color={COLOR}
            />
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
