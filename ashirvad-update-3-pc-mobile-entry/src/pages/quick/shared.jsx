// Quick Entry: chhote shared hisse (PC + mobile dono ke liye)
import { useCallback, useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Stack,
  TextField,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";

export const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
export const DATE_FMT = "DD-MM-YYYY";
export const USER_ALLOWED_DAYS = 20; // purane page jaisa hi niyam

export const Q = {
  gh: "#0F766E",
  rest: "#B45309",
  office: "#4338CA",
  ink: "#1E293B",
  muted: "#64748B",
  line: "#E2E8F0",
  bg: "#F1F5F9",
  good: "#15803D",
  bad: "#B91C1C",
  warn: "#B45309",
};

export const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
export const num = (v) => {
  const n = Number(String(v ?? "").replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};
export const apiError = (e, fallback = "Kuch galat hua, dobara koshish karo") =>
  e?.response?.data?.message || (e?.message === "Network Error" ? "Internet nahi hai, check karo" : fallback);

export const useIsDesktop = () => {
  const theme = useTheme();
  return useMediaQuery(theme.breakpoints.up("md"));
};

/* Draft: phone band ho jaaye / page refresh ho to bhi bhara hua data na jaaye.
   Value hamesha apni key (date) ke saath judi rehti hai, taaki date badalne pe
   ek din ka draft dusre din mein na chala jaaye. */
const readStore = (key) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const useDraft = (key, initial) => {
  const [state, setState] = useState(() => ({ key, value: readStore(key) ?? initial }));
  let current = state;
  if (state.key !== key) {
    current = { key, value: readStore(key) ?? initial };
    setState(current); // React: render ke dauran derived state update allowed hai
  }
  useEffect(() => {
    if (state.key !== key) return;
    try {
      localStorage.setItem(key, JSON.stringify(state.value));
    } catch {
      /* storage full / private mode: ignore */
    }
  }, [key, state]);
  const setValue = useCallback(
    (upd) => setState((s) => ({ key: s.key, value: typeof upd === "function" ? upd(s.value) : upd })),
    []
  );
  const clear = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }, [key]);
  return [current.value, setValue, clear];
};

/* Bada number input (mobile pe number keypad khulta hai) */
export const MoneyField = ({ label, value, onChange, big, error, helperText, autoFocus, disabled, sx }) => (
  <TextField
    label={label}
    value={value === 0 || value === "0" ? "" : value ?? ""}
    placeholder="0"
    onChange={(e) => onChange(num(e.target.value))}
    inputMode="numeric"
    type="text"
    fullWidth
    autoFocus={autoFocus}
    disabled={disabled}
    error={!!error}
    helperText={helperText}
    InputProps={{
      startAdornment: <Box sx={{ mr: 0.5, color: Q.muted, fontWeight: 700 }}>₹</Box>,
      sx: { fontSize: big ? 22 : 17, fontWeight: big ? 800 : 600 },
    }}
    inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
    sx={sx}
  />
);

/* Bade chips: ek option chuno */
export const ChipChoice = ({ label, options, value, onChange, color = Q.ink, danger = [], disabled }) => (
  <Box>
    {label && (
      <Typography variant="caption" sx={{ color: Q.muted, fontWeight: 700, display: "block", mb: 0.75 }}>
        {label}
      </Typography>
    )}
    <Stack direction="row" flexWrap="wrap" gap={1}>
      {options.map((o) => {
        const on = value === o;
        const isDanger = danger.includes(o);
        return (
          <Chip
            key={o}
            label={o === "UnPaid" ? "Baaki (UnPaid)" : o}
            onClick={disabled ? undefined : () => onChange(o)}
            sx={{
              height: 40,
              px: 0.5,
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 20,
              border: "1.5px solid",
              borderColor: on ? (isDanger ? Q.bad : color) : isDanger ? "#FCA5A5" : "#CBD5E1",
              bgcolor: on ? (isDanger ? Q.bad : color) : "#fff",
              color: on ? "#fff" : isDanger ? Q.bad : Q.ink,
              "&:hover": { bgcolor: on ? (isDanger ? Q.bad : color) : "#F8FAFC" },
            }}
          />
        );
      })}
    </Stack>
  </Box>
);

/* − 2 + stepper */
export const Stepper = ({ label, value, onChange, min = 0, max = 50 }) => (
  <Box>
    <Typography variant="caption" sx={{ color: Q.muted, fontWeight: 700, display: "block", mb: 0.75 }}>
      {label}
    </Typography>
    <Stack direction="row" alignItems="center" sx={{ border: "1.5px solid #CBD5E1", borderRadius: 2, p: 0.5, bgcolor: "#fff" }}>
      <Button onClick={() => onChange(Math.max(min, (value || 0) - 1))} sx={{ minWidth: 44, height: 44, fontSize: 22, color: Q.ink, bgcolor: Q.bg }}>
        −
      </Button>
      <Typography sx={{ flex: 1, textAlign: "center", fontSize: 20, fontWeight: 800 }}>{value || 0}</Typography>
      <Button onClick={() => onChange(Math.min(max, (value || 0) + 1))} sx={{ minWidth: 44, height: 44, fontSize: 22, color: Q.ink, bgcolor: Q.bg }}>
        +
      </Button>
    </Stack>
  </Box>
);

