// 🏪 Vendors: saare vendor ek jagah — mobile, GST, kya maal deta hai, aakhri bill, 90 din ka maal.
// Naya vendor yahan se ya entry screen se (purchase bill / Payables / Money out) "+ New vendor".
import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, TextField, Typography } from "@mui/material";
import NewVendorDialog, { loadVendorMeta } from "../../pages/quick/NewVendorDialog";

const C = "#B45309";
const nk = (s) => String(s || "").toLowerCase().replace(/\b(m\/s|ms|shree|shri|sri|the|traders?|trading|enterprises?|agency|agencies|stores?|co|company|pvt|ltd)\b/g, "").replace(/[^a-z0-9ऀ-ॿ]+/g, "");
const lev = (a, b) => {
  if (a === b) return 0;
  let p = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const c = [i];
    for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    p = c;
  }
  return p[b.length];
};
const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

const VendorsPage = () => {
  const [meta, setMeta] = useState(null);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const [sup, setSup] = useState("");
  const [dlg, setDlg] = useState(null); // { edit } | { name }
  const load = () =>
    loadVendorMeta(true)
      .then(setMeta)
      .catch((e) => setErr(e?.response?.data?.message || "Could not load vendors"));
  useEffect(() => {
    load();
  }, []);

  const list = useMemo(() => {
    const v = meta?.vendors || [];
    const t = q.trim().toLowerCase();
    return v
      .filter((x) => (!t || `${x.expenseName} ${x.categoryName} ${x.mobile} ${x.gstin} ${(x.supplies || []).join(" ")}`.toLowerCase().includes(t)) && (!sup || (x.supplies || []).includes(sup)))
      .sort((a, b) => (b.amt90 || 0) - (a.amt90 || 0) || a.expenseName.localeCompare(b.expenseName));
  }, [meta, q, sup]);

  // Ek jaise naam (shayad do baar bane) — owner "Categories & Expenses" mein theek kare
  const dups = useMemo(() => {
    const v = meta?.vendors || [];
    const out = [];
    for (let i = 0; i < v.length; i++)
      for (let j = i + 1; j < v.length; j++) {
        const a = nk(v[i].expenseName), b = nk(v[j].expenseName);
        if (!a || !b) continue;
        if (a === b || (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) || lev(a, b) <= (Math.min(a.length, b.length) > 8 ? 2 : 1)) out.push([v[i], v[j]]);
      }
    return out.slice(0, 20);
  }, [meta]);

  if (err) return <Alert severity="error" sx={{ m: 2 }}>{err}</Alert>;
  if (!meta)
    return (
      <Box sx={{ display: "grid", placeItems: "center", height: 240 }}>
        <CircularProgress />
      </Box>
    );
  const noMobile = (meta.vendors || []).filter((v) => !v.mobile).length;

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Vendors
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {(meta.vendors || []).length} vendors · staff can also add a new vendor from the purchase bill, Payables and Money out screens
          </Typography>
        </Box>
        <Button variant="contained" onClick={() => setDlg({ name: "" })} sx={{ bgcolor: C, fontWeight: 800, "&:hover": { bgcolor: C } }}>
          + New vendor
        </Button>
      </Stack>

      {dups.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <b>Maybe the same vendor twice:</b> {dups.map(([a, b]) => `${a.expenseName} / ${b.expenseName}`).join(" · ")}. Keep one: open <b>Categories &amp; Expenses</b>, remove the extra one (old bills stay as they are).
        </Alert>
      )}
      {noMobile > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {noMobile} vendors have no mobile number — tap Edit to add it (then you can call / WhatsApp from here).
        </Alert>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 1.5 }}>
        <TextField size="small" label="Search name / mobile / GST" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 260 }} />
        <Stack direction="row" gap={0.75} flexWrap="wrap">
          {["", ...(meta.supplies || [])].map((s) => (
            <Chip key={s || "all"} label={s || "All"} onClick={() => setSup(s)} color={sup === s ? "warning" : "default"} variant={sup === s ? "filled" : "outlined"} size="small" />
          ))}
        </Stack>
      </Stack>

      <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
        {list.map((v) => (
          <Paper key={v._id} variant="outlined" sx={{ p: 1.5, borderRadius: 3 }}>
            <Stack direction="row" alignItems="flex-start" spacing={1}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography fontWeight={800} noWrap>
                  {v.expenseName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {v.categoryName}
                  {v.payTerms ? ` · usually ${v.payTerms === "Payable" ? "on credit" : "cash"}` : ""}
                  {v.gstin ? ` · GST ${v.gstin}` : ""}
                </Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={() => setDlg({ edit: v })} sx={{ minWidth: 0, fontWeight: 700 }}>
                Edit
              </Button>
            </Stack>
            {(v.supplies || []).length > 0 && (
              <Stack direction="row" gap={0.5} flexWrap="wrap" sx={{ mt: 0.75 }}>
                {v.supplies.map((s) => (
                  <Chip key={s} label={s} size="small" sx={{ height: 22 }} />
                ))}
              </Stack>
            )}
            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
              <Typography variant="body2">
                90 days: <b>{inr(v.amt90 || 0)}</b>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last bill: {v.lastBill ? dayjs(v.lastBill).format("DD-MM-YYYY") : "—"}
              </Typography>
              {v.mobile && (
                <>
                  <Button size="small" href={`tel:+91${v.mobile}`} sx={{ minWidth: 0, fontWeight: 700 }}>
                    📞 {v.mobile}
                  </Button>
                  <Button size="small" href={`https://wa.me/91${v.mobile}`} target="_blank" rel="noopener" sx={{ minWidth: 0, fontWeight: 700 }}>
                    WhatsApp
                  </Button>
                </>
              )}
            </Stack>
            {(v.note || v.addedBy) && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                {v.note}
                {v.note && v.addedBy ? " · " : ""}
                {v.addedBy ? `added by ${v.addedBy}${v.addedAt ? ` on ${dayjs(v.addedAt).format("DD-MM-YYYY")}` : ""}` : ""}
              </Typography>
            )}
          </Paper>
        ))}
      </Box>
      {list.length === 0 && <Alert severity="info">No vendor matches.</Alert>}

      <NewVendorDialog open={!!dlg} edit={dlg?.edit || null} initialName={dlg?.name || ""} onClose={() => setDlg(null)} onCreated={() => load()} color={C} />
    </Box>
  );
};

export default VendorsPage;
