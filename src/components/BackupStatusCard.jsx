import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import toast from "react-hot-toast";
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Link, Stack, TextField, Typography } from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";

dayjs.extend(relativeTime);
const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

// Home pe chhota card: pichhla backup kab hua + "Backup now" button
const BackupStatusCard = () => {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fixOpen, setFixOpen] = useState(false);
  const [pw, setPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [fixMsg, setFixMsg] = useState("");

  const load = async () => {
    try {
      const { data } = await axios.get(`${API}/backup/status`);
      setStatus(data);
    } catch {
      setStatus({ error: true });
    }
  };
  useEffect(() => {
    load();
  }, []);

  const runNow = async () => {
    setBusy(true);
    try {
      await axios.post(`${API}/backup/run`);
      toast.success("Backup emailed successfully");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.message || "Backup failed");
      load();
    } finally {
      setBusy(false);
    }
  };

  const savePw = async () => {
    setSaving(true);
    setFixMsg("");
    try {
      const { data } = await axios.post(`${API}/backup/mail-password`, { appPassword: pw });
      setPw("");
      if (data.backupOk) {
        toast.success("Email fixed - backup sent");
        setFixOpen(false);
      } else setFixMsg(data.message);
      load();
    } catch (e) {
      setFixMsg(e?.response?.data?.message || "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (!status) return null;
  const last = status.lastGood;
  const lastTry = status.logs?.[0];
  const hours = last ? dayjs().diff(dayjs(last.createdAt), "hour") : Infinity;
  const loginErr = lastTry && !lastTry.ok && /535|not accepted|invalid login|credentials/i.test(lastTry.error || "");
  const severity = status.error ? "info" : hours <= 26 ? "success" : hours <= 72 ? "warning" : "error";

  return (
    <Alert
      severity={severity}
      icon={<BackupIcon />}
      sx={{ mt: 2, maxWidth: 720, alignItems: "center" }}
      action={
        <Button color="inherit" size="small" onClick={runNow} disabled={busy} startIcon={busy ? <CircularProgress size={14} /> : null}>
          {busy ? "Backing up…" : "Backup now"}
        </Button>
      }
    >
      <Stack>
        <Typography variant="body2" fontWeight={700}>
          {status.error
            ? "Backup status not available"
            : last
              ? `Last backup ${dayjs(last.createdAt).fromNow()} (${dayjs(last.createdAt).format("DD-MM-YYYY hh:mm A")})`
              : "No backup taken yet"}
        </Typography>
        {lastTry && !lastTry.ok && (
          <Typography variant="caption">{loginErr ? "Gmail did not accept the email password, so the backup email could not be sent." : `Last attempt failed: ${lastTry.error}`}</Typography>
        )}
        {(loginErr || !last) && !status.error && (
          <Box sx={{ mt: 0.5 }}>
            <Button size="small" variant="contained" color="inherit" onClick={() => setFixOpen(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
              Fix email (Gmail App Password)
            </Button>
          </Box>
        )}
        {last && (
          <Typography variant="caption">
            Emailed to {last.emailedTo || "owner"} · {last.sizeKB} KB · automatic every night at 2 AM
          </Typography>
        )}
      </Stack>
      <Dialog open={fixOpen} onClose={() => !saving && setFixOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 800 }}>Fix backup email</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 0.5 }}>
            <Typography variant="body2">
              Gmail no longer accepts the normal password from apps. It needs a 16-letter <b>App Password</b>. Make it in this Gmail account:{" "}
              <b>{status.mail?.sender || "the sender Gmail"}</b>
            </Typography>
            <Box component="ol" sx={{ pl: 2.5, m: 0, "& li": { mb: 0.5, fontSize: 14 } }}>
              <li>
                On phone/PC, log in to <b>{status.mail?.sender || "that Gmail"}</b>.
              </li>
              <li>
                Turn on <b>2-Step Verification</b> if it is off:{" "}
                <Link href="https://myaccount.google.com/signinoptions/twosv" target="_blank" rel="noopener">
                  open
                </Link>
              </li>
              <li>
                Open{" "}
                <Link href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener">
                  myaccount.google.com/apppasswords
                </Link>
                , type the name <b>Ashirvad Backup</b>, press <b>Create</b>.
              </li>
              <li>Copy the 16 letters Google shows and paste below. Press Save.</li>
            </Box>
            <TextField
              label="App Password (16 letters)"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              type="password"
              autoComplete="off"
              fullWidth
              inputProps={{ maxLength: 24 }}
            />
            {fixMsg && <Alert severity="warning">{fixMsg}</Alert>}
            <Typography variant="caption" color="text.secondary">
              It is checked with Gmail first, then stored encrypted on the server. It is never shown again. Only the owner can save it.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFixOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={savePw} disabled={saving || pw.replace(/\s/g, "").length < 16} startIcon={saving ? <CircularProgress size={14} /> : null}>
            {saving ? "Checking…" : "Save & send backup"}
          </Button>
        </DialogActions>
      </Dialog>
    </Alert>
  );
};

export default BackupStatusCard;
