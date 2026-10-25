// Office: teeno counter ka taalmel
//   • GH ka purana baaki Office mein wasool         → GH ki baaki list se hat jaata hai
//   • Restaurant ka udhaar Office mein wasool        → Restaurant ki "kiska kitna baaki" se ghatta hai
//   • Restaurant / GH ka cash Office ko mila          → sirf transfer (kamai nahi)
// In mein se kuch bhi Office "Money in" mein dobara NAHI likhna — warna paisa do baar ginega.
import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Box, Button, Collapse, Stack, Tab, Tabs, TextField, Typography } from "@mui/material";
import { API, ChipChoice, MoneyField, Q, Section, StatusPill, apiError, inr, num } from "./shared";
import { chargeParts } from "../../utils/payParts";

const MODES = ["Cash", "PP", "PPS", "PPC"];

export const useOfficeCounter = (date) => {
  const [gh, setGh] = useState({ due: [], today: [] });
  const [rest, setRest] = useState({ due: [], total: 0 });
  const [restToday, setRestToday] = useState([]);
  const [handover, setHandover] = useState([]);
  const [roomPaid, setRoomPaid] = useState([]); // room food bill jo Office mein wasool hue
  const load = useCallback(() => {
    axios.get(`${API}/rest-dues/room-bills/${date}?at=office`).then(({ data }) => setRoomPaid(data.data?.paidToday || [])).catch(() => setRoomPaid([]));
    axios.get(`${API}/counter/gh-dues/${date}`).then(({ data }) => setGh(data.data || { due: [], today: [] })).catch(() => setGh({ due: [], today: [] }));
    axios.get(`${API}/rest-dues/balances/${date}`).then(({ data }) => setRest(data.data || { due: [], total: 0 })).catch(() => setRest({ due: [], total: 0 }));
    axios.get(`${API}/rest-dues/day/${date}?at=office`).then(({ data }) => setRestToday(data.data || [])).catch(() => setRestToday([]));
    axios.get(`${API}/counter/handover/${date}`).then(({ data }) => setHandover(data.data || [])).catch(() => setHandover([]));
  }, [date]);
  useEffect(() => {
    load();
  }, [load]);
  const byMode = useMemo(() => {
    const o = { Cash: 0, PP: 0, PPS: 0, PPC: 0 };
    gh.today.filter((x) => !x.cancelled).forEach((x) => (o[x.mode] = (o[x.mode] || 0) + num(x.amount)));
    restToday.filter((x) => !x.cancelled).forEach((x) => (o[x.mode] = (o[x.mode] || 0) + num(x.amount)));
    roomPaid.forEach((x) => chargeParts(x).forEach((p) => (o[p.mode] = (o[p.mode] || 0) + num(p.amount))));
    return o;
  }, [gh, restToday, roomPaid]);
  const handIn = handover.filter((h) => !h.cancelled).reduce((t, h) => t + num(h.amount), 0);
  return { gh, rest, restToday, handover, byMode, handIn, reload: load };
};

const Row = ({ title, sub, amount, action, children }) => (
  <Box sx={{ py: 0.75, borderTop: `1px solid ${Q.line}` }}>
    <Stack direction="row" alignItems="center" spacing={1}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={700} noWrap>
          {title}
        </Typography>
        {sub && (
          <Typography variant="caption" color={Q.muted}>
            {sub}
          </Typography>
        )}
      </Box>
      <Typography fontWeight={800} sx={{ fontVariantNumeric: "tabular-nums" }}>
        {amount}
      </Typography>
      {action}
    </Stack>
    {children}
  </Box>
);