/* Section card with title + total */
export const Section = ({ title, subtitle, total, color = Q.ink, action, children, sx }) => (
  <Paper variant="outlined" sx={{ borderRadius: 3, borderColor: Q.line, overflow: "hidden", ...sx }}>
    <Stack direction="row" alignItems="center" sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${Q.line}`, borderLeft: `4px solid ${color}` }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={800} fontSize={16}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color={Q.muted}>
            {subtitle}
          </Typography>
        )}
      </Box>
      {total !== undefined && (
        <Typography fontWeight={800} fontSize={17} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {inr(total)}
        </Typography>
      )}
      {action && <Box sx={{ ml: 1 }}>{action}</Box>}
    </Stack>
    <Box sx={{ p: 1.5 }}>{children}</Box>
  </Paper>
);

/* Mobile = full screen, PC = normal dialog */
export const EditorDialog = ({ open, onClose, title, subtitle, children, actions }) => {
  const desktop = useIsDesktop();
  return (
    <Dialog open={open} onClose={onClose} fullScreen={!desktop} fullWidth maxWidth="sm" PaperProps={{ sx: { bgcolor: Q.bg } }}>
      <DialogTitle sx={{ bgcolor: "#fff", borderBottom: `1px solid ${Q.line}`, py: 1.5, pr: 7 }}>
        <Typography variant="caption" color={Q.muted} display="block">
          {subtitle}
        </Typography>
        <Typography fontWeight={800} fontSize={19}>
          {title}
        </Typography>
        <IconButton onClick={onClose} sx={{ position: "absolute", right: 10, top: 12, bgcolor: Q.bg }} aria-label="Band karo">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: "16px !important" }}>{children}</DialogContent>
      {actions && (
        <DialogActions sx={{ bgcolor: "#fff", borderTop: `1px solid ${Q.line}`, p: 1.5, pb: { xs: 3, md: 1.5 } }}>{actions}</DialogActions>
      )}
    </Dialog>
  );
};

/* Badi list wala picker (staff, vendor, expense) */
export const PickField = ({ label, options, value, onChange, getLabel = (o) => o?.label || "", groupBy, disabled, placeholder }) => (
  <Autocomplete
    options={options}
    value={value || null}
    onChange={(_, v) => onChange(v)}
    getOptionLabel={getLabel}
    groupBy={groupBy}
    isOptionEqualToValue={(a, b) => getLabel(a) === getLabel(b) && (a?._id || "") === (b?._id || "")}
    disabled={disabled}
    fullWidth
    ListboxProps={{ sx: { "& .MuiAutocomplete-option": { minHeight: 44, fontSize: 15 } } }}
    renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder} />}
  />
);

/* Neeche chipka hua total + button (mobile), PC pe normal */
export const SaveBar = ({ label, amount, sub, buttonText, onClick, disabled, color = Q.ink, busy, extra }) => (
  <Paper
    elevation={0}
    sx={{
      position: { xs: "fixed", md: "sticky" },
      bottom: { xs: 56, md: 16 },
      left: 0,
      right: 0,
      zIndex: 5,
      borderTop: { xs: `1px solid ${Q.line}`, md: "none" },
      border: { md: `1px solid ${Q.line}` },
      borderRadius: { xs: 0, md: 3 },
      px: 2,
      py: 1.25,
      mt: { md: 2 },
      bgcolor: "#fff",
    }}
  >
    <Stack direction="row" alignItems="center" spacing={2}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="caption" color={Q.muted} display="block">
          {label}
        </Typography>
        <Typography fontWeight={800} fontSize={20} sx={{ fontVariantNumeric: "tabular-nums" }}>
          {inr(amount)}
        </Typography>
        {sub && (
          <Typography variant="caption" sx={{ color: sub.color || Q.muted, fontWeight: 700 }}>
            {sub.text}
          </Typography>
        )}
      </Box>
      {extra}
      <Button
        variant="contained"
        onClick={onClick}
        disabled={disabled || busy}
        sx={{ bgcolor: color, px: 3, py: 1.4, fontSize: 16, fontWeight: 800, borderRadius: 2.5, "&:hover": { bgcolor: color } }}
      >
        {busy ? "Save ho raha hai…" : buttonText}
      </Button>
    </Stack>
  </Paper>
);

/* Pakka karo? dialog */
export const ConfirmDialog = ({ open, title, lines = [], onCancel, onConfirm, confirmText = "Haan, save karo", color = Q.ink }) => (
  <Dialog open={open} onClose={onCancel} fullWidth maxWidth="xs">
    <DialogTitle fontWeight={800}>{title}</DialogTitle>
    <DialogContent>
      {lines.map((l, i) => (
        <Stack key={i} direction="row" justifyContent="space-between" sx={{ py: 0.75, borderBottom: i < lines.length - 1 ? `1px solid ${Q.line}` : "none" }}>
          <Typography color={l.color || Q.muted}>{l.label}</Typography>
          <Typography fontWeight={700} color={l.color || Q.ink}>
            {l.value}
          </Typography>
        </Stack>
      ))}
    </DialogContent>
    <DialogActions sx={{ p: 2 }}>
      <Button onClick={onCancel} sx={{ color: Q.muted }}>
        Ruko
      </Button>
      <Button variant="contained" onClick={onConfirm} sx={{ bgcolor: color, fontWeight: 800, "&:hover": { bgcolor: color } }}>
        {confirmText}
      </Button>
    </DialogActions>
  </Dialog>
);

/* Status line: draft / saved / locked */
export const StatusPill = ({ tone, children }) => {
  const map = {
    good: { bg: "#DCFCE7", fg: "#166534" },
    warn: { bg: "#FEF3C7", fg: "#92400E" },
    info: { bg: "#E0F2FE", fg: "#075985" },
    lock: { bg: "#E2E8F0", fg: Q.ink },
  };
  const c = map[tone] || map.info;
  return (
    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.4, borderRadius: 10, fontSize: 12.5, fontWeight: 700, bgcolor: c.bg, color: c.fg }}>
      {children}
    </Box>
  );
};
