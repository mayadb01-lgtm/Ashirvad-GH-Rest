// Data check: galat date, chhoote din, minus salary jaise problems. Sirf padhta hai.
// `compact` = Admin Home ke card ke liye chhota version.
import { useEffect, useState } from "react";
import { Alert, AlertTitle, Box, Button, Stack, Typography } from "@mui/material";
import axios from "axios";
import { API, PageTitle } from "./shared";

export const useDataAlerts = () => {
  const [alerts, setAlerts] = useState(null);
  useEffect(() => {
    axios
      .get(`${API}/insights/data-alerts`)
      .then(({ data }) => setAlerts(data?.data?.alerts || []))
      .catch(() => setAlerts([]));
  }, []);
  return alerts;
};

const DataAlerts = ({ compact = false, onNavigate }) => {
  const alerts = useDataAlerts();
  if (alerts === null) return compact ? null : <Typography color="text.secondary" sx={{ p: 2 }}>Check ho raha hai…</Typography>;
  const list = compact ? alerts.filter((a) => a.level !== "info").slice(0, 3) : alerts;
  if (compact && !list.length) return null;

  const body = (
    <Stack spacing={1}>
      {list.map((a, i) => (
        <Alert
          key={i}
          severity={a.level}
          sx={{ py: compact ? 0 : 0.5 }}
          action={
            a.link && onNavigate ? (
              <Button size="small" color="inherit" onClick={() => onNavigate(a.link)}>
                Kholo
              </Button>
            ) : null
          }
        >
          <AlertTitle sx={{ mb: compact ? 0 : 0.5, fontSize: 14 }}>{a.title}</AlertTitle>
          {!compact && (
            <>
              <Typography variant="body2">{a.text}</Typography>
              {a.hint && (
                <Typography variant="caption" color="text.secondary">
                  {a.hint}
                </Typography>
              )}
            </>
          )}
        </Alert>
      ))}
      {!list.length && <Alert severity="success">Koi galti nahi mili. Data saaf hai 👍</Alert>}
    </Stack>
  );

  if (compact) return body;
  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <PageTitle title="Data check" sub="App ne khud dhoondha: galat date, chhoote din, aur gadbad wale amounts. Theek karne ke liye purane page kholo." />
      {body}
    </Box>
  );
};

export default DataAlerts;
