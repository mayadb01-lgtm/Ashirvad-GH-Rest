// Ek page, upar tabs: kai purane reports ek jagah (menu chhota rehta hai)
// Chuna hua tab URL mein ?tab= se yaad rehta hai (refresh / link share pe bhi wahi khule)
import { Suspense } from "react";
import { useSearchParams } from "react-router-dom";
import { Box, CircularProgress, Tab, Tabs, Typography } from "@mui/material";

const TabbedPage = ({ title, subtitle, tabs, accent = "#0F172A" }) => {
  const [params, setParams] = useSearchParams();
  const current = tabs.find((t) => t.key === params.get("tab")) || tabs[0];
  return (
    <Box sx={{ px: { xs: 1, md: 3 }, pt: { xs: 1.5, md: 3 }, pb: 4 }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h5">{title}</Typography>
        {subtitle && (
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2, position: "sticky", top: 0, zIndex: 3, bgcolor: "background.default" }}>
        <Tabs
          value={current.key}
          onChange={(_, v) => setParams({ tab: v }, { replace: true })}
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{ "& .MuiTabs-indicator": { backgroundColor: accent }, "& .Mui-selected": { color: `${accent} !important` } }}
        >
          {tabs.map((t) => (
            <Tab key={t.key} value={t.key} label={t.label} />
          ))}
        </Tabs>
      </Box>
      <Suspense fallback={<CircularProgress />}>
        <Box key={current.key}>{current.element}</Box>
      </Suspense>
    </Box>
  );
};

export default TabbedPage;
