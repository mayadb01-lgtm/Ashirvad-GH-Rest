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

// 36 purane items → 16. Purane reports tabs ke andar (TabbedPage). Purane links bhi chalte rahenge.
const NAVIGATION = [
  { segment: "home", title: "Aaj ka hisaab", icon: <TodayIcon /> },
  { segment: "owner-report", title: "Monthly Report", icon: <InsightsIcon /> },
  { segment: "guest-dues", title: "Guest Dues", icon: <WhatsAppIcon /> },
  { kind: "header", title: "Guest House" },
  { segment: "guest-house", title: "Overview", icon: <PieChartIcon /> },
  { segment: "gh-dashboard", title: "Ek din ka hisaab", icon: <LooksOneIcon /> },
  { segment: "gh-all-reports", title: "Reports", icon: <CurrencyRupeeIcon /> },
  { kind: "header", title: "Restaurant" },
  { segment: "restaurant", title: "Overview", icon: <PieChartIcon /> },
  { segment: "rest-all-reports", title: "Reports", icon: <PaymentsIcon /> },
  { segment: "rest-setup", title: "Staff & Setup", icon: <BadgeIcon /> },
  { kind: "header", title: "Office" },
  { segment: "office", title: "Overview", icon: <PieChartIcon /> },
  { segment: "office-all", title: "Office Book", icon: <BookOutlined /> },
  { kind: "header", title: "Sab ek saath" },
  { segment: "merged-all", title: "Merged Reports", icon: <StackedLineChartIcon /> },
  { segment: "sales-goals", title: "Sales Goals", icon: <BarChartIcon /> },
  { segment: "staff-salary", title: "Staff Salary", icon: <CreditScoreIcon /> },
  { kind: "header", title: "Settings" },
  { segment: "staff-access", title: "Staff Access", icon: <AdminPanelSettingsIcon /> },
  { segment: "data-import", title: "Import Excel", icon: <UploadFileIcon /> },
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
