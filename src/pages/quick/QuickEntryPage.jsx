// /entry  →  GH + Restaurant + Office ki entry, ek hi jagah (PC + mobile)
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  BottomNavigation,
  BottomNavigationAction,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HotelIcon from "@mui/icons-material/Hotel";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import BusinessCenterIcon from "@mui/icons-material/BusinessCenter";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { API, DATE_FMT, Q, useIsDesktop } from "./shared";
import GhQuickEntry from "./GhQuickEntry";
import RestQuickEntry from "./RestQuickEntry";
import OfficeQuickEntry from "./OfficeQuickEntry";

dayjs.extend(customParseFormat);

const MODULES = [
  { key: "gh", label: "Guest House", short: "GH", icon: <HotelIcon />, color: Q.gh, old: "/hotel" },
  { key: "rest", label: "Restaurant", short: "Restaurant", icon: <RestaurantIcon />, color: Q.rest, old: "/restaurant" },
  { key: "office", label: "Office Book", short: "Office", icon: <BusinessCenterIcon />, color: Q.office, old: "/office" },
];
const WEEKDAY_HI = ["Ravivar", "Somvar", "Mangalvar", "Budhvar", "Guruvar", "Shukravar", "Shanivar"];

const readTab = () => {
  try {
    const t = new URLSearchParams(window.location.search).get("tab") || localStorage.getItem("qe-tab");
    return MODULES.some((m) => m.key === t) ? t : "gh";
  } catch {
    return "gh";
  }
};

const QuickEntryPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const desktop = useIsDesktop();
  const [auth, setAuth] = useState(null); // { isAdmin, name }
  const [tab, setTab] = useState(readTab);
  const [day, setDay] = useState(dayjs().startOf("day"));

  // Login check + permission: server batata hai kaun hai aur kya dekh sakta hai
  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/quick/me`)
      .then(({ data }) => {
        if (!alive) return;
        const me = data.me;
        setAuth(me);
        if (me.modules.length && !me.modules.includes(tab)) setTab(me.modules[0]);
        if (me.allowedDates?.length) setDay(dayjs(me.allowedDates[0], DATE_FMT).startOf("day"));
      })
      .catch(() => alive && navigate("/login", { state: { from: location }, replace: true }));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    try {
      await axios.get(`${API}/${auth?.isOwnerAdmin ? "admin/logout-admin" : "user/logout-user"}`);
    } catch {
      /* cookie hat gayi ho to bhi login pe bhejo */
    }
    window.location.href = "/login";
  };

  useEffect(() => {
    try {
      localStorage.setItem("qe-tab", tab);
    } catch {
      /* ignore */
    }
  }, [tab]);

  const today = dayjs().startOf("day");
  const staffDates = auth && !auth.isAdmin ? (auth.allowedDates || []).map((d) => dayjs(d, DATE_FMT).startOf("day")) : null;
  const minDay = null;
  const maxDay = null;
  const canPrev = true;
  const canNext = true;
  const date = day.format(DATE_FMT);
  const visibleModules = MODULES.filter((m) => auth?.modules?.includes(m.key));
  const mod = visibleModules.find((m) => m.key === tab) || visibleModules[0] || MODULES[0];

  const dayLabel = useMemo(() => {
    const diff = today.diff(day, "day");
    const rel = diff === 0 ? "Aaj" : diff === 1 ? "Kal" : diff === -1 ? "Kal (aage)" : WEEKDAY_HI[day.day()];
    return { rel, full: day.format("D MMM YYYY") };
  }, [day, today]);

  const pickDate = (value) => {
    const d = dayjs(value, "YYYY-MM-DD");
    if (!d.isValid()) return;
    if (minDay && d.isBefore(minDay, "day")) return setDay(minDay);
    if (maxDay && d.isAfter(maxDay, "day")) return setDay(maxDay);
    setDay(d.startOf("day"));
  };

  if (!auth)
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: Q.bg }}>
        <CircularProgress />
      </Box>
    );

  if (!auth.isActive || visibleModules.length === 0)
    return (
      <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", bgcolor: Q.bg, p: 3 }}>
        <Paper variant="outlined" sx={{ p: 4, maxWidth: 420, textAlign: "center", borderRadius: 3 }}>
          <Typography fontSize={40}>🔒</Typography>
          <Typography variant="h6" fontWeight={800} gutterBottom>
            Namaste {auth.name}
          </Typography>
          <Typography color={Q.muted} sx={{ mb: 3 }}>
            {auth.isActive
              ? "Aapko abhi kisi business ki entry ka access nahi mila. Owner se kaho ki aapka department (GH / Restaurant / Office) set kar dein."
              : "Aapka account band hai. Owner se baat karo."}
          </Typography>
          <Button variant="outlined" onClick={logout}>
            Logout
          </Button>
        </Paper>
      </Box>
    );

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: Q.bg }}>
      {/* Header */}
      <Paper
        elevation={0}
        square
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: `1px solid ${Q.line}`,
          pt: "env(safe-area-inset-top)",
        }}
      >
        <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 1.5, md: 3 }, py: 1 }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: Q.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>A</Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography fontWeight={800} lineHeight={1.1} noWrap>
                {desktop ? `${mod.label} entry` : mod.label}
              </Typography>
              <Typography variant="caption" color={Q.muted} noWrap component="div">
                {auth.name}
                {auth.isAdmin ? " · Admin" : ""}
              </Typography>
            </Box>
            {desktop && visibleModules.length > 1 && (
              <Tabs
                value={tab}
                onChange={(_, v) => setTab(v)}
                sx={{ "& .MuiTab-root": { textTransform: "none", fontWeight: 700, minHeight: 48 }, "& .MuiTabs-indicator": { bgcolor: mod.color, height: 3 } }}
              >
                {visibleModules.map((m) => (
                  <Tab key={m.key} value={m.key} icon={m.icon} iconPosition="start" label={m.label} sx={{ "&.Mui-selected": { color: m.color } }} />
                ))}
              </Tabs>
            )}
            {auth.isAdmin && (
              <>
                <Button component={RouterLink} to={mod.old} size="small" sx={{ color: Q.muted, textTransform: "none", whiteSpace: "nowrap" }}>
                  Purana page
                </Button>
                {auth.isOwnerAdmin && (
                  <IconButton component={RouterLink} to="/dashboard" aria-label="Dashboard">
                    <DashboardIcon />
                  </IconButton>
                )}
              </>
            )}
            <Button size="small" onClick={logout} sx={{ color: Q.muted, textTransform: "none" }}>
              Logout
            </Button>
          </Stack>

          {/* Date bar: staff ko sirf aaj (privacy), admin ko koi bhi din */}
          {staffDates ? (
            <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mt: 1 }}>
              {staffDates.length > 1 ? (
                staffDates.map((d) => (
                  <Button
                    key={d.format(DATE_FMT)}
                    variant={d.isSame(day, "day") ? "contained" : "outlined"}
                    onClick={() => setDay(d)}
                    sx={{ fontWeight: 800, bgcolor: d.isSame(day, "day") ? mod.color : undefined, borderColor: mod.color, color: d.isSame(day, "day") ? "#fff" : mod.color }}
                  >
                    {d.isSame(today, "day") ? "Aaj" : "Kal (raat ki entry)"} · {d.format("D MMM")}
                  </Button>
                ))
              ) : (
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="caption" color={Q.muted} display="block" lineHeight={1.2}>
                    Aaj
                  </Typography>
                  <Typography fontWeight={800} fontSize={18} lineHeight={1.3}>
                    {day.format("D MMM YYYY")}
                  </Typography>
                </Box>
              )}
            </Stack>
          ) : (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <IconButton onClick={() => setDay((d) => d.subtract(1, "day"))} disabled={!canPrev} sx={{ bgcolor: Q.bg }} aria-label="Pichhla din">
              <ChevronLeftIcon />
            </IconButton>
            <Box component="label" sx={{ flex: 1, textAlign: "center", cursor: "pointer", position: "relative" }}>
              <Typography variant="caption" color={Q.muted} display="block" lineHeight={1.2}>
                {dayLabel.rel}
              </Typography>
              <Typography fontWeight={800} fontSize={18} lineHeight={1.3}>
                {dayLabel.full}
              </Typography>
              <input
                type="date"
                value={day.format("YYYY-MM-DD")}
                min={minDay ? minDay.format("YYYY-MM-DD") : undefined}
                max={maxDay ? maxDay.format("YYYY-MM-DD") : undefined}
                onChange={(e) => pickDate(e.target.value)}
                aria-label="Date chuno"
                style={{ position: "absolute", inset: 0, opacity: 0, width: "100%", cursor: "pointer" }}
              />
            </Box>
            <IconButton onClick={() => setDay((d) => d.add(1, "day"))} disabled={!canNext} sx={{ bgcolor: Q.bg }} aria-label="Agla din">
              <ChevronRightIcon />
            </IconButton>
            {!day.isSame(today, "day") && (
              <Button size="small" onClick={() => setDay(today)} sx={{ fontWeight: 700, color: mod.color }}>
                Aaj
              </Button>
            )}
          </Stack>
          )}
        </Box>
      </Paper>

      {/* Body */}
      <Box sx={{ maxWidth: 1280, mx: "auto", px: { xs: 1.5, md: 3 }, py: 2 }}>
        {mod.key === "gh" && <GhQuickEntry key={`gh-${date}`} date={date} isAdmin={auth.isAdmin} />}
        {mod.key === "rest" && <RestQuickEntry key={`rest-${date}`} date={date} isAdmin={auth.isAdmin} />}
        {mod.key === "office" && <OfficeQuickEntry key={`office-${date}`} date={date} isAdmin={auth.isAdmin} />}
      </Box>

      {/* Mobile bottom tabs */}
      {!desktop && visibleModules.length > 1 && (
        <Paper elevation={8} square sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 6, pb: "env(safe-area-inset-bottom)" }}>
          <BottomNavigation
            showLabels
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ "& .Mui-selected": { color: `${mod.color} !important` }, "& .MuiBottomNavigationAction-label": { fontWeight: 700 } }}
          >
            {visibleModules.map((m) => (
              <BottomNavigationAction key={m.key} value={m.key} label={m.short} icon={m.icon} />
            ))}
          </BottomNavigation>
        </Paper>
      )}
    </Box>
  );
};

export default QuickEntryPage;
