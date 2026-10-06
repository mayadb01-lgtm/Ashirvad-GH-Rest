import { Box, Card, CardContent, Typography } from "@mui/material";

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
