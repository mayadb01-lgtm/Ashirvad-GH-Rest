// 🎨 Ashirvad: poore app ka ek theme
// Ek jagah rang, font, gol kone, buttons, tables, inputs: purane pages bhi isi se naye dikhte hain.
import { createTheme } from "@mui/material/styles";

export const BRAND = {
  ink: "#0F172A",
  ink2: "#334155",
  muted: "#64748B",
  line: "#E5E7EB",
  bg: "#F6F7F9",
  surface: "#FFFFFF",
  gh: "#0F766E",
  rest: "#B45309",
  office: "#4338CA",
  good: "#15803D",
  bad: "#B91C1C",
  warn: "#B45309",
};

const FONT = '"Inter", "Noto Sans", "Segoe UI", Roboto, system-ui, -apple-system, sans-serif';

export const themeOptions = {
  palette: {
    mode: "light",
    primary: { main: BRAND.gh, dark: "#0B5D57", light: "#14B8A6", contrastText: "#fff" },
    secondary: { main: BRAND.office, contrastText: "#fff" },
    error: { main: BRAND.bad },
    warning: { main: "#D97706" },
    success: { main: BRAND.good },
    info: { main: "#0369A1" },
    text: { primary: BRAND.ink, secondary: BRAND.muted },
    divider: BRAND.line,
    background: { default: BRAND.bg, paper: BRAND.surface },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: FONT,
    h1: { fontWeight: 800, letterSpacing: "-0.02em" },
    h2: { fontWeight: 800, letterSpacing: "-0.02em" },
    h3: { fontWeight: 800, letterSpacing: "-0.02em" },
    h4: { fontWeight: 800, letterSpacing: "-0.015em" },
    h5: { fontWeight: 800, letterSpacing: "-0.01em" },
    h6: { fontWeight: 700 },
    subtitle1: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 700, letterSpacing: 0 },
    body2: { lineHeight: 1.5 },
  },
  shadows: [
    "none",
    "0 1px 2px rgba(15,23,42,.06)",
    "0 1px 3px rgba(15,23,42,.08), 0 1px 2px rgba(15,23,42,.04)",
    "0 4px 8px -2px rgba(15,23,42,.08), 0 2px 4px -2px rgba(15,23,42,.05)",
    ...Array(21).fill("0 12px 24px -8px rgba(15,23,42,.14), 0 4px 8px -4px rgba(15,23,42,.08)"),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { backgroundColor: BRAND.bg, WebkitFontSmoothing: "antialiased", fontFeatureSettings: '"cv11", "ss01"' },
        "input[type=number]::-webkit-inner-spin-button, input[type=number]::-webkit-outer-spin-button": { WebkitAppearance: "none", margin: 0 },
        "::selection": { background: "rgba(15,118,110,.18)" },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: { borderRadius: 10, paddingInline: 16, minHeight: 38 },
        containedPrimary: { "&:hover": { backgroundColor: "#0B5D57" } },
        outlined: { borderColor: "#D1D5DB", "&:hover": { borderColor: BRAND.ink2, backgroundColor: "#F9FAFB" } },
        sizeLarge: { minHeight: 48, fontSize: 16 },
      },
    },
    MuiIconButton: { styleOverrides: { root: { borderRadius: 10 } } },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: BRAND.line },
        elevation1: { boxShadow: "0 1px 2px rgba(15,23,42,.06)", border: `1px solid ${BRAND.line}` },
        elevation2: { boxShadow: "0 1px 3px rgba(15,23,42,.08)", border: `1px solid ${BRAND.line}` },
        elevation3: { boxShadow: "0 4px 8px -2px rgba(15,23,42,.08)", border: `1px solid ${BRAND.line}` },
      },
    },
    MuiCard: { defaultProps: { elevation: 0 }, styleOverrides: { root: { borderRadius: 14, border: `1px solid ${BRAND.line}` } } },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: { root: { backgroundColor: "rgba(255,255,255,.92)", backdropFilter: "saturate(180%) blur(8px)", borderBottom: `1px solid ${BRAND.line}`, color: BRAND.ink } },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#fff",
          borderRadius: 10,
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#D1D5DB" },
          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: BRAND.ink2 },
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: BRAND.gh, borderWidth: 2 },
        },
      },
    },
    MuiInputLabel: { styleOverrides: { root: { fontWeight: 500 } } },
    MuiTableContainer: { styleOverrides: { root: { borderRadius: 12, border: `1px solid ${BRAND.line}`, boxShadow: "none !important" } } },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-head": {
            backgroundColor: "#F8FAFC",
            color: BRAND.muted,
            fontWeight: 700,
            fontSize: 12,
            textTransform: "uppercase",
            letterSpacing: ".04em",
            borderBottom: `1px solid ${BRAND.line}`,
          },
        },
      },
    },
    MuiTableCell: { styleOverrides: { root: { borderColor: "#F1F5F9" }, sizeSmall: { paddingTop: 8, paddingBottom: 8 } } },
    MuiTableRow: { styleOverrides: { root: { "&.MuiTableRow-hover:hover": { backgroundColor: "#F8FAFC" } } } },
    MuiChip: { styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } } },
    MuiTabs: {
      styleOverrides: {
        root: { minHeight: 44 },
        indicator: { height: 3, borderRadius: 3, backgroundColor: BRAND.ink },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { minHeight: 44, fontWeight: 700, color: BRAND.muted, "&.Mui-selected": { color: BRAND.ink } },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 16 } } },
    MuiTooltip: { styleOverrides: { tooltip: { backgroundColor: BRAND.ink, fontSize: 12, borderRadius: 8, padding: "6px 10px" } } },
    MuiAlert: { styleOverrides: { root: { borderRadius: 12, alignItems: "center" } } },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          "&.Mui-selected": { backgroundColor: BRAND.ink, color: "#fff", "& .MuiListItemIcon-root": { color: "#fff" } },
          "&.Mui-selected:hover": { backgroundColor: BRAND.ink },
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: `1px solid ${BRAND.line}`,
          borderRadius: 12,
          backgroundColor: "#fff",
          "--DataGrid-rowBorderColor": "#F1F5F9",
          "& .MuiDataGrid-columnHeaders": { backgroundColor: "#F8FAFC" },
          "& .MuiDataGrid-columnHeaderTitle": { fontWeight: 700, color: BRAND.muted, fontSize: 12, textTransform: "uppercase", letterSpacing: ".04em" },
          "& .MuiDataGrid-row:hover": { backgroundColor: "#F8FAFC" },
          "& .MuiDataGrid-cell:focus, & .MuiDataGrid-columnHeader:focus": { outline: "none" },
        },
      },
    },
  },
};

const appTheme = createTheme(themeOptions);

// Admin dashboard (Toolpad) ko CSS variables wala version chahiye
// eslint-disable-next-line no-unused-vars
const { palette: _p, ...restOptions } = themeOptions;
export const dashboardTheme = createTheme({
  ...restOptions,
  cssVariables: { colorSchemeSelector: "data-toolpad-color-scheme" },
  colorSchemes: { light: { palette: themeOptions.palette } },
  breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1200, xl: 1536 } },
});

export default appTheme;
