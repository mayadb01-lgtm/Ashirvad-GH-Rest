// Super Admin: "Import from cashier PC". Rad Shiva fetches the hotel PC's data for the chosen days and adds only what
// is not here yet. Records that Rad Shiva already has but the cashier PC changed later are listed; tick to replace.
import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import toast from "react-hot-toast";
import { Alert, Box, Button, Checkbox, CircularProgress, FormControlLabel, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import { API, PageTitle, Section } from "../insights/shared";
import { useAppSelector } from "../../redux/hooks/index.js";

dayjs.extend(customParseFormat);
const F = "DD-MM-YYYY";
const toInput = (d) => (dayjs(d, F, true).isValid() ? dayjs(d, F).format("YYYY-MM-DD") : "");
const fromInput = (v) => (v ? dayjs(v, "YYYY-MM-DD").format(F) : "");
const when = (v) => (v ? dayjs(v).format("DD-MM-YYYY HH:mm") : "-");

const NAMES = {
  restentries: "Restaurant day reports",
  entries: "Guest House day reports",
  officebooks: "Office book days",
  roomcharges: "Room charges (food / extra)",
  ghduereceipts: "GH dues received at office",
  restduereceipts: "Restaurant old dues received",
  restdueadjusts: "Restaurant dues adjustments",
  cashhandovers: "Cash handovers",
  guestregisters: "Guest register (govt)",
  stays: "Stays (continue / checkout)",
  bookings: "Advance bookings",
  roomblocks: "Room blocks",
  roommoves: "Room shifts / swaps",
  banquetbookings: "Banquet bookings",
  invoices: "Invoices",
  purchasebills: "Purchase bills",
  staffsalaries: "Staff salary months",
  restcategories: "Restaurant expense names",
  reststaffs: "Restaurant staff",
  restpendings: "Receivable names",
  rooms: "Rooms",
  roomgroups: "Room groups",
  officetypes: "Office category types",
  banquethalls: "Banquet halls",
  banquetpackages: "Banquet packages",
  banquetitems: "Banquet items",
  banquetaddons: "Banquet add-ons",
};

const HotelPcImport = () => {
  const { admin } = useAppSelector((state) => state.admin);
  const allowed = admin?.isSuperAdmin === true && admin?.viewOnly !== true;
  const [status, setStatus] = useState(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [ticks, setTicks] = useState({});

  const loadStatus = () =>
    axios
      .get(`${API}/hotel-pc/pull/status`)
      .then(({ data }) => {
        setStatus(data);
        setFrom((f) => f || data.suggest.from);
        setTo((t) => t || data.suggest.to);
      })
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load the import status"));

  useEffect(() => {
    if (!allowed) return undefined;
    loadStatus();
    // keep the status line fresh while the page is open (the server imports every 2 minutes when switched on)
    const t = setInterval(() => {
      if (document.visibilityState === "visible") axios.get(`${API}/hotel-pc/pull/status`).then(({ data }) => setStatus(data)).catch(() => {});
    }, 30000);
    return () => clearInterval(t);
  }, [allowed]);

  if (!allowed) return <Alert severity="warning">Only the Super Admin can import from the cashier PC.</Alert>;

  const days = dayjs(to, F).diff(dayjs(from, F), "day") + 1;
  const bad = !dayjs(from, F, true).isValid() || !dayjs(to, F, true).isValid() || days < 1 || days > (status?.maxDays || 62);

  const setAuto = async (on) => {
    try {
      await axios.post(`${API}/hotel-pc/pull/auto`, { on });
      toast.success(on ? "Automatic import is ON (every 2 minutes)" : "Automatic import is OFF");
      setTimeout(loadStatus, on ? 3000 : 0);
      loadStatus();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not change the automatic import");
    }
  };
  const hm = (v) => dayjs(v).format(dayjs(v).isSame(dayjs(), "day") ? "HH:mm" : "DD-MM HH:mm");
  const statusLine = !status
    ? ""
    : status.failingSince
      ? `Cashier PC not reachable since ${hm(status.failingSince)}${status.lastError ? ` (${status.lastError})` : ""}${status.lastOk ? `. Last good import ${hm(status.lastOk.at)}.` : "."}`
      : status.lastOk
        ? `Last import ${hm(status.lastOk.at)}, ok (${status.lastOk.from} to ${status.lastOk.to}${status.lastOk.auto ? ", automatic" : `, by ${status.lastOk.by}`}).`
        : "No import yet.";

  const run = async (replace = []) => {
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/hotel-pc/pull`, { from, to, replace }, { timeout: 5 * 60 * 1000 });
      setResult(data);
      setTicks({});
      toast.success(replace.length ? `Replaced ${data.totals?.replaced || 0} record(s)` : "Import finished");
      loadStatus();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Import failed");
    } finally {
      setBusy(false);
    }
  };

  const colls = result ? Object.entries(result.collections || {}) : [];
  const diff = result?.different || [];
  const picked = Object.keys(ticks).filter((k) => ticks[k]);
  const pd = result?.posDays;
  const pr = result?.posReports;

  return (
    <Box>
      <PageTitle title="Import from cashier PC" sub="Rad Shiva fetches the hotel PC's data for these days. Only records that are not here yet are added; nothing here is overwritten unless you tick it below." />
      {status && !status.setUp && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Not set up yet. The server needs HOTEL_PC_PULL_URL and HOTEL_PC_PULL_KEY (make the key with scripts/make-pull-key.js on the server).
        </Alert>
      )}
      <Section title="Days to import">
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} alignItems={{ sm: "center" }}>
          <TextField type="date" size="small" label="From" InputLabelProps={{ shrink: true }} value={toInput(from)} onChange={(e) => setFrom(fromInput(e.target.value))} />
          <TextField type="date" size="small" label="To" InputLabelProps={{ shrink: true }} value={toInput(to)} onChange={(e) => setTo(fromInput(e.target.value))} />
          <Button variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <CloudDownloadIcon />} disabled={busy || bad || (status && !status.setUp)} onClick={() => run([])}>
            {busy ? "Importing..." : "Import from cashier PC"}
          </Button>
          <FormControlLabel
            control={<Switch checked={!!status?.auto?.on} disabled={!status || !status.setUp} onChange={(e) => setAuto(e.target.checked)} />}
            label={`Automatic every ${status?.auto?.everyMinutes || 2} min`}
            title="The server fetches yesterday and today (and any days missed while the PC was off) every 2 minutes. Same safe rules: only adds, never overwrites."
          />
        </Stack>
        {status && (
          <Alert severity={status.failingSince ? "warning" : status.lastOk ? "success" : "info"} sx={{ mt: 1.5, py: 0 }}>
            {statusLine}
            {status.auto?.on ? ` Automatic import is on (switched on by ${status.auto.by}).` : " Automatic import is off."}
            {status.waitingDifferent > 0 ? ` ${status.waitingDifferent} record(s) differ from the cashier PC: press Import to see them and choose Replace.` : ""}
          </Alert>
        )}
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 1 }}>
          {bad ? `Pick at most ${status?.maxDays || 62} days, From not after To.` : `${days} day(s).`} Last good import:{" "}
          {status?.last ? `${status.last.from} to ${status.last.to}, on ${when(status.last.at)} by ${status.last.by}` : "never"}.
          {status?.startDate ? ` POS days start from ${status.startDate}.` : ""}
        </Typography>
      </Section>

      {result && (
        <>
          <Section title={`Result: ${result.from} to ${result.to}${result.pc ? ` (${result.pc})` : ""}`}>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Records</TableCell>
                    <TableCell align="right">Added</TableCell>
                    <TableCell align="right">Same</TableCell>
                    <TableCell align="right">Different</TableCell>
                    <TableCell align="right">Replaced</TableCell>
                    <TableCell align="right">Skipped</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {colls.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6}>No records from the cashier PC for these days.</TableCell>
                    </TableRow>
                  )}
                  {colls.map(([c, r]) => (
                    <TableRow key={c}>
                      <TableCell>{NAMES[c] || c}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: r.added ? 800 : 400, color: r.added ? "success.main" : undefined }}>{r.added}</TableCell>
                      <TableCell align="right">{r.same}</TableCell>
                      <TableCell align="right" sx={{ color: r.different ? "warning.main" : undefined, fontWeight: r.different ? 800 : 400 }}>{r.different}</TableCell>
                      <TableCell align="right">{r.replaced}</TableCell>
                      <TableCell align="right">{r.skipped}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            {pd && (
              <Typography variant="body2" sx={{ mt: 1.5 }}>
                POS days (room food bills, pay later, old dues): {pd.created} room bill(s) added, {pd.updated} updated, {pd.same} same, {pd.kept} kept (already collected here), {pd.removed} removed; {pd.daysChanged} day(s) of pay later / old dues changed.
                {pd.skipped?.length ? ` ${pd.skipped.length} note(s): ${pd.skipped.slice(0, 5).join("; ")}` : ""}
              </Typography>
            )}
            {pr && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                POS numbers for Manager (dishes, tables, footfall): {pr.saved ? `${pr.days} day(s) saved` : pr.message}
              </Typography>
            )}
            {result.skipped?.length > 0 && (
              <Alert severity="info" sx={{ mt: 1.5 }}>
                Skipped:
                {result.skipped.slice(0, 15).map((x) => (
                  <div key={`${x.coll}:${x.id}:${x.why}`}>
                    {NAMES[x.coll] || x.coll} {x.id}: {x.why}
                  </div>
                ))}
                {result.skipped.length > 15 ? `... and ${result.skipped.length - 15} more` : ""}
              </Alert>
            )}
          </Section>

          {diff.length > 0 && (
            <Section
              title={`Different (${diff.length}): Rad Shiva has these, the cashier PC changed them later`}
              right={
                <Button variant="contained" color="warning" size="small" disabled={busy || picked.length === 0} onClick={() => run(picked)}>
                  Replace ticked ({picked.length})
                </Button>
              }
            >
              <Typography variant="caption" color="text.secondary" component="div" sx={{ mb: 1 }}>
                Not changed yet. Tick only what the cashier PC has right. Rad Shiva's copy is backed up before it is replaced.
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          size="small"
                          checked={picked.length === diff.length}
                          indeterminate={picked.length > 0 && picked.length < diff.length}
                          onChange={(e) => setTicks(e.target.checked ? Object.fromEntries(diff.map((d) => [d.tag, true])) : {})}
                        />
                      </TableCell>
                      <TableCell>Record</TableCell>
                      <TableCell>Day / key</TableCell>
                      <TableCell>What differs</TableCell>
                      <TableCell>Changed at cashier PC</TableCell>
                      <TableCell>Changed in Rad Shiva</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {diff.map((d) => (
                      <TableRow key={d.tag} hover>
                        <TableCell padding="checkbox">
                          <Checkbox size="small" checked={!!ticks[d.tag]} onChange={(e) => setTicks((t) => ({ ...t, [d.tag]: e.target.checked }))} />
                        </TableCell>
                        <TableCell>{NAMES[d.coll] || d.coll}</TableCell>
                        <TableCell>{d.key || d.id}{d.sameKeyOtherId ? " (matched by day / number)" : ""}</TableCell>
                        <TableCell>{d.fields.join(", ")}</TableCell>
                        <TableCell>{when(d.hotelUpdatedAt)}</TableCell>
                        <TableCell>{when(d.radShivaUpdatedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Section>
          )}
        </>
      )}
    </Box>
  );
};

export default HotelPcImport;
