// Login / signup pages ka common premium layout
// PC: baayein brand panel, daayein form. Mobile: sirf form.
import { Box, Stack, Typography } from "@mui/material";

const NAME = import.meta.env.VITE_REACT_APP_BUSINESS_NAME || "Ashirvad";
const POINTS = [
  ["Guest House", "Rooms, guests aur payment ek jagah", "#14B8A6"],
  ["Restaurant", "Roz ka closing, kharch aur upaad", "#F59E0B"],
  ["Office Book", "Aavak, javak aur banquet", "#818CF8"],
];

const AuthShell = ({ title, subtitle, children, footer }) => (
  <Box sx={{ minHeight: "100vh", display: "grid", gridTemplateColumns: { xs: "1fr", md: "1.05fr 1fr" }, bgcolor: "background.default" }}>
    {/* Brand panel */}
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
        p: 6,
        color: "#fff",
        bgcolor: "#0F172A",
        backgroundImage: "radial-gradient(1200px 500px at -10% 110%, rgba(15,118,110,.55), transparent 60%), radial-gradient(700px 400px at 110% -10%, rgba(67,56,202,.35), transparent 60%)",
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box sx={{ width: 40, height: 40, borderRadius: 2.5, bgcolor: "#fff", color: "#0F172A", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 20 }}>
          {NAME.charAt(0)}
        </Box>
        <Typography fontWeight={800} fontSize={18}>
          {NAME}
        </Typography>
      </Stack>
      <Box sx={{ maxWidth: 460 }}>
        <Typography sx={{ fontSize: 40, fontWeight: 800, lineHeight: 1.1, letterSpacing: "-0.03em", mb: 2 }}>
          Poore business ka hisaab, ek jagah.
        </Typography>
        <Typography sx={{ opacity: 0.75, mb: 4 }}>Roz ki entry phone se, owner ke liye saaf reports aur graphs.</Typography>
        <Stack spacing={2}>
          {POINTS.map(([t, s, c]) => (
            <Stack key={t} direction="row" spacing={1.5} alignItems="center">
              <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: c, boxShadow: `0 0 0 4px ${c}33` }} />
              <Box>
                <Typography fontWeight={700}>{t}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {s}
                </Typography>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>
      <Typography variant="caption" sx={{ opacity: 0.5 }}>
        © {new Date().getFullYear()} {NAME}
      </Typography>
    </Box>

    {/* Form side */}
    <Box sx={{ display: "grid", placeItems: "center", p: { xs: 2.5, sm: 4 } }}>
      <Box sx={{ width: "100%", maxWidth: 400 }}>
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ display: { xs: "flex", md: "none" }, mb: 4 }}>
          <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: "#0F172A", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>{NAME.charAt(0)}</Box>
          <Typography fontWeight={800}>{NAME}</Typography>
        </Stack>
        <Typography variant="h4" sx={{ fontSize: 30, mb: 0.5 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {subtitle}
          </Typography>
        )}
        {children}
        {footer && <Box sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: "divider" }}>{footer}</Box>}
      </Box>
    </Box>
  </Box>
);

export const AuthLinks = ({ links }) => (
  <Stack direction="row" flexWrap="wrap" columnGap={2} rowGap={0.75}>
    {links.map(([label, onClick]) => (
      <Typography key={label} component="button" type="button" onClick={onClick} sx={{ border: 0, bgcolor: "transparent", p: 0, cursor: "pointer", color: "text.secondary", fontSize: 13.5, fontWeight: 600, "&:hover": { color: "primary.main", textDecoration: "underline" } }}>
        {label}
      </Typography>
    ))}
  </Stack>
);

export default AuthShell;
