// Restaurant receivables: kiska kitna baaki hai (Restaurant mein udhaar diya − Office mein wasool hua). Sirf dikhane ke liye.
import { Fragment, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import DownloadIcon from "@mui/icons-material/Download";
import axios from "axios";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { API, COLORS, Kpi, PageTitle, Section, inr, lakh } from "./shared";

const Q2 = { muted: "#64748B" };

const RestReceivableBalance = () => {
  const [data, setData] = useState(null);
  const [q, setQ] = useState("");
  const [show, setShow] = useState("due");
  const [open, setOpen] = useState({});
  const [adj, setAdj] = useState(null); // { name, kind, amount, note, date }

  const load = () =>
    axios
      .get(`${API}/insights/rest-receivables`)
      .then(({ data: r }) => setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load receivables"));
  useEffect(() => {
    load();
  }, []);
  const saveAdj = async () => {
    try {
      await axios.post(`${API}/rest-dues/adjust`, { ...adj, amount: Number(adj.amount) || 0, date: dayjs(adj.date).format("DD-MM-YYYY") });
      toast.success("Saved. Only the balance changes — no money is counted.");
      setAdj(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save");
    }
  };
  const cancelAdj = async (id) => {
    if (!window.confirm("Remove this correction?")) return;
    await axios.put(`${API}/rest-dues/adjust/${id}/cancel`).catch(() => {});
    load();
  };
  const newAdj = (name = "", balance = 0) =>
    setAdj({ name, kind: balance < 0 ? "opening" : "writeoff", amount: name ? Math.abs(balance) || "" : "", note: "", date: dayjs().format("YYYY-MM-DD") });

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (data?.rows || [])
      .filter((r) => (show === "due" ? r.balance > 0 : true))
      .filter((r) => !s || r.name.toLowerCase().includes(s) || String(r.mobile || "").includes(s));
  }, [data, q, show]);
  const t = data?.totals || {};

  const exportExcel = () => {
    if (!data) return;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        data.rows.map((r) => ({ Name: r.name, Mobile: r.mobile, "Given on credit": r.given, "Received": r.received, Balance: r.balance, "Last credit": r.lastGiven, "Last received": r.lastReceived, "Days since credit": r.days }))
      ),
      "Who owes"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(data.rows.flatMap((r) => r.ledger.map((l) => ({ Name: r.name, Date: l.date, Type: l.kind === "given" ? "Credit given" : "Received", Amount: l.amount, Balance: l.balance, Note: l.note })))),
      "Ledger"
    );
    XLSX.writeFile(wb, "Restaurant_receivables.xlsx");
  };

  const td = { textAlign: "right", whiteSpace: "nowrap" };
  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Restaurant receivables — who owes" sub="Credit given in the Restaurant minus money received for it (Restaurant screen or Office Book). View only." />
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Kpi label="Still to collect" value={lakh(t.due)} sub={`${t.people || 0} people`} color={COLORS.bad} />
        <Kpi label="Credit given (all time)" value={lakh(t.given)} color={COLORS.out} />
        <Kpi label="Received (Restaurant + Office)" value={lakh(t.received)} color={COLORS.net} />
        <Kpi
          label="Room bills — due at GH counter"
          value={lakh(data?.room?.due)}
          sub={`Given ${lakh(data?.room?.given)} · collected at GH ${lakh(data?.room?.collected)}`}
          color={data?.room?.due ? COLORS.bad : undefined}
        />
      </Stack>
      <Alert severity="info" sx={{ mb: 2 }}>
        Money received on the Restaurant screen (<b>Collect old dues</b>) and in the Office Book under <b>Pending</b> with the same person's name is subtracted here. In the reports this Office money is <b>not</b> counted as
        revenue again, because the sale was already counted on the day the Restaurant gave credit.
      </Alert>

      <Section
        title={`People (${rows.length})`}
        right={
          <Stack direction="row" spacing={1} alignItems="center">
            <ToggleButtonGroup size="small" exclusive value={show} onChange={(e, v) => v && setShow(v)}>
              <ToggleButton value="due">Balance due</ToggleButton>
              <ToggleButton value="all">All</ToggleButton>
            </ToggleButtonGroup>
            <TextField size="small" placeholder="Search name / mobile" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="outlined" onClick={() => newAdj("", -1)}>
              + Opening balance
            </Button>
            <Button variant="contained" startIcon={<DownloadIcon />} onClick={exportExcel} disabled={!data}>
              Excel
            </Button>
          </Stack>
        }
      >
        {!data ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Loading…</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["", "Name", "Given on credit", "Received", "Balance", "Last credit", "Last received"].map((h, i) => (
                    <TableCell key={h + i} sx={{ fontWeight: 800, whiteSpace: "nowrap", textAlign: i >= 2 ? "right" : "left" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <Fragment key={r.key}>
                    <TableRow hover>
                      <TableCell sx={{ width: 40 }}>
                        <IconButton size="small" onClick={() => setOpen((o) => ({ ...o, [r.key]: !o[r.key] }))}>
                          {open[r.key] ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <b>{r.name}</b>
                        {r.mobile ? (
                          <Typography variant="caption" display="block" color="text.secondary">
                            {r.mobile}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell sx={td}>{inr(r.given)}</TableCell>
                      <TableCell sx={td}>{inr(r.received)}</TableCell>
                      <TableCell sx={{ ...td, fontWeight: 800, color: r.balance > 0 ? COLORS.bad : COLORS.net }}>
                        {r.balance < 0 ? (
                          <Chip size="small" label={`Extra received ${inr(-r.balance)}`} sx={{ bgcolor: "#DCFCE7", color: "#166534", fontWeight: 700 }} />
                        ) : (
                          inr(r.balance)
                        )}
                      </TableCell>
                      <TableCell sx={td}>
                        {r.lastGiven || "—"}
                        {r.balance > 0 && r.days > 30 && (
                          <Typography variant="caption" display="block" color={COLORS.bad}>
                            {r.days} days ago
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell sx={td}>
                        {r.lastReceived || "—"}
                        <Button size="small" onClick={() => newAdj(r.name, r.balance)} sx={{ ml: 1, minWidth: 0, fontWeight: 700 }}>
                          Correct
                        </Button>
                      </TableCell>
                    </TableRow>
                    {open[r.key] &&
                      r.ledger.map((l, i) => (
                        <TableRow key={r.key + i} sx={{ bgcolor: "#F8FAFC" }}>
                          <TableCell />
                          <TableCell sx={{ pl: 3 }}>
                            {l.date} · <span style={{ color: l.kind === "given" ? COLORS.out : COLORS.net, fontWeight: 700 }}>{l.kind === "given" ? "Credit given" : "Received"}</span>
                            <Typography variant="caption" display="block" color="text.secondary">
                              {l.note}
                              {l.adjustId && (
                                <Button size="small" color="error" onClick={() => cancelAdj(l.adjustId)} sx={{ ml: 1, minWidth: 0, p: 0 }}>
                                  remove
                                </Button>
                              )}
                            </Typography>
                          </TableCell>
                          <TableCell sx={td}>{l.kind === "given" ? inr(l.amount) : ""}</TableCell>
                          <TableCell sx={td}>{l.kind === "received" ? inr(l.amount) : ""}</TableCell>
                          <TableCell sx={td}>{inr(l.balance)}</TableCell>
                          <TableCell colSpan={2} />
                        </TableRow>
                      ))}
                  </Fragment>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Typography color="text.secondary">Nothing pending.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>

      <Dialog open={!!adj} onClose={() => setAdj(null)} fullWidth maxWidth="xs">
        <DialogTitle>Correct balance (owner)</DialogTitle>
        {adj && (
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <TextField label="Name" value={adj.name} onChange={(e) => setAdj((a) => ({ ...a, name: e.target.value }))} helperText="Same name as in Receivables" />
              <TextField select label="Type" value={adj.kind} onChange={(e) => setAdj((a) => ({ ...a, kind: e.target.value }))}>
                <MenuItem value="opening">Opening balance — old credit from before the app (adds to balance)</MenuItem>
                <MenuItem value="writeoff">Write-off / settled outside the app (reduces balance)</MenuItem>
              </TextField>
              <TextField label="Amount" type="number" value={adj.amount} onChange={(e) => setAdj((a) => ({ ...a, amount: e.target.value }))} />
              <TextField label="Date" type="date" value={adj.date} onChange={(e) => setAdj((a) => ({ ...a, date: e.target.value }))} InputLabelProps={{ shrink: true }} />
              <TextField label="Note" value={adj.note} onChange={(e) => setAdj((a) => ({ ...a, note: e.target.value }))} />
              <Typography variant="caption" color="text.secondary">
                This only corrects who owes how much. It is not money — it is not counted in cash, balance or profit reports.
              </Typography>
            </Stack>
          </DialogContent>
        )}
        <DialogActions>
          <Button onClick={() => setAdj(null)}>Cancel</Button>
          <Button variant="contained" onClick={saveAdj} disabled={!adj?.name?.trim() || !(Number(adj?.amount) > 0)}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {!!data?.room?.dueList?.length && (
        <Section title={`Room bills still due at GH (${data.room.dueList.length})`}>
          <Typography variant="body2" color={Q2.muted} sx={{ mb: 1 }}>
            Restaurant food given to room guests. The GH cashier collects it with the room bill (room screen → food bill → Due → mode). It stops showing here once marked paid.
          </Typography>
          <Table size="small">
            <TableBody>
              {data.room.dueList.map((c, i) => (
                <TableRow key={i}>
                  <TableCell>{c.date}</TableCell>
                  <TableCell>Room {c.roomNo}</TableCell>
                  <TableCell>{c.guestName || "—"}</TableCell>
                  <TableCell sx={{ ...td, fontWeight: 700, color: COLORS.bad }}>{inr(c.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}

      {!!data?.otherReceived?.length && (
        <Section title="Other old dues received in Office (not Restaurant credit)">
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Office "Pending" money from names that have no Restaurant credit (for example GH dues or staff advance returned). Shown only for reference.
          </Typography>
          <Table size="small">
            <TableBody>
              {data.otherReceived.map((o) => (
                <TableRow key={o.name}>
                  <TableCell>{o.name}</TableCell>
                  <TableCell sx={td}>{o.count} entries</TableCell>
                  <TableCell sx={td}>last {o.last}</TableCell>
                  <TableCell sx={{ ...td, fontWeight: 700 }}>{inr(o.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Section>
      )}
    </Box>
  );
};

export default RestReceivableBalance;
