import { useRoutes, useNavigate, Navigate } from "react-router-dom";
import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { Box, Button, Stack, Typography } from "@mui/material";
import { dashboardTheme } from "../theme";
import TabbedPage from "../components/TabbedPage";
import TodayHome from "../components/owner/TodayHome";
import TodayIcon from "@mui/icons-material/Today";
import EditNoteIcon from "@mui/icons-material/EditNote";
import BadgeIcon from "@mui/icons-material/Badge";
// import RestaurantIcon from "@mui/icons-material/Restaurant";
// import HotelIcon from "@mui/icons-material/Hotel";
import BarChartIcon from "@mui/icons-material/BarChart";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import PaymentsIcon from "@mui/icons-material/Payments";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import { BookOutlined } from "@mui/icons-material";
import PieChartIcon from "@mui/icons-material/PieChart";
import StackedLineChartIcon from "@mui/icons-material/StackedLineChart";
import LooksOneIcon from "@mui/icons-material/LooksOne";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CategoryIcon from "@mui/icons-material/Category";
import DateRangeIcon from "@mui/icons-material/DateRange";

// Components
import HomeDashboard from "../components/HomeDashboard";
import GHDashboard from "../components/guest-house/GHDashboard";
import GHSalesDashboard from "../components/guest-house/GHSalesDashboard";
import GHSalesDashboardRange from "../components/guest-house/GHDashboardRange";
import GHSalesGoalDashboard from "../components/guest-house/GHSalesGoalDashboard";
import GHHome from "../components/guest-house/GHHome";
import RestHome from "../components/restaurant/RestHome";
import RestSalesDashboard from "../components/restaurant/RestSalesDashboard";
import RestSalesGoalDashboard from "../components/restaurant/RestSalesGoalDashboard";
import RestUpaadEntriesDashboard from "../components/restaurant/RestUpaadEntriesDashboard";
import RestExpensesDashboard from "../components/restaurant/RestExpensesDashboard";
import BankBooksDashboard from "../components/restaurant/RestBankBookEntry";
import RestStaffDashboard from "../components/restaurant/RestStaffDashboard";
import RestCategoryExpensesDashboard from "../components/restaurant/RestCategoryExpensesDashboard";
import RestPendingUsersDashboard from "../components/restaurant/RestPendingUsersDashboard";
import OfficeBookDashboard from "../components/office/OfficeBookDashboard";
import GHBankBooksDashboard from "../components/guest-house/GHBankBooksDashboard";
import OfficeCategoryDashboard from "../components/office/OfficeCategoryDashboard";
import OfficeMerged from "../components/office/OfficeMerged";
import OfficeCreditDebit from "../components/office/OfficeCreditDebit";
import VendorGraphDashboard from "../components/office/VendorGraphDashboard";
import CashflowDashboard from "../components/insights/CashflowDashboard";
import GhGrowthDashboard from "../components/insights/GhGrowthDashboard";
import KharchControlDashboard from "../components/insights/KharchControlDashboard";
import DataAlerts from "../components/insights/DataAlerts";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import GHUpaidEntriesDashboard from "../components/guest-house/GHUpaidEntriesDashboard";
import OfficeHome from "../components/office/OfficeHome";
import OfficeMergedGraph from "../components/office/OfficeMergedGraph";
import RestAapvanaDashboard from "../components/restaurant/RestAapvanaDashboard";
import RestLevanaDashboard from "../components/restaurant/RestLevanaDashboard";
import AapvanaLevanaBalance from "../components/restaurant/RestAapvanaLevana";
import OfficeBanquetSalesGoalDashboard from "../components/office/OfficeBanquetSalesGoalDashboard";
import OfficeBakeryBaadaSalesGoalDashboard from "../components/office/OfficeBakeryBaadaSalesGoalDashboard";
import OfficeMotiBaadaSalesGoalDashboard from "../components/office/OfficeMotiBaadaSalesGoalDashboard";
// Staff Salary
import StaffSalaryDashboard from "../components/restaurant/StaffSalaryDashboard";
import DataImportDashboard from "../components/import/DataImportDashboard";
import OwnerMonthlyDashboard from "../components/owner/OwnerMonthlyDashboard";
import GuestDuesReminders from "../components/owner/GuestDuesReminders";
import StaffAccessDashboard from "../components/owner/StaffAccessDashboard";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import InsightsIcon from "@mui/icons-material/Insights";
import UploadFileIcon from "@mui/icons-material/UploadFile";

