// Login / password pages ka saadha layout: beech mein ek card, koi naam ya line nahi
import { useEffect } from "react";
import { Box, Paper, Stack, Typography } from "@mui/material";

const AuthShell = ({ title, subtitle, children, footer }) => {
  useEffect(() => {
    document.title = "Login";
  }, []);
  return (
    <Box sx={{ minHeight: "100vh", display: "grid", placeItems: "center", p: 2, bgcolor: "#F1F5F9" }}>
      <Paper elevation={0} sx={{ width: "100%", maxWidth: 400, p: { xs: 3, sm: 4 }, borderRadius: 4, border: "1px solid #E2E8F0" }}>
        <Typography variant="h5" fontWeight={800} sx={{ mb: subtitle ? 0.5 : 3 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ mb: 3 }}>
            {subtitle}
          </Typography>
        )}
        {children}
        {footer && <Box sx={{ mt: 3, pt: 2.5, borderTop: 1, borderColor: "divider" }}>{footer}</Box>}
      </Paper>
    </Box>
  );
};

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
