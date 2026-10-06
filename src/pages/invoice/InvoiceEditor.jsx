// Naya invoice banao (GST Tax Invoice ya Non-GST). Room se khule to sab apne aap bhara hota hai.
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/Add";
import { BUSINESSES, GSTIN_RE, PAY_MODES, SAC_OPTIONS, STATE_CODES, TAX_RATES, calcTotals, money } from "./invoiceShared";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const F = "DD-MM-YYYY";
const BROWN = "#5B2222";
const STATES = [...new Set(Object.values(STATE_CODES))].sort();
const blankItem = (business) => ({
  desc: "",
  sac: business === "Restaurant" ? "996331" : business === "Banquet Hall" ? "997212" : "996311",
  qty: 1,
  rate: 0,
  taxRate: business === "Banquet Hall" ? 18 : 5,
});

export const emptyDraft = (business = "Guest House") => ({
  business,
  invoiceDate: dayjs().format(F),
  customer: { name: "", company: "", gstin: "", address: "", mobile: "", state: "Gujarat" },
  stay: { roomNo: "", checkIn: "", checkOut: "", guests: 0 },
  items: [blankItem(business)],
  paymentMode: "",
  notes: "",
  source: { type: "manual" },
});

const InvoiceEditor = ({ open, onClose, draft, existing = [], onCreated, lockDate }) => {
  const [series, setSeries] = useState("GST");
  const [d, setD] = useState(draft || emptyDraft());
  const [inclusive, setInclusive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setD(draft || emptyDraft());
      setSeries("GST");
      setInclusive(false);
    }
  }, [open, draft]);

  const gst = series === "GST";
  const t = useMemo(() => calcTotals(d.items, inclusive, gst), [d.items, inclusive, gst]);
  const setC = (k, v) => setD((x) => ({ ...x, customer: { ...x.customer, [k]: v } }));
  const setS = (k, v) => setD((x) => ({ ...x, stay: { ...x.stay, [k]: v } }));
  const setItem = (i, k, v) => setD((x) => ({ ...x, items: x.items.map((it, j) => (j === i ? { ...it, [k]: v } : it)) }));
  const gstin = (d.customer.gstin || "").toUpperCase().replace(/\s/g, "");
  const gstinBad = gst && gstin && !GSTIN_RE.test(gstin);

  // GST number daalte hi state apne aap
  const onGstin = (v) => {
    const g = v.toUpperCase().replace(/\s/g, "").slice(0, 15);
    setD((x) => ({ ...x, customer: { ...x.customer, gstin: g, state: STATE_CODES[g.slice(0, 2)] || STATE_CODES[Number(g.slice(0, 2))] || x.customer.state } }));
  };

  const activeExisting = existing.filter((x) => x.status !== "cancelled");

  const save = async () => {
    if (!d.customer.name.trim() && !d.customer.company.trim()) return toast.error("Guest ya company ka naam likho");
    if (gstinBad) return toast.error("GST number galat hai");
    if (!t.rows.some((r) => r.desc && r.total > 0)) return toast.error("Kam se kam ek item (naam + amount)");
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/invoice`, { ...d, series, taxInclusive: inclusive, customer: { ...d.customer, gstin } });
      toast.success(`Invoice ${data.data.invoiceNo} ban gaya`);
      onCreated?.(data.data);
    } catch (e) {
      toast.error(e?.response?.data?.message || "Invoice nahi bana");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md" scroll="paper">
      <DialogTitle sx={{ pb: 1 }}>
        <Typography fontWeight={800} fontSize={19}>
          🧾 Naya invoice
        </Typography>
        <ToggleButtonGroup exclusive size="small" value={series} onChange={(_, v) => v && setSeries(v)} sx={{ mt: 1 }}>
          <ToggleButton value="GST" sx={{ fontWeight: 800, px: 2 }}>
            GST Tax Invoice
          </ToggleButton>
          <ToggleButton value="NON" sx={{ fontWeight: 800, px: 2 }}>
            Non-GST Invoice
          </ToggleButton>
        </ToggleButtonGroup>
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
          {gst ? "Number: GST/26-27/0001 jaisa (alag series)" : "Number: INV/26-27/0001 jaisa (alag series, GST nahi lagega)"}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        {activeExisting.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Is room ka invoice pehle se bana hai: {activeExisting.map((x) => x.invoiceNo).join(", ")}. Dobara banana hai to hi aage badho.
          </Alert>
        )}
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField select fullWidth size="small" label="Business" value={d.business} onChange={(e) => setD((x) => ({ ...x, business: e.target.value }))}>
              {BUSINESSES.map((b) => (
                <MenuItem key={b} value={b}>
                  {b}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 6, sm: 3 }}>
            <TextField
              fullWidth
              size="small"
              type="date"
              label="Invoice date"
              disabled={lockDate}
              value={dayjs(d.invoiceDate, F).format("YYYY-MM-DD")}
              onChange={(e) => e.target.value && setD((x) => ({ ...x, invoiceDate: dayjs(e.target.value).format(F) }))}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField select fullWidth size="small" label="Payment" value={d.paymentMode} onChange={(e) => setD((x) => ({ ...x, paymentMode: e.target.value }))}>
              <MenuItem value="">—</MenuItem>
              {PAY_MODES.map((m) => (
                <MenuItem key={m} value={m}>
                  {m}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          <Grid size={12}>
            <Typography fontWeight={800} sx={{ mt: 0.5 }}>
              Bill kiske naam
            </Typography>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Company ka naam (agar company bill)" value={d.customer.company} onChange={(e) => setC("company", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField fullWidth size="small" label="Guest ka naam" value={d.customer.name} onChange={(e) => setC("name", e.target.value)} />
          </Grid>
          {gst && (
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                size="small"
                label="Company ka GST number (optional)"
                value={d.customer.gstin}
                onChange={(e) => onGstin(e.target.value)}
                error={gstinBad}
                helperText={gstinBad ? "15 akshar, jaise 24ABCDE1234F1Z5" : gstin ? "✓ B2B invoice (company GST credit le sakti hai)" : "Khaali = B2C (aam guest)"}
                inputProps={{ style: { textTransform: "uppercase" } }}
              />
            </Grid>
          )}
          <Grid size={{ xs: 12, sm: gst ? 6 : 6 }}>
            <TextField select fullWidth size="small" label="State" value={d.customer.state || "Gujarat"} onChange={(e) => setC("state", e.target.value)}>
              {STATES.map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 8 }}>
            <TextField fullWidth size="small" label="Address" value={d.customer.address} onChange={(e) => setC("address", e.target.value)} />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField fullWidth size="small" label="Mobile" value={d.customer.mobile} onChange={(e) => setC("mobile", e.target.value)} />
          </Grid>

          {d.business === "Guest House" && (
            <>
              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField fullWidth size="small" label="Room" value={d.stay.roomNo} onChange={(e) => setS("roomNo", e.target.value)} />
              </Grid>
              <Grid size={{ xs: 8, sm: 4 }}>
                <TextField fullWidth size="small" label="Check-in" value={d.stay.checkIn} onChange={(e) => setS("checkIn", e.target.value)} placeholder="07-10-2026 10:00 AM" />
              </Grid>
              <Grid size={{ xs: 8, sm: 4 }}>
                <TextField fullWidth size="small" label="Check-out" value={d.stay.checkOut} onChange={(e) => setS("checkOut", e.target.value)} />
              </Grid>
              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField fullWidth size="small" type="number" label="Guests" value={d.stay.guests || ""} onChange={(e) => setS("guests", Number(e.target.value) || 0)} />
              </Grid>
            </>
          )}

          <Grid size={12}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 0.5 }}>
              <Typography fontWeight={800}>Items</Typography>
              {gst && (
                <FormControlLabel
                  control={<Checkbox size="small" checked={inclusive} onChange={(e) => setInclusive(e.target.checked)} />}
                  label={<Typography variant="body2">Rate mein GST shamil hai</Typography>}
                />
              )}
            </Stack>
          </Grid>
          {d.items.map((it, i) => (
            <Grid key={i} size={12}>
              <Box sx={{ border: "1px solid #E5E7EB", borderRadius: 2, p: 1 }}>
                <Grid container spacing={1} alignItems="center">
                  <Grid size={{ xs: 12, sm: gst ? 4 : 6 }}>
                    <TextField fullWidth size="small" label="Kis cheez ka" value={it.desc} onChange={(e) => setItem(i, "desc", e.target.value)} />
                  </Grid>
                  {gst && (
                    <Grid size={{ xs: 6, sm: 2 }}>
                      <TextField select fullWidth size="small" label="SAC" value={it.sac} onChange={(e) => setItem(i, "sac", e.target.value)}>
                        {SAC_OPTIONS.map((s) => (
                          <MenuItem key={s.sac} value={s.sac}>
                            {s.label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}
                  <Grid size={{ xs: 3, sm: 1 }}>
                    <TextField fullWidth size="small" type="number" label="Qty" value={it.qty} onChange={(e) => setItem(i, "qty", e.target.value)} />
                  </Grid>
                  <Grid size={{ xs: gst ? 5 : 6, sm: 2 }}>
                    <TextField fullWidth size="small" type="number" label="Rate ₹" value={it.rate || ""} onChange={(e) => setItem(i, "rate", e.target.value)} />
                  </Grid>
                  {gst && (
                    <Grid size={{ xs: 4, sm: 1.5 }}>
                      <TextField select fullWidth size="small" label="GST" value={it.taxRate} onChange={(e) => setItem(i, "taxRate", Number(e.target.value))}>
                        {TAX_RATES.map((r) => (
                          <MenuItem key={r} value={r}>
                            {r}%
                          </MenuItem>
                        ))}
                      </TextField>
                    </Grid>
                  )}
                  <Grid size={{ xs: gst ? 10 : 2, sm: gst ? 1 : 2 }}>
                    <Typography fontWeight={700} textAlign="right" fontSize={14}>
                      ₹{money(t.rows[i]?.total)}
                    </Typography>
                  </Grid>
                  <Grid size={{ xs: 2, sm: 0.5 }}>
                    <IconButton size="small" onClick={() => setD((x) => ({ ...x, items: x.items.filter((_, j) => j !== i) }))} disabled={d.items.length === 1}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            </Grid>
          ))}
          <Grid size={12}>
            <Button size="small" startIcon={<AddIcon />} onClick={() => setD((x) => ({ ...x, items: [...x.items, blankItem(x.business)] }))}>
              Item jodo
            </Button>
          </Grid>
          <Grid size={12}>
            <TextField fullWidth size="small" label="Note (optional)" value={d.notes} onChange={(e) => setD((x) => ({ ...x, notes: e.target.value }))} />
          </Grid>
        </Grid>

        <Box sx={{ mt: 2, ml: "auto", maxWidth: 320, fontSize: 14 }}>
          {(gst
            ? [
                ["Taxable value", t.taxable],
                ["CGST", t.cgst],
                ["SGST", t.sgst],
              ]
            : [["Sub total", t.taxable]]
          )
            .concat(t.roundOff ? [["Round off", t.roundOff]] : [])
            .map(([l, v]) => (
              <Stack key={l} direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  {l}
                </Typography>
                <Typography variant="body2">₹{money(v)}</Typography>
              </Stack>
            ))}
          <Stack direction="row" justifyContent="space-between" sx={{ borderTop: `2px solid ${BROWN}`, mt: 0.5, pt: 0.5 }}>
            <Typography fontWeight={800}>Total</Typography>
            <Typography fontWeight={800} color={BROWN}>
              ₹{money(t.grandTotal)}
            </Typography>
          </Stack>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Band karo
        </Button>
        <Button variant="contained" onClick={save} disabled={busy} sx={{ bgcolor: BROWN, fontWeight: 800, "&:hover": { bgcolor: BROWN } }}>
          {busy ? "Ban raha hai…" : "Invoice banao + PDF"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceEditor;