const OfficeCounterSection = ({ date, counter }) => {
  const { gh, rest, restToday, handover, reload } = counter;
  const [tab, setTab] = useState("gh");
  const [open, setOpen] = useState(null);
  const [restAmt, setRestAmt] = useState(0);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [hand, setHand] = useState({ from: "Restaurant", amount: 0, note: "" });
  const color = Q.office;

  const run = async (fn, ok) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      toast.success(ok);
      setOpen(null);
      reload();
    } catch (e) {
      toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const s = q.trim().toLowerCase();
  const ghDue = gh.due.filter((r) => !s || `${r.fullname} ${r.mobileNumber} ${r.roomNo}`.toLowerCase().includes(s));
  const restDue = rest.due.filter((r) => !s || `${r.name} ${r.mobile}`.toLowerCase().includes(s));
  const cancelBtn = (url, label) => (
    <Button size="small" color="error" disabled={busy} onClick={() => window.confirm(`Remove ${label}?`) && run(() => axios.put(url), "Removed.")} sx={{ minWidth: 0 }}>
      Remove
    </Button>
  );

  return (
    <Section
      title="🤝 Counters: dues & cash"
      subtitle="Collect GH / Restaurant dues here, and record cash received from the counters. Do NOT enter these again in Money in."
      color={color}
      sx={{ mb: 2 }}
    >
      <Tabs value={tab} onChange={(e, v) => (setTab(v), setOpen(null))} variant="scrollable" sx={{ minHeight: 40, mb: 1 }}>
        <Tab value="gh" label={`GH dues (${gh.due.length})`} sx={{ minHeight: 40 }} />
        <Tab value="rest" label={`Restaurant dues (${rest.due.length})`} sx={{ minHeight: 40 }} />
        <Tab value="cash" label="Cash from counters" sx={{ minHeight: 40 }} />
      </Tabs>

      {tab !== "cash" && <TextField size="small" fullWidth placeholder="Search name, mobile or room" value={q} onChange={(e) => setQ(e.target.value)} sx={{ mb: 1 }} />}

      {tab === "gh" && (
        <>
          {ghDue.slice(0, 30).map((r) => (
            <Row
              key={r.id}
              title={`Room ${r.roomNo} · ${r.fullname || "—"}`}
              sub={`${r.date}${r.mobileNumber ? ` · ${r.mobileNumber}` : ""}`}
              amount={inr(r.rate)}
              action={
                <Button size="small" variant="outlined" onClick={() => setOpen(open === r.id ? null : r.id)} sx={{ fontWeight: 800, color, borderColor: color, minWidth: 0 }}>
                  {open === r.id ? "Cancel" : "Receive"}
                </Button>
              }
            >
              <Collapse in={open === r.id}>
                <Stack direction="row" spacing={1} sx={{ pt: 1 }}>
                  {MODES.map((m) => (
                    <Button key={m} size="small" variant="contained" disabled={busy} onClick={() => run(() => axios.post(`${API}/counter/gh-dues/${r.id}/receive`, { date, mode: m }), `GH due ${inr(r.rate)} received by ${m}. Removed from GH pending.`)} sx={{ bgcolor: color, fontWeight: 800, "&:hover": { bgcolor: color } }}>
                      {m}
                    </Button>
                  ))}
                </Stack>
              </Collapse>
            </Row>
          ))}
          {ghDue.length > 30 && (
            <Typography variant="caption" color={Q.muted}>
              Showing 30 of {ghDue.length}. Search to find others.
            </Typography>
          )}
          {!ghDue.length && <Typography color={Q.muted} sx={{ py: 1 }}>No GH dues.</Typography>}
          {gh.today.length > 0 && (
            <>
              <Typography variant="caption" fontWeight={800} color={Q.muted} sx={{ display: "block", mt: 1.5 }}>
                GH DUES RECEIVED IN OFFICE TODAY
              </Typography>
              {gh.today.map((x) => (
                <Row
                  key={x._id}
                  title={<span style={{ textDecoration: x.cancelled ? "line-through" : "none" }}>{`Room ${x.roomNo} · ${x.name || "—"}`}</span>}
                  sub={`Room of ${x.srcDate}${x.enteredBy ? ` · by ${x.enteredBy}` : ""}${x.cancelled ? " · removed" : ""}`}
                  amount={
                    <Stack alignItems="flex-end">
                      {inr(x.amount)}
                      <StatusPill tone={x.mode === "Cash" ? "good" : "info"}>{x.mode}</StatusPill>
                    </Stack>
                  }
                  action={!x.cancelled && cancelBtn(`${API}/counter/gh-dues/receipt/${x._id}/cancel`, `${inr(x.amount)} from room ${x.roomNo}`)}
                />
              ))}
            </>
          )}
        </>
      )}

      {tab === "rest" && (
        <>
          {restDue.map((r) => (
            <Row
              key={r.name}
              title={r.name}
              sub={`Last credit ${r.lastGiven || "—"}`}
              amount={<span style={{ color: Q.bad }}>{inr(r.balance)}</span>}
              action={
                <Button size="small" variant="outlined" onClick={() => (setOpen(open === r.name ? null : r.name), setRestAmt(r.balance))} sx={{ fontWeight: 800, color, borderColor: color, minWidth: 0 }}>
                  {open === r.name ? "Cancel" : "Receive"}
                </Button>
              }
            >
              <Collapse in={open === r.name}>
                <Stack spacing={1} sx={{ pt: 1 }}>
                  <MoneyField label="Amount received" value={restAmt} onChange={setRestAmt} helperText={num(restAmt) > r.balance ? `More than the balance (${inr(r.balance)})` : ""} error={num(restAmt) > r.balance} />
                  <Stack direction="row" spacing={1}>
                    {MODES.map((m) => (
                      <Button
                        key={m}
                        size="small"
                        variant="contained"
                        disabled={busy || !(num(restAmt) > 0)}
                        onClick={() => run(() => axios.post(`${API}/rest-dues`, { date, name: r.name, amount: num(restAmt), mode: m, at: "office" }), `${inr(restAmt)} received from ${r.name} by ${m}.`)}
                        sx={{ bgcolor: color, fontWeight: 800, "&:hover": { bgcolor: color } }}
                      >
                        {m}
                      </Button>
                    ))}
                  </Stack>
                </Stack>
              </Collapse>
            </Row>
          ))}
          {!restDue.length && <Typography color={Q.muted} sx={{ py: 1 }}>No restaurant dues.</Typography>}
          {restToday.length > 0 && (
            <>
              <Typography variant="caption" fontWeight={800} color={Q.muted} sx={{ display: "block", mt: 1.5 }}>
                RESTAURANT DUES RECEIVED IN OFFICE TODAY
              </Typography>
              {restToday.map((x) => (
                <Row
                  key={x._id}
                  title={<span style={{ textDecoration: x.cancelled ? "line-through" : "none" }}>{x.name}</span>}
                  sub={`${x.enteredBy ? `by ${x.enteredBy}` : ""}${x.cancelled ? " · removed" : ""}`}
                  amount={
                    <Stack alignItems="flex-end">
                      {inr(x.amount)}
                      <StatusPill tone={x.mode === "Cash" ? "good" : "info"}>{x.mode}</StatusPill>
                    </Stack>
                  }
                  action={!x.cancelled && cancelBtn(`${API}/rest-dues/${x._id}/cancel`, `${inr(x.amount)} from ${x.name}`)}
                />
              ))}
            </>
          )}
        </>
      )}

      {tab === "cash" && (
        <>
          <Typography variant="body2" color={Q.muted} sx={{ mb: 1 }}>
            When the Restaurant or GH cashier hands cash to the Office, record it here. It is a transfer between counters — not income.
          </Typography>
          <Stack spacing={1.25}>
            <ChipChoice label="Cash from" options={["Restaurant", "GH"]} value={hand.from} onChange={(v) => setHand((h) => ({ ...h, from: v }))} color={color} />
            <MoneyField label="Cash amount" value={hand.amount} onChange={(v) => setHand((h) => ({ ...h, amount: v }))} />
            <TextField size="small" label="Note (optional)" value={hand.note} onChange={(e) => setHand((h) => ({ ...h, note: e.target.value }))} />
            <Button
              variant="contained"
              disabled={busy || !(num(hand.amount) > 0)}
              onClick={() =>
                run(async () => {
                  await axios.post(`${API}/counter/handover`, { date, from: hand.from === "GH" ? "gh" : "rest", amount: num(hand.amount), note: hand.note });
                  setHand({ from: hand.from, amount: 0, note: "" });
                }, `${inr(hand.amount)} cash received from ${hand.from}.`)
              }
              sx={{ bgcolor: color, fontWeight: 800, "&:hover": { bgcolor: color } }}
            >
              Cash received {num(hand.amount) > 0 ? inr(hand.amount) : ""}
            </Button>
          </Stack>
          {handover.length > 0 && (
            <>
              <Typography variant="caption" fontWeight={800} color={Q.muted} sx={{ display: "block", mt: 1.5 }}>
                CASH RECEIVED FROM COUNTERS TODAY
              </Typography>
              {handover.map((h) => (
                <Row
                  key={h._id}
                  title={<span style={{ textDecoration: h.cancelled ? "line-through" : "none" }}>{h.from === "gh" ? "From GH" : "From Restaurant"}</span>}
                  sub={`${h.enteredBy ? `by ${h.enteredBy}` : ""}${h.note ? ` · ${h.note}` : ""}${h.cancelled ? " · removed" : ""}`}
                  amount={inr(h.amount)}
                  action={!h.cancelled && cancelBtn(`${API}/counter/handover/${h._id}/cancel`, `${inr(h.amount)} cash from ${h.from === "gh" ? "GH" : "Restaurant"}`)}
                />
              ))}
            </>
          )}
        </>
      )}
    </Section>
  );
};

export default OfficeCounterSection;
