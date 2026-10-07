import { useEffect } from "react";
// 🏠 Welcome page (Super Admin / admin). Staff ko HomeGate seedha /entry bhejta hai.
import { Box, ButtonBase, Paper, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import dayjs from "dayjs";
import { useAppSelector } from "../redux/hooks";
import HotelIcon from "@mui/icons-material/Hotel";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import CelebrationIcon from "@mui/icons-material/Today"; // (naya icon Vite ko reload karata hai — pehle se wala use kiya)
import DashboardIcon from "@mui/icons-material/Dashboard";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import BadgeIcon from "@mui/icons-material/Badge";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FingerprintIcon from "@mui/icons-material/Fingerprint";

const INK = "#1E293B";
const MUTED = "#64748B";
const LINE = "#E2E8F0";

const greet = () => {
  const h = dayjs().hour();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

// Ek tile: rang ki patti + icon + naam + chhoti line
const Tile = ({ to, icon, title, sub, color, big }) => (
  <ButtonBase
    component={RouterLink}
    to={to}
    sx={{
      display: "block",
      textAlign: "left",
      borderRadius: 3,
      height: "100%",
      "&:hover .tile": { borderColor: color, transform: "translateY(-2px)", boxShadow: "0 8px 24px rgba(15,23,42,.08)" },
      "&:focus-visible .tile": { outline: `3px solid ${color}`, outlineOffset: 2 },
    }}
  >
    <Paper
      className="tile"
      elevation={0}
      sx={{ p: big ? 2.5 : 2, height: "100%", borderRadius: 3, border: `1px solid ${LINE}`, transition: "all .15s ease", bgcolor: "#fff" }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: big ? 48 : 40, height: big ? 48 : 40, borderRadius: 2, display: "grid", placeItems: "center", bgcolor: `${color}14`, color, flexShrink: 0 }}>
          {icon}
        </Box>
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography fontWeight={800} color={INK} fontSize={big ? 17 : 15} lineHeight={1.25}>
            {title}
          </Typography>
          {sub && (
            <Typography variant="body2" color={MUTED} lineHeight={1.35} sx={{ mt: 0.25 }}>
              {sub}
            </Typography>
          )}
        </Box>
        <Typography color={color} fontWeight={800} fontSize={18} aria-hidden>
          →
        </Typography>
      </Stack>
    </Paper>
  </ButtonBase>
);

const Home = () => {
  useEffect(() => {
    document.title = import.meta.env.VITE_REACT_APP_BUSINESS_NAME || "Ashirvad";
  }, []);
  const { isAdminAuthenticated, admin } = useAppSelector((s) => s.admin);
  const { user } = useAppSelector((s) => s.user);
  const name = (isAdminAuthenticated ? admin?.name : user?.name) || "";
  const business = import.meta.env.VITE_REACT_APP_BUSINESS_NAME || "Ashirvad";
  const pre = isAdminAuthenticated ? "/admin" : "";

  const modules = [
    { tab: "gh", title: "Guest House", sub: "Rooms, check-in, food bills, dues", color: "#0F766E", icon: <HotelIcon /> },
    { tab: "rest", title: "Restaurant", sub: "Sales, purchase, udhaar, cash", color: "#B45309", icon: <RestaurantIcon /> },
    { tab: "office", title: "Office Book", sub: "Money in / out, GH dues, handover", color: "#4338CA", icon: <BusinessCenterIcon /> },
    { tab: "banquet", title: "Banquet", sub: "Booking, menu, bill, payments", color: "#BE185D", icon: <CelebrationIcon /> },
  ];
  const owner = isAdminAuthenticated
    ? [
        { to: "/dashboard", title: "Today's summary & reports", sub: "Money, rooms, dues — all businesses", color: INK, icon: <DashboardIcon /> },
        { to: "/dashboard/staff-access", title: "Staff access", sub: "Who can enter what, how many days, which reports", color: "#7C3AED", icon: <AdminPanelSettingsIcon /> },
        { to: "/dashboard/login-log", title: "Login log", sub: "Who logged in, when, from which device", color: "#B91C1C", icon: <FingerprintIcon /> },
        { to: "/dashboard/invoices", title: "Invoices", sub: "GST / Non-GST bills", color: "#0369A1", icon: <ReceiptLongIcon /> },
        { to: `${pre}/staff-salary`, title: "Staff salary", sub: "Salary and advances", color: "#C2410C", icon: <BadgeIcon /> },
      ]
    : [];

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#F1F5F9", pb: 6 }}>
      {/* Upar ka band: namaste + aaj ki date */}
      <Box sx={{ bgcolor: INK, color: "#fff", px: 2, pt: { xs: 3, md: 5 }, pb: { xs: 6, md: 8 } }}>
        <Box sx={{ maxWidth: 1040, mx: "auto" }}>
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            {dayjs().format("dddd, D MMMM YYYY")}
          </Typography>
          <Typography component="h1" fontWeight={800} sx={{ fontSize: { xs: 26, md: 34 }, lineHeight: 1.2, mt: 0.5 }}>
            {greet()}
            {name ? `, ${name}` : ""}
          </Typography>
          <Typography sx={{ opacity: 0.8, mt: 0.5 }}>{business} · Guest House, Restaurant, Office & Banquet</Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 1040, mx: "auto", px: 2, mt: { xs: -4, md: -5 } }}>
        {/* Sabse zaroori: aaj ki entry */}
        <Paper elevation={0} sx={{ p: { xs: 1.5, md: 2 }, borderRadius: 4, border: `1px solid ${LINE}`, mb: 3 }}>
          <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ px: 0.5, mb: 1.5 }}>
            <Typography fontWeight={800} color={INK} fontSize={18}>
              Today's entry
            </Typography>
            <Typography component={RouterLink} to="/entry" variant="body2" fontWeight={700} sx={{ color: "#0F766E", textDecoration: "none" }}>
              Open entry →
            </Typography>
          </Stack>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" } }}>
            {modules.map((m) => (
              <Tile key={m.tab} to={`/entry?tab=${m.tab}`} icon={m.icon} title={m.title} sub={m.sub} color={m.color} big />
            ))}
          </Box>
        </Paper>

        {owner.length > 0 && (
          <>
            <Typography fontWeight={800} color={INK} fontSize={16} sx={{ px: 0.5, mb: 1.5 }}>
              Owner
            </Typography>
            <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, mb: 3 }}>
              {owner.map((o) => (
                <Tile key={o.to} {...o} />
              ))}
            </Box>
          </>
        )}

        {/* Purane pages (zaroorat ho to) */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center" sx={{ px: 0.5 }}>
          <Typography variant="body2" color={MUTED}>
            Classic pages:
          </Typography>
          {[
            [`${pre}/hotel`, "Guest House"],
            [`${pre}/restaurant`, "Restaurant"],
            [`${pre}/office`, "Office Book"],
          ].map(([to, label]) => (
            <Typography key={to} component={RouterLink} to={to} variant="body2" fontWeight={600} sx={{ color: MUTED, "&:hover": { color: INK } }}>
              {label}
            </Typography>
          ))}
        </Stack>
      </Box>
    </Box>
  );
};

export default Home;