const DashboardHeader = () => {
  const navigate = useNavigate();
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" justifyContent="space-between" width="100%">
      <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
        <Box sx={{ width: 32, height: 32, borderRadius: 2, bgcolor: "#0F172A", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 }}>
          {(import.meta.env.VITE_REACT_APP_BUSINESS_NAME || "A").charAt(0)}
        </Box>
        <Box sx={{ minWidth: 0, display: { xs: "none", sm: "block" } }}>
          <Typography fontWeight={800} lineHeight={1.1} noWrap>
            {import.meta.env.VITE_REACT_APP_BUSINESS_NAME || "Ashirvad"}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            Owner dashboard
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button variant="contained" size="small" startIcon={<EditNoteIcon />} onClick={() => navigate("/entry")}>
          Entry karo
        </Button>
        <Button variant="outlined" size="small" onClick={() => navigate("/")} sx={{ display: { xs: "none", md: "inline-flex" } }}>
          Purana Home
        </Button>
      </Stack>
    </Stack>
  );
};

// Saare purane menu items waise hi + naye items (Aaj ka hisaab, Guest Dues, Staff Access).
// Naye tab-wale pages (Reports, Setup...) bhi "Naye combined pages" mein rakhe hain.
const NAVIGATION = [
  { segment: "home", title: "Aaj ka hisaab", icon: <TodayIcon /> },
  { segment: "home-classic", title: "Home", icon: <DashboardIcon /> },
  { segment: "owner-report", title: "Owner Monthly Report", icon: <InsightsIcon /> },
  { segment: "guest-dues", title: "Guest Dues & Reminders", icon: <WhatsAppIcon /> },
  { kind: "header", title: "Business Growth" },
  { segment: "cashflow", title: "Cashflow (mahina-wise)", icon: <AccountBalanceWalletIcon /> },
  { segment: "gh-growth", title: "GH Growth", icon: <TrendingUpIcon /> },
  { segment: "kharch-control", title: "Kharch Control", icon: <ReceiptLongIcon /> },
  { segment: "data-check", title: "Data Check (galti alert)", icon: <FactCheckIcon /> },
  { kind: "header", title: "Guest House" },
  { segment: "guest-house", title: "GH - Graph", icon: <PieChartIcon /> },
  { segment: "gh-dashboard", title: "GH - One Day View", icon: <LooksOneIcon /> },
  { segment: "gh-dashboard-range", title: "GH - Date Range", icon: <DateRangeIcon /> },
  {
    segment: "gh-reports",
    title: "GH - Reports",
    icon: <BarChartIcon />,
    children: [
      { segment: "sales-report", title: "GH - Sales Report", icon: <CurrencyRupeeIcon /> },
      { segment: "bank-books", title: "GH - Bank Books", icon: <BookOutlined /> },
      { segment: "upaid-report", title: "GH - Upaid", icon: <PaymentsIcon /> },
    ],
  },
  { kind: "header", title: "Restaurant" },
  { segment: "restaurant", title: "Rest - Graph", icon: <PieChartIcon /> },
  {
    segment: "res-reports",
    title: "Rest - Reports",
    icon: <BarChartIcon />,
    children: [
      { segment: "sales-report", title: "Rest - Sales", icon: <CurrencyRupeeIcon /> },
      { segment: "upaad-report", title: "Rest - Upaad", icon: <PaymentsIcon /> },
      { segment: "expenses-report", title: "Rest - Expenses", icon: <CreditScoreIcon /> },
      { segment: "bank-books", title: "Rest - Bank Books", icon: <BookOutlined /> },
      { segment: "levana-report", title: "Rest - Levana", icon: <CurrencyRupeeIcon /> },
      { segment: "aapvana-report", title: "Rest - Aapvana", icon: <CurrencyRupeeIcon /> },
      { segment: "aapvana-levana-balance", title: "Pending Balance", icon: <CurrencyRupeeIcon /> },
    ],
  },
  { segment: "manage-staff", title: "Rest - Manage Staff", icon: <BadgeIcon /> },
  { segment: "categories-expenses", title: "Categories & Expenses", icon: <CategoryIcon /> },
  { segment: "pending-users", title: "Rest - Pending Users", icon: <BadgeIcon /> },
  { kind: "header", title: "Office Book" },
  { segment: "office", title: "Office Graph", icon: <PieChartIcon /> },
  { segment: "office-book", title: "Office Book", icon: <LooksOneIcon /> },
  { segment: "office-category", title: "Office Category", icon: <CategoryIcon /> },
  { kind: "header", title: "Staff Salary" },
  { segment: "staff-salary", title: "Staff Salary", icon: <BadgeIcon /> },
  { kind: "header", title: "Merged Reports" },
  { segment: "merged-graph", title: "Merged Graph", icon: <PieChartIcon /> },
  { segment: "merged-reports", title: "Merged Report", icon: <BarChartIcon /> },
  { segment: "merged-vendor-report", title: "Merged Vendor Report", icon: <BarChartIcon /> },
  { segment: "merged-vendor-graph", title: "Vendor Graph (saare vendors)", icon: <InsightsIcon /> },
  { kind: "header", title: "Sales Goal" },
  {
    segment: "sales-goal",
    title: "Sales Goal",
    icon: <StackedLineChartIcon />,
    children: [
      { segment: "gh-sales-goal", title: "GH - Sales Goal", icon: <StackedLineChartIcon /> },
      { segment: "rest-sales-goal", title: "Rest - Sales Goal", icon: <StackedLineChartIcon /> },
      { segment: "office-banquet-sales-goal", title: "Banquet Sales Goal", icon: <StackedLineChartIcon /> },
      { segment: "office-bakery-baada", title: "Bakery Baada", icon: <StackedLineChartIcon /> },
      { segment: "office-moti-baada", title: "Moti  Baada", icon: <StackedLineChartIcon /> },
    ],
  },
  { kind: "header", title: "Naye combined pages (tabs)" },
  { segment: "gh-all-reports", title: "GH - Saare Reports", icon: <CurrencyRupeeIcon /> },
  { segment: "rest-all-reports", title: "Rest - Saare Reports", icon: <PaymentsIcon /> },
  { segment: "rest-setup", title: "Rest - Staff & Setup", icon: <BadgeIcon /> },
  { segment: "office-all", title: "Office Book + Category", icon: <BookOutlined /> },
  { segment: "merged-all", title: "Merged - Saare", icon: <StackedLineChartIcon /> },
  { segment: "sales-goals", title: "Sales Goals - Saare", icon: <BarChartIcon /> },
  { kind: "header", title: "Settings" },
  { segment: "staff-access", title: "Staff Access", icon: <AdminPanelSettingsIcon /> },
  { segment: "data-import", title: "Import Excel / CSV", icon: <UploadFileIcon /> },
];

