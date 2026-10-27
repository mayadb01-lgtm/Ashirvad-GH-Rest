// 📊 Staff / Manager ke liye: sirf wahi reports jo Super Admin ne di hain (data ki din-seema server lagata hai)
import { useEffect, useState } from "react";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import axios from "axios";
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import CashflowDashboard from "../../components/insights/CashflowDashboard";
import ModeBalanceDashboard from "../../components/insights/ModeBalanceDashboard";
import RestReceivableBalance from "../../components/insights/RestReceivableBalance";
import BanquetReportDashboard from "../../components/insights/BanquetReportDashboard";
import GhGrowthDashboard from "../../components/insights/GhGrowthDashboard";
import KharchControlDashboard from "../../components/insights/KharchControlDashboard";
import DataAlerts from "../../components/insights/DataAlerts";
import ProfitLossDashboard from "../../components/insights/ProfitLossDashboard";
import OwnerMonthlyDashboard from "../../components/owner/OwnerMonthlyDashboard";
import GuestDuesReminders from "../../components/owner/GuestDuesReminders";
import TabbedPage from "../../components/TabbedPage";
import RestExpensesDashboard from "../../components/restaurant/RestExpensesDashboard";
import RestSalesDashboard from "../../components/restaurant/RestSalesDashboard";
import BankBooksDashboard from "../../components/restaurant/RestBankBookEntry";
import RestUpaadEntriesDashboard from "../../components/restaurant/RestUpaadEntriesDashboard";
import RestLevanaDashboard from "../../components/restaurant/RestLevanaDashboard";
import RestAapvanaDashboard from "../../components/restaurant/RestAapvanaDashboard";
import AapvanaLevanaBalance from "../../components/restaurant/RestAapvanaLevana";
import GHSalesDashboard from "../../components/guest-house/GHSalesDashboard";
import GHBankBooksDashboard from "../../components/guest-house/GHBankBooksDashboard";
import GHUpaidEntriesDashboard from "../../components/guest-house/GHUpaidEntriesDashboard";
import OfficeBookDashboard from "../../components/office/OfficeBookDashboard";
import OfficeMerged from "../../components/office/OfficeMerged";
import OfficeCreditDebit from "../../components/office/OfficeCreditDebit";
import VendorGraphDashboard from "../../components/office/VendorGraphDashboard";
import PurchaseAnalyticsDashboard from "../../components/insights/PurchaseAnalyticsDashboard";
import StaffSalaryDashboard from "../../components/restaurant/StaffSalaryDashboard";
import GHGraph2 from "../../components/biz/GHGraph2";
import RestGraph2 from "../../components/biz/RestGraph2";
import MergedGraph2 from "../../components/biz/MergedGraph2";
import SalesGoals2 from "../../components/biz/SalesGoals2";
import ForecastDashboard from "../../components/insights/ForecastDashboard";
import PerformanceDashboard from "../../components/insights/PerformanceDashboard";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;
const VIEWS = {
  "owner-report": ["Owner monthly report", () => <OwnerMonthlyDashboard />],
  "profit-loss": ["Profit & Loss", () => <ProfitLossDashboard />],
  cashflow: ["Cashflow", () => <CashflowDashboard />],
  "mode-balance": ["Monthly balance (Cash / PP / PPS / PPC)", () => <ModeBalanceDashboard />],
  "gh-growth": ["GH growth", () => <GhGrowthDashboard />],
  "kharch-control": ["Expense control", () => <KharchControlDashboard />],
  "rest-receivables": ["Restaurant receivables", () => <RestReceivableBalance />],
  "guest-dues": ["Guest dues & reminders", () => <GuestDuesReminders />],
  "banquet-report": ["Banquet report & kitchen planning", () => <BanquetReportDashboard />],
  "data-check": ["Data check", () => <DataAlerts onNavigate={() => {}} />],
  "rest-expenses": ["Restaurant expenses (category-wise)", () => <RestExpensesDashboard />],
  "rest-sales": ["Restaurant sales report", () => <RestSalesDashboard />],
  "rest-bank": ["Restaurant bank books", () => <BankBooksDashboard />],
  "rest-upaad": ["Restaurant staff advance (upaad)", () => <RestUpaadEntriesDashboard />],
  "rest-dues": [
    "Restaurant receivables / payables",
    () => (
      <TabbedPage
        title="Restaurant receivables / payables"
        accent="#B45309"
        tabs={[
          { key: "levana", label: "Receivables", element: <RestLevanaDashboard /> },
          { key: "aapvana", label: "Payables", element: <RestAapvanaDashboard /> },
          { key: "balance", label: "Pending balance", element: <AapvanaLevanaBalance /> },
        ]}
      />
    ),
  ],
  "gh-reports": [
    "Guest House reports",
    () => (
      <TabbedPage
        title="Guest House reports"
        accent="#0F766E"
        tabs={[
          { key: "sales", label: "Sales", element: <GHSalesDashboard /> },
          { key: "bank", label: "Bank books", element: <GHBankBooksDashboard /> },
          { key: "unpaid", label: "Unpaid", element: <GHUpaidEntriesDashboard /> },
        ]}
      />
    ),
  ],
  "office-book": ["Office Book report", () => <OfficeBookDashboard />],
  "merged-report": ["Merged report (GH + Restaurant + Office)", () => <OfficeMerged />],
  vendors: [
    "Vendor report & graph",
    () => (
      <TabbedPage
        title="Vendors"
        tabs={[
          { key: "report", label: "Vendor report", element: <OfficeCreditDebit /> },
          { key: "graph", label: "Vendor graph", element: <VendorGraphDashboard /> },
        ]}
      />
    ),
  ],
  "purchase-analytics": ["Purchase analytics", () => <PurchaseAnalyticsDashboard />],
  "staff-salary": ["Staff salary & advance", () => <StaffSalaryDashboard />],
  graphs: [
    "Business graphs & sales goals",
    () => (
      <TabbedPage
        title="Business graphs"
        tabs={[
          { key: "gh", label: "Guest House", element: <GHGraph2 /> },
          { key: "rest", label: "Restaurant", element: <RestGraph2 /> },
          { key: "merged", label: "Merged", element: <MergedGraph2 /> },
          { key: "goals", label: "Sales goals", element: <SalesGoals2 /> },
        ]}
      />
    ),
  ],
  forecast: ["Forecast & key dates", () => <ForecastDashboard />],
  performance: ["Performance: year vs year", () => <PerformanceDashboard />],
};

