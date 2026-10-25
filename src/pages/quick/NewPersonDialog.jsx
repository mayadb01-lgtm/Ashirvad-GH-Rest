// ➕ Naya staff (Upad / salary) ya naya "Levana baaki" wala — entry screen se hi. Sirf Manager / malik.
// Naam / mobile likhte hi milte-julte purane naam dikhte hain (ek hi aadmi do baar na bane).
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Alert, Button, Stack, TextField, Typography } from "@mui/material";
import { API, EditorDialog, Q, apiError } from "./shared";

const nk = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9ऀ-ॿ]+/g, "");
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

const KIND = {
  staff: { title: "New staff member", sub: "For staff advance (Upad) and salary", url: "restStaff/quick-add", mobileRequired: true, note: "Per-day salary is set by the owner later (Rest - Manage Staff)." },
  pending: { title: "New person (to receive money from)", sub: "For Levana baaki (credit given)", url: "restPending/quick-add", mobileRequired: false, note: "Mobile helps to send payment reminders on WhatsApp." },
};

const NewPersonDialog = ({ open, kind = "staff", initialName = "", existing = [], onClose, onCreated, color = Q.rest }) => {
  const cfg = KIND[kind];
  const [f, setF] = useState({ fullname: "", mobileNumber: "" });
  const [conflict, setConflict] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setF({ fullname: initialName, mobileNumber: "" });
      setConflict(null);
    }
  }, [open, initialName]);

  const mobile = f.mobileNumber.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  const mobileBad = (cfg.mobileRequired || mobile) && !/^[6-9]\d{9}$/.test(mobile);
  const matches = useMemo(() => {
    const k = nk(f.fullname);
    if (k.length < 3 && mobile.length < 10) return [];
    return existing
      .filter((x) => {
        const e = nk(x.fullname);
        if (mobile.length === 10 && String(x.mobileNumber || "") === mobile) return true;
        return k.length >= 3 && e && (e === k || (k.length >= 4 && (e.includes(k) || k.includes(e))) || lev(k, e) <= (k.length > 8 ? 2 : 1));
      })
      .slice(0, 5);
  }, [f.fullname, mobile, existing]);

  const useExisting = (m) => {
    onCreated?.(m, { existing: true });
    onClose();
  };
  const save = async (force = false) => {
    if (busy) return;
    setBusy(true);
    try {
      const { data } = await axios.post(`${API}/${cfg.url}`, { fullname: f.fullname.trim(), mobileNumber: mobile, force });
      toast.success(`"${data.data.fullname}" added`);
      onCreated?.(data.data, {});
      onClose();
    } catch (e) {
      if (e?.response?.status === 409 && e.response.data?.code) setConflict(e.response.data);
      else toast.error(apiError(e));
    } finally {
      setBusy(false);
    }
  };
  const canSave = f.fullname.trim().length >= 2 && !mobileBad;

  return (
    <EditorDialog
      open={open}
      onClose={onClose}
      subtitle={cfg.sub}
      title={cfg.title}
      actions={
        <Button fullWidth variant="contained" disabled={busy || !canSave} onClick={() => save(false)} sx={{ bgcolor: color, py: 1.3, fontWeight: 800, fontSize: 16, "&:hover": { bgcolor: color } }}>
          {busy ? "Saving…" : "Add"}
        </Button>
      }
    >
      <Stack spacing={2}>
        <TextField label="Full name *" value={f.fullname} onChange={(e) => (setF((x) => ({ ...x, fullname: e.target.value })), setConflict(null))} autoFocus fullWidth inputProps={{ maxLength: 60 }} />
        <TextField
          label={cfg.mobileRequired ? "Mobile *" : "Mobile (optional)"}
          value={f.mobileNumber}
          onChange={(e) => (setF((x) => ({ ...x, mobileNumber: e.target.value.replace(/[^0-9+ ]/g, "") })), setConflict(null))}
          inputProps={{ inputMode: "tel", maxLength: 14 }}
          error={!!(f.mobileNumber && mobileBad)}
          helperText={f.mobileNumber && mobileBad ? "10-digit mobile" : " "}
          fullWidth
        />
        {(conflict || matches.length > 0) && (
          <Alert severity="warning" sx={{ "& .MuiAlert-message": { width: "100%" } }}>
            <Typography variant="body2" fontWeight={700} sx={{ mb: 0.5 }}>
              {conflict?.message || "Already in the list? Pick it instead of adding again:"}
            </Typography>
            {(conflict?.matches || matches).map((m) => (
              <Stack key={m._id} direction="row" alignItems="center" spacing={1} sx={{ py: 0.25 }}>
                <Typography variant="body2" sx={{ flex: 1 }}>
                  <b>{m.fullname}</b>
                  {m.mobileNumber ? ` · ${m.mobileNumber}` : ""}
                </Typography>
                <Button size="small" variant="outlined" onClick={() => useExisting(m)} sx={{ fontWeight: 700 }}>
                  Use this
                </Button>
              </Stack>
            ))}
            {conflict?.code === "similar" && (
              <Button size="small" variant="outlined" onClick={() => save(true)} disabled={busy} sx={{ mt: 1, fontWeight: 700 }}>
                No, add as a new person
              </Button>
            )}
          </Alert>
        )}
        <Typography variant="caption" color={Q.muted}>
          {cfg.note}
        </Typography>
      </Stack>
    </EditorDialog>
  );
};

export default NewPersonDialog;
