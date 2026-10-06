import { useEffect, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import toast from "react-hot-toast";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import BackupIcon from "@mui/icons-material/Backup";

dayjs.extend(relativeTime);
const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

// Home pe chhota card: pichhla backup kab hua + "Backup now" button
const BackupStatusCard = () => {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

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

  if (!status) return null;
  const last = status.lastGood;
  const lastTry = status.logs?.[0];
  const hours = last ? dayjs().diff(dayjs(last.createdAt), "hour") : Infinity;
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
          <Typography variant="caption">Last attempt failed: {lastTry.error}</Typography>
        )}
        {last && (
          <Typography variant="caption">
            Emailed to {last.emailedTo || "owner"} · {last.sizeKB} KB · automatic every night at 2 AM
          </Typography>
        )}
      </Stack>
    </Alert>
  );
};

export default BackupStatusCard;
