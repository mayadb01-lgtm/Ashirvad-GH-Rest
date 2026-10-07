// Office category types: owner batata hai kaunsi Office Book line Business hai aur kaunsi Personal / Loan / EMI / Transfer / Udhaar-wapas.
// Sirf reports ka hisaab badalta hai — Office Book ke records nahi badalte (save naye collection mein).
import { Fragment, useEffect, useMemo, useState } from "react";
import { Alert, Box, Chip, IconButton, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import axios from "axios";
import toast from "react-hot-toast";
import { API, COLORS, Kpi, PageTitle, Section, inr, lakh } from "./shared";

const LABEL = {
  business: "Business",
  personal: "Personal",
  loan: "Loan received",
  emi: "Loan EMI / repayment",
  transfer: "Transfer (own accounts)",
  recovery: "Old dues received",
};
const COLOR = { business: COLORS.net, personal: COLORS.personal, loan: COLORS.loan, emi: COLORS.loan, transfer: "#0891B2", recovery: COLORS.in };
const FOR_SIDE = { in: ["business", "personal", "loan", "transfer", "recovery"], out: ["business", "personal", "emi", "transfer"] };

const TypeSelect = ({ side, value, onChange, inherit }) => (
  <TextField select size="small" value={value} onChange={(e) => onChange(e.target.value)} sx={{ minWidth: 210 }}>
    {inherit && <MenuItem value="default">Same as category ({LABEL[inherit]})</MenuItem>}
    {FOR_SIDE[side].map((t) => (
      <MenuItem key={t} value={t}>
        <Box component="span" sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: COLOR[t], display: "inline-block", mr: 1 }} />
        {LABEL[t]}
      </MenuItem>
    ))}
  </TextField>
);

const OfficeTypesDashboard = () => {
  const [data, setData] = useState(null);
  const [side, setSide] = useState("in");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState({});
  const [busy, setBusy] = useState(false);

  const load = () =>
    axios
      .get(`${API}/office-types`)
      .then(({ data: r }) => setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.message || "Could not load"));
  useEffect(() => {
    load();
  }, []);

  const save = async (categoryName, expenseName, type) => {
    setBusy(true);
    try {
      await axios.put(`${API}/office-types`, { side, categoryName, expenseName, type });
      await load();
      toast.success("Saved. Reports will use this from now on.");
    } catch (e) {
      toast.error(e?.response?.data?.message || "Could not save");
    } finally {
      setBusy(false);
    }
  };

  const groups = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    return data.categories
      .filter((c) => c.side === side)
      .map((c) => ({
        ...c,
        rows: data.rows
          .filter((r) => r.side === side && r.categoryName.toLowerCase() === c.categoryName.toLowerCase())
          .filter((r) => !s || r.expenseName.toLowerCase().includes(s) || c.categoryName.toLowerCase().includes(s))
          .sort((a, b) => b.amount - a.amount),
      }))
      .filter((c) => c.rows.length)
      .sort((a, b) => b.amount - a.amount);
  }, [data, side, q]);

  const byType = useMemo(() => {
    const o = {};
    (data?.rows || []).filter((r) => r.side === side).forEach((r) => (o[r.type] = (o[r.type] || 0) + r.amount));
    return o;
  }, [data, side]);

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Office category types" sub="Tell the reports which Office Book lines are business and which are personal, loan, loan EMI, transfers or old dues received." />
      <Alert severity="info" sx={{ mb: 2 }}>
        Only <b>Business</b> lines are counted as revenue / expense in Owner summary, Cashflow and Profit &amp; Loss. The others are shown separately. This only changes how reports count —
        your Office Book entries stay exactly the same. Names like "Cash to PP" or "PP to PPS" are treated as transfers automatically.
      </Alert>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }} sx={{ mb: 2 }}>
        <Tabs value={side} onChange={(e, v) => setSide(v)}>
          <Tab value="in" label="Office In" />
          <Tab value="out" label="Office Out" />
        </Tabs>
        <TextField size="small" placeholder="Search category or name" value={q} onChange={(e) => setQ(e.target.value)} sx={{ maxWidth: 320 }} />
      </Stack>

      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {FOR_SIDE[side].map((t) => (
          <Kpi key={t} label={LABEL[t]} value={lakh(byType[t])} color={COLOR[t]} />
        ))}
      </Stack>

      <Section title={`${side === "in" ? "Office In" : "Office Out"} — all time, by category`}>
        {!data ? (
          <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>Loading…</Typography>
        ) : (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  {["", "Category / name", "Entries", "Amount", "Counted as"].map((h) => (
                    <TableCell key={h} sx={{ fontWeight: 800, textAlign: h === "Entries" || h === "Amount" ? "right" : "left" }}>
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {groups.map((c) => {
                  const isOpen = open[c.categoryName] || !!q.trim();
                  return (
                    <Fragment key={c.categoryName}>
                      <TableRow sx={{ bgcolor: "#F8FAFC" }}>
                        <TableCell sx={{ width: 40 }}>
                          <IconButton size="small" onClick={() => setOpen((o) => ({ ...o, [c.categoryName]: !o[c.categoryName] }))}>
                            {isOpen ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
                          </IconButton>
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>
                          {c.categoryName}{" "}
                          <Typography component="span" variant="caption" color="text.secondary">
                            ({c.rows.length} names)
                          </Typography>
                        </TableCell>
                        <TableCell align="right">{c.count}</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800 }}>{inr(c.amount)}</TableCell>
                        <TableCell>
                          <TypeSelect side={side} value={FOR_SIDE[side].includes(c.type) ? c.type : "business"} onChange={(t) => !busy && save(c.categoryName, "*", t)} />
                        </TableCell>
                      </TableRow>
                      {isOpen &&
                        c.rows.map((r) => (
                          <TableRow key={r.expenseName} hover>
                            <TableCell />
                            <TableCell sx={{ pl: 4 }}>
                              {r.expenseName || "(no name)"}
                              {r.type !== c.type && <Chip size="small" label={LABEL[r.type]} sx={{ ml: 1, bgcolor: COLOR[r.type], color: "#fff", height: 20 }} />}
                              <Typography variant="caption" display="block" color="text.secondary">
                                Last: {r.last}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{r.count}</TableCell>
                            <TableCell align="right">{inr(r.amount)}</TableCell>
                            <TableCell>
                              <TypeSelect side={side} inherit={c.type} value={r.own ? r.type : "default"} onChange={(t) => !busy && save(c.categoryName, r.expenseName, t)} />
                            </TableCell>
                          </TableRow>
                        ))}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Section>
    </Box>
  );
};

export default OfficeTypesDashboard;
