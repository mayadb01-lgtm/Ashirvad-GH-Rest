// ➕ Naya vendor — entry screen se hi (purchase bill, Payables, Kharch, Office Money out).
// Naam likhte hi milte-julte purane naam dikhte hain, taaki ek hi vendor do baar na bane.
// Owner ke "Vendors" page par isi se jaankari badalte hain (edit).
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Alert, Box, Button, Chip, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { API, ChipChoice, EditorDialog, Q, apiError } from "./shared";

let META = null; // categories + supplies (ek baar)
export const loadVendorMeta = async (force) => {
  if (META && !force) return META;
  const { data } = await axios.get(`${API}/restCategory/vendors`);
  META = { vendors: data.data || [], categories: data.categories || [], supplies: data.supplies || [] };
  return META;
};

const blank = (name = "") => ({ name, categoryName: "", mobile: "", gstin: "", supplies: [], payTerms: "", note: "" });

const NewVendorDialog = ({ open, onClose, initialName = "", onCreated, edit = null, color = Q.rest }) => {
  const [f, setF] = useState(blank(initialName));
  const [meta, setMeta] = useState(META);
  const [matches, setMatches] = useState([]);
  const [conflict, setConflict] = useState(null); // server ka 409 (similar / item)
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  useEffect(() => {
    if (!open) return;
    setConflict(null);
    setMatches([]);
    setF(
      edit
        ? { name: edit.expenseName, categoryName: edit.categoryName, mobile: edit.mobile || "", gstin: edit.gstin || "", supplies: edit.supplies || [], payTerms: edit.payTerms || "", note: edit.note || "" }
        : blank(initialName)
    );
    loadVendorMeta(true)
      .then((m) => {
        setMeta(m);
        // sabse zyada vendors wali category pehle se chuni
        if (!edit) setF((x) => (x.categoryName ? x : { ...x, categoryName: [...m.categories].sort((a, b) => b.vendors - a.vendors)[0]?.categoryName || "Vendors" }));
      })
      .catch(() => setMeta((m) => m || { vendors: [], categories: [], supplies: [] }));
  }, [open, initialName, edit]);

  // naam badla → milte-julte naam
  useEffect(() => {
    if (!open) return;
    clearTimeout(timer.current);
    const n = f.name.trim();
    if (n.length < 3) return setMatches([]);
    timer.current = setTimeout(() => {
      axios
        .get(`${API}/restCategory/vendor-check`, { params: { name: n } })
        .then(({ data }) => setMatches((data.data || []).filter((m) => !edit || m._id !== edit._id)))
        .catch(() => {});
    }, 350);
    return () => clearTimeout(timer.current);
  }, [f.name, open, edit]);

  const set = (k, v) => {
    setF((x) => ({ ...x, [k]: v }));
    setConflict(null);
  };
  const mobileBad = f.mobile && !/^[6-9]\d{9}$/.test(f.mobile.replace(/\D/g, "").slice(-10));
  const gstBad = f.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z0-9]Z[A-Z0-9]$/.test(f.gstin.toUpperCase().replace(/\s+/g, ""));
  const exact = matches.find((m) => m.exact && m.isVendor);

  const useExisting = (m) => {
    onCreated?.(m, { existing: true });
    toast.success(`Using "${m.expenseName}"`);
    onClose();
  };

  const save = async (force = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const body = { ...f, name: f.name.trim(), mobile: f.mobile.replace(/\D/g, "").slice(-10), gstin: f.gstin.toUpperCase().replace(/\s+/g, "") };
      const { data } = edit ? await axios.put(`${API}/restCategory/vendor/${edit._id}`, body) : await axios.post(`${API}/restCategory/vendor`, { ...body, force });
      toast.success(edit ? "Vendor saved" : data.converted ? `"${data.data.expenseName}" is now a vendor` : `Vendor "${data.data.expenseName}" added`);
      META = null;
      onCreated?.(data.data, { converted: !!data.converted });
      onClose();
    } catch (e) {
      if (e?.response?.status === 409 && e.response.data?.code) setConflict(e.response.data);
      else toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };

  const cats = meta?.categories || [];
  const supplies = meta?.supplies || [];
  const canSave = f.name.trim().length >= 2 && !mobileBad && !gstBad && !(exact && !edit);

  return (
    <EditorDialog
      open={open}
      onClose={onClose}
      subtitle={edit ? "Vendor details" : "Add once — then pick it from the list every time"}
      title={edit ? `Edit ${edit.expenseName}` : "New vendor"}
      actions={
        <Button fullWidth variant="contained" disabled={busy || !canSave} onClick={() => save(false)} sx={{ bgcolor: color, py: 1.3, fontWeight: 800, fontSize: 16, "&:hover": { bgcolor: color } }}>
          {busy ? "Saving…" : edit ? "Save" : "Add vendor"}
        </Button>
      }
    >
      <Stack spacing={2}>
        <TextField label="Vendor / shop name *" value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus={!edit} fullWidth inputProps={{ maxLength: 60 }} helperText={edit && f.name !== edit.expenseName ? "Old bills keep the old name. Change only to fix spelling." : " "} />

        {matches.length > 0 && !conflict && (
          <Alert severity={exact ? "error" : "warning"} sx={{ "& .MuiAlert-message": { width: "100%" } }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
              {exact ? "This vendor already exists:" : "Similar names already in the list — is it one of these?"}
            </Typography>
            {matches.map((m) => (
              <Stack key={m._id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.25 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  <b>{m.expenseName}</b> · {m.categoryName}
                  {m.isVendor ? "" : " (expense item)"}
                </Typography>
                {!edit && m.isVendor && (
                  <Button size="small" variant="outlined" onClick={() => useExisting(m)} sx={{ fontWeight: 700 }}>
                    Use this
                  </Button>
                )}
              </Stack>
            ))}
          </Alert>
        )}

        {conflict && (
          <Alert severity="warning" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
            <Typography variant="body2" fontWeight={700}>
              {conflict.message}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }} flexWrap="wrap" useFlexGap>
              {(conflict.matches || [])
                .filter((m) => m.isVendor)
                .slice(0, 3)
                .map((m) => (
                  <Button key={m._id} size="small" variant="contained" onClick={() => useExisting(m)} sx={{ bgcolor: color, fontWeight: 700, "&:hover": { bgcolor: color } }}>
                    Use {m.expenseName}
                  </Button>
                ))}
              {conflict.code !== "exists" && (
                <Button size="small" variant="outlined" onClick={() => save(true)} disabled={busy} sx={{ fontWeight: 700 }}>
                  {conflict.code === "item" ? "Yes, make it a vendor" : "No, add as new vendor"}
                </Button>
              )}
            </Stack>
          </Alert>
        )}

        {!edit && (
          <TextField select label="Group" value={f.categoryName} onChange={(e) => set("categoryName", e.target.value)} fullWidth helperText="Where it shows in expense reports">
            {cats.map((c) => (
              <MenuItem key={c._id} value={c.categoryName}>
                {c.categoryName}
                {c.vendors ? ` · ${c.vendors} vendors` : ""}
              </MenuItem>
            ))}
            {!cats.some((c) => /^vendors?$/i.test(c.categoryName)) && <MenuItem value="Vendors">Vendors (new group)</MenuItem>}
          </TextField>
        )}

        <Box>
          <Typography variant="caption" sx={{ color: Q.muted, fontWeight: 700, display: "block", mb: 0.75 }}>
            What do they supply? (tap all that apply)
          </Typography>
          <Stack direction="row" flexWrap="wrap" gap={1}>
            {supplies.map((s) => {
              const on = f.supplies.includes(s);
              return (
                <Chip
                  key={s}
                  label={s}
                  onClick={() => set("supplies", on ? f.supplies.filter((x) => x !== s) : [...f.supplies, s].slice(0, 6))}
                  sx={{ fontWeight: 600, border: "1.5px solid", borderColor: on ? color : "#CBD5E1", bgcolor: on ? color : "#fff", color: on ? "#fff" : Q.ink, "&:hover": { bgcolor: on ? color : "#F8FAFC" } }}
                />
              );
            })}
          </Stack>
        </Box>

        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField label="Mobile (optional)" value={f.mobile} onChange={(e) => set("mobile", e.target.value.replace(/[^0-9+ ]/g, ""))} inputProps={{ inputMode: "tel", maxLength: 14 }} error={!!mobileBad} helperText={mobileBad ? "10-digit mobile" : " "} fullWidth />
          <TextField label="GSTIN (optional)" value={f.gstin} onChange={(e) => set("gstin", e.target.value.toUpperCase())} inputProps={{ maxLength: 15 }} error={!!gstBad} helperText={gstBad ? "15 characters, like 24ABCDE1234F1Z5" : " "} fullWidth />
        </Stack>

        <ChipChoice label="Usually paid" options={["Cash", "Payable"]} value={f.payTerms} onChange={(v) => set("payTerms", f.payTerms === v ? "" : v)} color={color} />
        <TextField label="Note (optional)" value={f.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. delivers every morning, call before 8 AM" fullWidth inputProps={{ maxLength: 200 }} />
      </Stack>
    </EditorDialog>
  );
};

export default NewVendorDialog;
