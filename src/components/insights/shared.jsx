import { Box, Button, Card, CardContent, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

export const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
export const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
export const lakh = (n) => {
  const v = Number(n) || 0;
  return Math.abs(v) >= 100000 ? `₹${(v / 100000).toFixed(2)} L` : inr(v);
};
export const kTick = (v) => (Math.abs(v) >= 100000 ? `${(v / 100000).toFixed(1)}L` : Math.abs(v) >= 1000 ? `${Math.round(v / 1000)}k` : v);

export const COLORS = {
  in: "#2563EB",
  out: "#EA580C",
  net: "#16A34A",
  personal: "#9333EA",
  loan: "#64748B",
  gh: "#0F766E",
  rest: "#B45309",
  office: "#4338CA",
  bad: "#DC2626",
};
export const PALETTE = ["#2563EB", "#EA580C", "#16A34A", "#9333EA", "#0F766E", "#B45309", "#DB2777", "#64748B", "#CA8A04", "#4338CA"];

export const Kpi = ({ label, value, sub, color }) => (
  <Card variant="outlined" sx={{ flex: 1, minWidth: 150 }}>
    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h6" fontWeight={800} sx={{ color: color || "text.primary", lineHeight: 1.3 }}>
        {value}
      </Typography>
      {sub && (
        <Typography variant="caption" color="text.secondary">
          {sub}
        </Typography>
      )}
    </CardContent>
  </Card>
);

export const Section = ({ title, right, children, sx }) => (
  <Card variant="outlined" sx={{ mb: 2, ...sx }}>
    <CardContent>
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Typography fontWeight={700}>{title}</Typography>
        {right}
      </Box>
      {children}
    </CardContent>
  </Card>
);

export const PageTitle = ({ title, sub }) => (
  <Box sx={{ mb: 2 }}>
    <Typography variant="h5" fontWeight={800}>
      {title}
    </Typography>
    {sub && (
      <Typography variant="body2" color="text.secondary">
        {sub}
      </Typography>
    )}
  </Box>
);

// Mahina range + ◀ ▶ arrows (poori range ek mahina aage/peeche), "Sirf ek mahina" aur "Pichhle 12"

export const MonthRangeBar = ({ from, to, setFrom, setTo, children }) => {
  const shift = (n) => {
    setFrom(from.add(n, "month").startOf("month"));
    setTo(to.add(n, "month").startOf("month"));
  };
  const nextDisabled = !to.isBefore(dayjs(), "month");
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap" useFlexGap>
        <Tooltip title="Previous month">
          <IconButton onClick={() => shift(-1)} sx={{ border: "1px solid #D1D5DB" }} aria-label="Previous month">
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
        <DatePicker label="From (month)" views={["year", "month"]} value={from} onChange={(v) => v && setFrom(v.startOf("month"))} slotProps={{ textField: { size: "small", sx: { width: 195 } } }} />
        <DatePicker label="To (month)" views={["year", "month"]} value={to} onChange={(v) => v && setTo(v.startOf("month"))} slotProps={{ textField: { size: "small", sx: { width: 195 } } }} />
        <Tooltip title="Next month">
          <span>
            <IconButton onClick={() => shift(1)} disabled={nextDisabled} sx={{ border: "1px solid #D1D5DB" }} aria-label="Next month">
              <ChevronRightIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button size="small" variant="outlined" onClick={() => setFrom(to.startOf("month"))}>
          Single month
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const end = dayjs().subtract(1, "month").startOf("month");
            setTo(end);
            setFrom(end.subtract(11, "month"));
          }}
        >
          Last 12 months
        </Button>
        {children}
      </Stack>
    </LocalizationProvider>
  );
};

// Date range (GH Growth): ◀ ▶ = poora mahina aage/peeche
export const MonthStepBar = ({ start, end, setStart, setEnd, format = "DD-MM-YYYY", children }) => {
  const goMonth = (m) => {
    setStart(m.startOf("month"));
    const e = m.endOf("month");
    setEnd(e.isAfter(dayjs()) ? dayjs() : e);
  };
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center" flexWrap="wrap" useFlexGap>
        <Tooltip title="Previous month">
          <IconButton onClick={() => goMonth(start.subtract(1, "month"))} sx={{ border: "1px solid #D1D5DB" }} aria-label="Previous month">
            <ChevronLeftIcon />
          </IconButton>
        </Tooltip>
        <DatePicker label="Start" value={start} onChange={(v) => v && setStart(v)} format={format} slotProps={{ textField: { size: "small", sx: { width: 175 } } }} />
        <DatePicker label="End" value={end} onChange={(v) => v && setEnd(v)} format={format} slotProps={{ textField: { size: "small", sx: { width: 175 } } }} />
        <Tooltip title="Next month">
          <span>
            <IconButton onClick={() => goMonth(start.add(1, "month"))} disabled={!start.isBefore(dayjs(), "month")} sx={{ border: "1px solid #D1D5DB" }} aria-label="Next month">
              <ChevronRightIcon />
            </IconButton>
          </span>
        </Tooltip>
        <Button size="small" variant="outlined" onClick={() => goMonth(dayjs())}>
          This month
        </Button>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            setStart(dayjs().subtract(5, "month").startOf("month"));
            setEnd(dayjs());
          }}
        >
          Last 6 months
        </Button>
        {children}
      </Stack>
    </LocalizationProvider>
  );
};
