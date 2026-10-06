import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import toast from "react-hot-toast";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import CallIcon from "@mui/icons-material/Call";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SearchIcon from "@mui/icons-material/Search";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import EditNoteIcon from "@mui/icons-material/EditNote";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const BUSINESS = import.meta.env.VITE_REACT_APP_BUSINESS_NAME || "Ashirvad Guest House";
const TEMPLATE_KEY = "dues_whatsapp_template";
const REMINDED_KEY = "dues_reminded_on";

const DEFAULT_TEMPLATE = `Namaste {name} ji,

${BUSINESS} se yaad dilana tha ki aapka {amount} ka payment abhi baaki hai.
{stays}

Kripya jaldi payment kar dijiye. Dhanyavaad 🙏`;

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const safeGet = (k, fallback) => {
  try {
    const v = localStorage.getItem(k);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const safeSet = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
};

const buildMessage = (template, g) =>
  template
    .replaceAll("{name}", g.fullname || "")
    .replaceAll("{amount}", inr(g.total))
    .replaceAll("{days}", String(g.oldestDays))
    .replaceAll(
      "{stays}",
      g.stays.map((s) => `• ${s.date}, Room ${s.roomNo}: ${inr(s.rate)}`).join("\n")
    );

const ageColor = (d) => (d > 90 ? "#7F1D1D" : d > 30 ? "#B91C1C" : d > 7 ? "#C2410C" : "#64748B");

const GuestDuesReminders = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState("all");
  const [open, setOpen] = useState({});
  const [template, setTemplate] = useState(() => safeGet(TEMPLATE_KEY, DEFAULT_TEMPLATE));
  const [editTemplate, setEditTemplate] = useState(false);
  const [reminded, setReminded] = useState(() => safeGet(REMINDED_KEY, {}));

  useEffect(() => {
    axios
      .get(`${API}/owner/dues`)
      .then(({ data }) => setData(data))
      .catch((e) => setError(e?.response?.data?.message || "Could not load dues"));
  }, []);

  const guests = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    return data.guests.filter((g) => {
      if (q && !(`${g.fullname} ${g.mobile}`.toLowerCase().includes(q) || g.stays.some((s) => String(s.roomNo) === q)))
        return false;
      if (bucket === "7") return g.oldestDays <= 7;
      if (bucket === "30") return g.oldestDays > 7 && g.oldestDays <= 30;
      if (bucket === "old") return g.oldestDays > 30;
      return true;
    });
  }, [data, query, bucket]);

  const markReminded = (key) => {
    const next = { ...reminded, [key]: dayjs().format("DD-MM-YYYY") };
    setReminded(next);
    safeSet(REMINDED_KEY, next);
  };

  const openWhatsApp = (g) => {
    const text = encodeURIComponent(buildMessage(template, g));
    window.open(`https://wa.me/91${g.mobile}?text=${text}`, "_blank", "noopener");
    markReminded(g.key);
  };

  const copyMessage = async (g) => {
    try {
      await navigator.clipboard.writeText(buildMessage(template, g));
      toast.success("Message copied");
      markReminded(g.key);
    } catch {
      toast.error("Could not copy");
    }
  };

  const saveTemplate = () => {
    safeSet(TEMPLATE_KEY, template);
    setEditTemplate(false);
    toast.success("Message saved");
  };

  const totals = useMemo(() => {
    if (!data) return {};
    const t = { all: data.guests.length, 7: 0, 30: 0, old: 0 };
    data.guests.forEach((g) => {
      if (g.oldestDays <= 7) t[7]++;
      else if (g.oldestDays <= 30) t[30]++;
      else t.old++;
    });
    return t;
  }, [data]);

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1100, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" alignItems={{ md: "flex-end" }} spacing={2} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>
            Guest dues & WhatsApp reminders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data ? `${data.guests.length} guests · ${inr(data.total)} pending` : "Loading…"}
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<EditNoteIcon />} onClick={() => setEditTemplate((v) => !v)}>
          {editTemplate ? "Close message editor" : "Edit reminder message"}
        </Button>
      </Stack>

      <Collapse in={editTemplate}>
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Ye shabd apne aap badal jaayenge: <b>{"{name}"}</b> guest ka naam, <b>{"{amount}"}</b> kul baaki,{" "}
            <b>{"{stays}"}</b> kis din kaunsa room, <b>{"{days}"}</b> kitne din purana.
          </Typography>
          <TextField multiline minRows={6} fullWidth value={template} onChange={(e) => setTemplate(e.target.value)} />
          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button variant="contained" onClick={saveTemplate}>
              Save message
            </Button>
            <Button onClick={() => setTemplate(DEFAULT_TEMPLATE)}>Reset to default</Button>
          </Stack>
        </Paper>
      </Collapse>

      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search name, mobile or room"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup size="small" exclusive value={bucket} onChange={(_, v) => v && setBucket(v)}>
          <ToggleButton value="all">All ({totals.all ?? 0})</ToggleButton>
          <ToggleButton value="7">0–7 days ({totals[7] ?? 0})</ToggleButton>
          <ToggleButton value="30">8–30 ({totals[30] ?? 0})</ToggleButton>
          <ToggleButton value="old" sx={{ color: "#B91C1C" }}>
            30+ days ({totals.old ?? 0})
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}
      {!data && !error && [1, 2, 3].map((i) => <Skeleton key={i} variant="rounded" height={84} sx={{ mb: 1 }} />)}
      {data && guests.length === 0 && (
        <Alert severity="success">{data.guests.length ? "No guests match this filter." : "No pending guest dues 🎉"}</Alert>
      )}

      <Stack spacing={1}>
        {guests.map((g) => (
          <Paper key={g.key} variant="outlined" sx={{ p: 1.5, borderLeft: `4px solid ${ageColor(g.oldestDays)}` }}>
            <Stack direction={{ xs: "column", sm: "row" }} alignItems={{ sm: "center" }} spacing={1.5}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography fontWeight={700}>{g.fullname || "Unknown guest"}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {g.mobile || "no mobile"}
                  </Typography>
                  {reminded[g.key] && <Chip size="small" label={`Reminded ${reminded[g.key]}`} variant="outlined" />}
                </Stack>
                <Typography variant="body2" sx={{ color: ageColor(g.oldestDays) }}>
                  {g.stays.length} stay{g.stays.length > 1 ? "s" : ""} · oldest {g.oldestDays} days
                </Typography>
              </Box>
              <Typography variant="h6" fontWeight={800} sx={{ minWidth: 110, textAlign: { sm: "right" } }}>
                {inr(g.total)}
              </Typography>
              <Stack direction="row" spacing={0.5}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<WhatsAppIcon />}
                  disabled={!g.mobile}
                  onClick={() => openWhatsApp(g)}
                  sx={{ bgcolor: "#1DA851", "&:hover": { bgcolor: "#178C43" } }}
                >
                  Remind
                </Button>
                <Tooltip title="Call">
                  <span>
                    <IconButton size="small" disabled={!g.mobile} href={`tel:+91${g.mobile}`}>
                      <CallIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Copy message">
                  <IconButton size="small" onClick={() => copyMessage(g)}>
                    <ContentCopyIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <IconButton size="small" onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))} aria-label="Show stays">
                  <ExpandMoreIcon fontSize="small" sx={{ transform: open[g.key] ? "rotate(180deg)" : "none", transition: ".2s" }} />
                </IconButton>
              </Stack>
            </Stack>
            <Collapse in={!!open[g.key]}>
              <Box sx={{ mt: 1, pl: 1 }}>
                {g.stays.map((s, i) => (
                  <Typography key={i} variant="body2" color="text.secondary">
                    {s.date} · Room {s.roomNo} · {s.period} · {inr(s.rate)} · {s.age} days ago
                  </Typography>
                ))}
              </Box>
            </Collapse>
          </Paper>
        ))}
      </Stack>

      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
        "Remind" WhatsApp kholta hai message pehle se likha hua. Bhejne se pehle aap dekh sakte ho. Payment aane par
        guest ko hamesha ki tarah Pending Jama mein mark karein, list apne aap update ho jaayegi.
      </Typography>
    </Box>
  );
};

export default GuestDuesReminders;