const MyReportsPage = () => {
  useEffect(() => {
    document.title = import.meta.env.VITE_REACT_APP_BUSINESS_NAME || "Ashirvad";
  }, []);
  const [me, setMe] = useState(null);
  const [key, setKey] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${API}/quick/me`)
      .then(({ data }) => {
        setMe(data.me);
        setKey((k) => k || (data.me.reports || []).find((r) => VIEWS[r]) || "");
      })
      .catch(() => navigate("/login", { replace: true }));
  }, [navigate]);

  if (!me) return <Box sx={{ display: "grid", placeItems: "center", height: "60vh" }}><CircularProgress /></Box>;
  const list = (me.reports || []).filter((r) => VIEWS[r]);
  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", p: { xs: 1, md: 2 } }}>
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
        <Button component={RouterLink} to="/entry" size="small">← Entry</Button>
        <Typography variant="h6" fontWeight={800} sx={{ flex: 1 }}>Reports</Typography>
        {list.length > 1 && (
          <TextField select size="small" label="Report" value={key} onChange={(e) => setKey(e.target.value)} sx={{ minWidth: 260 }}>
            {list.map((r) => <MenuItem key={r} value={r}>{VIEWS[r][0]}</MenuItem>)}
          </TextField>
        )}
      </Stack>
      {me.reportDays !== null && me.reportDays !== undefined && (
        <Alert severity="info" sx={{ mb: 1 }}>
          You can see data of the last {me.reportDays} days only. Monthly reports start from that month.
        </Alert>
      )}
      {!list.length ? <Alert severity="warning">No reports are given to you. Ask the Super Admin.</Alert> : VIEWS[key]?.[1]()}
    </Box>
  );
};

export default MyReportsPage;