const DashboardPage = () => {
  const navigate = useNavigate();

  const basePath = "/dashboard";

  const router = {
    navigate: (path) => {
      const cleanPath = path.startsWith("/") ? path.slice(1) : path;
      navigate(`${basePath}/${cleanPath}`);
    },
    pathname: window.location.pathname.replace(basePath, ""),
    searchParams: new URLSearchParams(window.location.search),
  };

  const routes = useRoutes([
    // Redirect /dashboard to /dashboard/home
    { path: "", element: <Navigate to="home" replace /> },
    { path: "home", element: <TodayHome onNavigate={router.navigate} /> },
    // Purana links-wala home bhi rakha hai
    { path: "home-classic", element: <HomeDashboard navigation={NAVIGATION} onNavigate={router.navigate} /> },
    {
      path: "gh-all-reports",
      element: (
        <TabbedPage
          title="Guest House reports"
          accent="#0F766E"
          tabs={[
            { key: "range", label: "Date range", element: <GHSalesDashboardRange /> },
            { key: "sales", label: "Sales", element: <GHSalesDashboard /> },
            { key: "bank", label: "Bank books", element: <GHBankBooksDashboard /> },
            { key: "unpaid", label: "Baaki (UnPaid)", element: <GHUpaidEntriesDashboard /> },
          ]}
        />
      ),
    },
    {
      path: "rest-all-reports",
      element: (
        <TabbedPage
          title="Restaurant reports"
          accent="#B45309"
          tabs={[
            { key: "sales", label: "Sales", element: <RestSalesDashboard /> },
            { key: "upaad", label: "Upaad", element: <RestUpaadEntriesDashboard /> },
            { key: "expenses", label: "Kharch", element: <RestExpensesDashboard /> },
            { key: "bank", label: "Bank books", element: <BankBooksDashboard /> },
            { key: "levana", label: "Levana", element: <RestLevanaDashboard /> },
            { key: "aapvana", label: "Aapvana", element: <RestAapvanaDashboard /> },
            { key: "balance", label: "Pending balance", element: <AapvanaLevanaBalance /> },
          ]}
        />
      ),
    },
    {
      path: "rest-setup",
      element: (
        <TabbedPage
          title="Restaurant staff & setup"
          accent="#B45309"
          tabs={[
            { key: "staff", label: "Staff", element: <RestStaffDashboard /> },
            { key: "categories", label: "Categories & kharch", element: <RestCategoryExpensesDashboard /> },
            { key: "pending", label: "Levana/Aapvana log", element: <RestPendingUsersDashboard /> },
          ]}
        />
      ),
    },
    {
      path: "office-all",
      element: (
        <TabbedPage
          title="Office Book"
          accent="#4338CA"
          tabs={[
            { key: "book", label: "Office Book", element: <OfficeBookDashboard /> },
            { key: "category", label: "Categories", element: <OfficeCategoryDashboard /> },
          ]}
        />
      ),
    },
    {
      path: "merged-all",
      element: (
        <TabbedPage
          title="Merged reports"
          subtitle="Guest House + Restaurant + Office ek saath"
          tabs={[
            { key: "graph", label: "Graph", element: <OfficeMergedGraph /> },
            { key: "report", label: "Report", element: <OfficeMerged /> },
            { key: "vendor", label: "Vendor report", element: <OfficeCreditDebit /> },
            { key: "vendor-graph", label: "Vendor graph", element: <VendorGraphDashboard /> },
          ]}
        />
      ),
    },
    {
      path: "sales-goals",
      element: (
        <TabbedPage
          title="Sales goals"
          tabs={[
            { key: "gh", label: "Guest House", element: <GHSalesGoalDashboard /> },
            { key: "rest", label: "Restaurant", element: <RestSalesGoalDashboard /> },
            { key: "banquet", label: "Banquet", element: <OfficeBanquetSalesGoalDashboard /> },
            { key: "bakery", label: "Bakery Baada", element: <OfficeBakeryBaadaSalesGoalDashboard /> },
            { key: "moti", label: "Moti Baada", element: <OfficeMotiBaadaSalesGoalDashboard /> },
          ]}
        />
      ),
    },
    { path: "gh-dashboard", element: <GHDashboard /> },
    { path: "gh-dashboard-range", element: <GHSalesDashboardRange /> },
    { path: "guest-house", element: <GHHome /> },
    { path: "gh-reports/sales-report", element: <GHSalesDashboard /> },
    { path: "gh-reports/bank-books", element: <GHBankBooksDashboard /> },
    { path: "gh-reports/upaid-report", element: <GHUpaidEntriesDashboard /> },
    { path: "restaurant", element: <RestHome /> },
    { path: "res-reports/sales-report", element: <RestSalesDashboard /> },
    {
      path: "res-reports/upaad-report",
      element: <RestUpaadEntriesDashboard />,
    },
    { path: "res-reports/expenses-report", element: <RestExpensesDashboard /> },
    { path: "res-reports/bank-books", element: <BankBooksDashboard /> },
    {
      path: "res-reports/aapvana-report",
      element: <RestAapvanaDashboard />,
    },
    {
      path: "res-reports/levana-report",
      element: <RestLevanaDashboard />,
    },
    {
      path: "res-reports/aapvana-levana-balance",
      element: <AapvanaLevanaBalance />,
    },
    { path: "manage-staff", element: <RestStaffDashboard /> },
    { path: "categories-expenses", element: <RestCategoryExpensesDashboard /> },
    { path: "pending-users", element: <RestPendingUsersDashboard /> },
    { path: "office", element: <OfficeHome /> },
    { path: "office-book", element: <OfficeBookDashboard /> },
    { path: "office-category", element: <OfficeCategoryDashboard /> },
    { path: "staff-salary", element: <StaffSalaryDashboard /> },
    { path: "merged-graph", element: <OfficeMergedGraph /> },
    { path: "merged-reports", element: <OfficeMerged /> },
    { path: "merged-vendor-report", element: <OfficeCreditDebit /> },
    { path: "merged-vendor-graph", element: <VendorGraphDashboard /> },
    { path: "cashflow", element: <CashflowDashboard /> },
    { path: "gh-growth", element: <GhGrowthDashboard /> },
    { path: "kharch-control", element: <KharchControlDashboard /> },
    { path: "data-check", element: <DataAlerts onNavigate={router.navigate} /> },
    { path: "sales-goal/gh-sales-goal", element: <GHSalesGoalDashboard /> },
    { path: "sales-goal/rest-sales-goal", element: <RestSalesGoalDashboard /> },
    {
      path: "sales-goal/office-banquet-sales-goal",
      element: <OfficeBanquetSalesGoalDashboard />,
    },
    {
      path: "sales-goal/office-bakery-baada",
      element: <OfficeBakeryBaadaSalesGoalDashboard />,
    },
    {
      path: "sales-goal/office-moti-baada",
      element: <OfficeMotiBaadaSalesGoalDashboard />,
    },
    { path: "data-import", element: <DataImportDashboard /> },
    { path: "owner-report", element: <OwnerMonthlyDashboard /> },
    { path: "guest-dues", element: <GuestDuesReminders /> },
    { path: "staff-access", element: <StaffAccessDashboard /> },
    { path: "*", element: <Typography>404: Page Not Found</Typography> },
  ]);

  return (
    <AppProvider navigation={NAVIGATION} router={router} theme={dashboardTheme}>
      <DashboardLayout
        slots={{
          appTitle: () => <DashboardHeader onNavigate={router.navigate} />,
        }}
        sidebarExpandedWidth={260}
        navigation={NAVIGATION}
      >
        {routes}
      </DashboardLayout>
    </AppProvider>
  );
};

export default DashboardPage;
