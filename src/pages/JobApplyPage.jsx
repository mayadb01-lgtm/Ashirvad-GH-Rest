// /apply → staff bharti ka khula form (bina login). Candidate khud bharta hai, Manager ki list mein aa jata hai.
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Alert, Box, Button, Checkbox, Chip, FormControlLabel, Paper, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const TEAL = "#0F766E";
const JOIN = [
  ["now", "तुरंत", "Right away"],
  ["week", "1 हफ़्ते में", "In 1 week"],
  ["month", "1 महीने में", "In 1 month"],
];

const JobApplyPage = () => {
  const [info, setInfo] = useState(null);
  const [f, setF] = useState({ name: "", phone: "", roles: [], exp: "", lastPlace: "", area: "", join: "now", salary: "", stay: false, referredBy: "", note: "", consent: false, website: "" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [done, setDone] = useState(false);
  const t0 = useRef(Date.now());
  useEffect(() => {
    document.title = "Job / नौकरी";
    axios
      .get(`${API}/jobs/open`, { withCredentials: false })
      .then(({ data }) => setInfo(data))
      .catch(() => setInfo({ hotel: "Hotel Ashirvad", open: [], roles: [] }));
  }, []);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleRole = (k) => set("roles", f.roles.includes(k) ? f.roles.filter((r) => r !== k) : [...f.roles, k].slice(0, 5));
  const submit = async () => {
    setMsg(null);
    if (f.name.trim().length < 2) return setMsg("अपना नाम लिखें / Please write your name");
    if (!/^[6-9]\d{9}$/.test(f.phone.replace(/\D/g, "").slice(-10))) return setMsg("10 अंक का सही मोबाइल नंबर लिखें / Correct 10-digit mobile number");
    if (!f.roles.length) return setMsg("कौन-सा काम चाहिए, चुनें / Choose the work you want");
    if (!f.consent) return setMsg("नीचे सहमति वाले बॉक्स पर टिक करें / Please tick the consent box");
    setBusy(true);
    try {
      const join = JOIN.find((j) => j[0] === f.join)?.[2] || "";
      await axios.post(`${API}/jobs/apply`, { ...f, join, t0: t0.current }, { withCredentials: false });
      setDone(true);
    } catch (e) {
      setMsg(e?.response?.data?.message || "कुछ गड़बड़ हुई, फिर कोशिश करें / Something went wrong, please try again");
    } finally {
      setBusy(false);
    }
  };
  const open = info?.open || [];
  const roles = info?.roles || [];
  const openKeys = new Set(open.map((o) => o.key));
  const sorted = [...roles].sort((a, b) => (openKeys.has(b.key) ? 1 : 0) - (openKeys.has(a.key) ? 1 : 0));

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F6F7F9", py: 3, px: 2 }}>
      <Paper elevation={0} sx={{ maxWidth: 560, mx: "auto", p: { xs: 2, sm: 3 }, borderRadius: 3, border: "1px solid #E5E7EB" }}>
        <Typography variant="h5" fontWeight={800} color={TEAL}>
          {info?.hotel || "Hotel Ashirvad"}
        </Typography>
        <Typography fontWeight={700} sx={{ mb: 1 }}>
          नौकरी के लिए फ़ॉर्म · Job application
        </Typography>
        {open.length > 0 && (
          <Box sx={{ mb: 2, p: 1.5, bgcolor: "#ECFDF5", borderRadius: 2 }}>
            <Typography fontWeight={700} sx={{ mb: 0.5 }}>
              अभी जगह खाली है · Open now
            </Typography>
            {open.map((o) => (
              <Typography key={o.key} variant="body2">
                • {o.hi} / {o.en} — {o.n}
                {o.salary ? ` · ₹${o.salary}` : ""}
              </Typography>
            ))}
            {info?.perks && (
              <Typography variant="body2" sx={{ mt: 0.5 }}>
                ✓ {info.perks}
              </Typography>
            )}
          </Box>
        )}
        {done ? (
          <Alert severity="success" sx={{ fontSize: 16 }}>
            धन्यवाद! आपका फ़ॉर्म मिल गया। हम आपको फ़ोन करेंगे।
            <br />
            Thank you! We got your form and will call you.
          </Alert>
        ) : (
          <Stack spacing={2}>
            <TextField label="पूरा नाम · Full name" value={f.name} onChange={(e) => set("name", e.target.value)} inputProps={{ maxLength: 60 }} fullWidth />
            <TextField label="मोबाइल नंबर · Mobile" value={f.phone} onChange={(e) => set("phone", e.target.value.replace(/[^0-9+ ]/g, ""))} inputProps={{ inputMode: "tel", maxLength: 14 }} fullWidth />
            <Box>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                कौन-सा काम? · Which work? (1-5)
              </Typography>
              <Stack direction="row" flexWrap="wrap" gap={1}>
                {sorted.map((r) => (
                  <Chip
                    key={r.key}
                    label={`${r.hi} · ${r.en}${openKeys.has(r.key) ? " ★" : ""}`}
                    onClick={() => toggleRole(r.key)}
                    color={f.roles.includes(r.key) ? "primary" : "default"}
                    variant={f.roles.includes(r.key) ? "filled" : "outlined"}
                    sx={f.roles.includes(r.key) ? { bgcolor: TEAL } : {}}
                  />
                ))}
              </Stack>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <TextField label="अनुभव (साल) · Experience (years)" value={f.exp} onChange={(e) => set("exp", e.target.value.replace(/\D/g, "").slice(0, 2))} inputProps={{ inputMode: "numeric" }} fullWidth />
              <TextField label="सैलरी चाहिए (₹/महीना) · Salary wanted" value={f.salary} onChange={(e) => set("salary", e.target.value.replace(/\D/g, "").slice(0, 6))} inputProps={{ inputMode: "numeric" }} fullWidth />
            </Stack>
            <TextField label="पहले कहाँ काम किया · Last workplace" value={f.lastPlace} onChange={(e) => set("lastPlace", e.target.value)} inputProps={{ maxLength: 80 }} fullWidth />
            <TextField label="अभी कहाँ रहते हो (गाँव/शहर) · Where do you live" value={f.area} onChange={(e) => set("area", e.target.value)} inputProps={{ maxLength: 60 }} fullWidth />
            <Box>
              <Typography fontWeight={700} sx={{ mb: 1 }}>
                कब से आ सकते हो? · When can you join?
              </Typography>
              <ToggleButtonGroup exclusive value={f.join} onChange={(e, v) => v && set("join", v)} size="small">
                {JOIN.map(([k, hi, en]) => (
                  <ToggleButton key={k} value={k} sx={{ textTransform: "none" }}>
                    {hi} · {en}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </Box>
            <FormControlLabel control={<Checkbox checked={f.stay} onChange={(e) => set("stay", e.target.checked)} />} label="रहने की जगह चाहिए · Need a place to stay" />
            <TextField label="किसने बताया? (हमारे स्टाफ़ का नाम, अगर हो) · Who referred you?" value={f.referredBy} onChange={(e) => set("referredBy", e.target.value)} inputProps={{ maxLength: 60 }} fullWidth />
            <TextField label="और कुछ बताना हो · Anything else" value={f.note} onChange={(e) => set("note", e.target.value)} inputProps={{ maxLength: 300 }} multiline minRows={2} fullWidth />
            {/* bots ke liye chhupa khana */}
            <input type="text" name="website" value={f.website} onChange={(e) => set("website", e.target.value)} tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px", width: 1, height: 1 }} aria-hidden="true" />
            <FormControlLabel
              control={<Checkbox checked={f.consent} onChange={(e) => set("consent", e.target.checked)} />}
              label={<Typography variant="body2">मेरी यह जानकारी सिर्फ़ इस होटल की नौकरी के लिए रखी जाए और मुझे फ़ोन/WhatsApp किया जाए · I agree this information is kept only for jobs at this hotel and they may call/WhatsApp me</Typography>}
            />
            {msg && <Alert severity="warning">{msg}</Alert>}
            <Button variant="contained" size="large" disabled={busy} onClick={submit} sx={{ bgcolor: TEAL, fontWeight: 800, py: 1.4, "&:hover": { bgcolor: "#115E59" } }}>
              {busy ? "भेज रहे हैं… · Sending…" : "फ़ॉर्म भेजें · Send"}
            </Button>
          </Stack>
        )}
      </Paper>
    </Box>
  );
};

export default JobApplyPage;
