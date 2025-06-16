import { useRoutes, useNavigate, Navigate } from "react-router-dom";
import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { Button, createTheme, Stack, Typography } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CategoryIcon from "@mui/icons-material/Category";
import BadgeIcon from "@mui/icons-material/Badge";
// import RestaurantIcon from "@mui/icons-material/Restaurant";
// import HotelIcon from "@mui/icons-material/Hotel";
import BarChartIcon from "@mui/icons-material/BarChart";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import PaymentsIcon from "@mui/icons-material/Payments";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import { BookOutlined } from "@mui/icons-material";
import PieChartIcon from "@mui/icons-material/PieChart";
import HomeIcon from "@mui/icons-material/Home";
import LooksOneIcon from "@mui/icons-material/LooksOne";
import DateRangeIcon from "@mui/icons-material/DateRange";

// Components
import HomeDashboard from "../components/HomeDashboard";
import GHDashboard from "../components/guest-house/GHDashboard";
import GHSalesDashboard from "../components/guest-house/GHSalesDashboard";
import GHSalesDashboardRange from "../components/guest-house/GHDashboardRange";
import GHHome from "../components/guest-house/GHHome";
import RestHome from "../components/restaurant/RestHome";
import RestSalesDashboard from "../components/restaurant/RestSalesDashboard";
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

const DashboardHeader = ({ onNavigate }) => {
  const navigate = useNavigate();
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
      width="100%"
    >
      {/* Heading */}
      <Typography variant="h6" fontWeight="bold">
        TGT Admin Dashboard
      </Typography>

      {/* Buttons */}
      <Stack direction="row" spacing={2} alignItems="center">
        <Button
          variant="contained"
          onClick={() => onNavigate("home")}
          startIcon={<DashboardIcon />}
        >
          Dashboard Home
        </Button>
        <Button
          variant="contained"
          onClick={() => navigate("/")}
          endIcon={<HomeIcon />}
        >
          Entry Home
        </Button>
      </Stack>
    </Stack>
  );
};

const NAVIGATION = [
  {
    segment: "home",
    title: "Home",
    icon: <DashboardIcon />,
  },
  { kind: "header", title: "Guest House" },
  {
    segment: "guest-house",
    title: "GH - Graph",
    icon: <PieChartIcon />,
  },
  {
    segment: "gh-dashboard",
    title: "GH - One Day View",
    icon: <LooksOneIcon />,
  },
  {
    segment: "gh-dashboard-range",
    title: "GH - Date Range",
    icon: <DateRangeIcon />,
  },
  {
    segment: "gh-reports",
    title: "GH - Reports",
    icon: <BarChartIcon />,
    children: [
      {
        segment: "sales-report",
        title: "GH - Sales Report",
        icon: <CurrencyRupeeIcon />,
      },
      {
        segment: "bank-books",
        title: "GH - Bank Books",
        icon: <BookOutlined />,
      },
    ],
  },
  { kind: "header", title: "Restaurant" },
  { segment: "restaurant", title: "Rest - Graph", icon: <PieChartIcon /> },
  {
    segment: "res-reports",
    title: "Rest - Reports",
    icon: <BarChartIcon />,
    children: [
      {
        segment: "sales-report",
        title: "Rest - Sales Report",
        icon: <CurrencyRupeeIcon />,
      },
      {
        segment: "upaad-report",
        title: "Rest - Upaad Entries",
        icon: <PaymentsIcon />,
      },
      {
        segment: "expenses-report",
        title: "Rest - Expenses",
        icon: <CreditScoreIcon />,
      },
      {
        segment: "bank-books",
        title: "Rest - Bank Books",
        icon: <BookOutlined />,
      },
    ],
  },
  {
    segment: "manage-staff",
    title: "Rest - Manage Staff",
    icon: <BadgeIcon />,
  },
  {
    segment: "categories-expenses",
    title: "Categories & Expenses",
    icon: <CategoryIcon />,
  },
  {
    segment: "pending-users",
    title: "Rest - Pending Users",
    icon: <BadgeIcon />,
  },
  { kind: "header", title: "Office Book" },
  { segment: "office-book", title: "Office Book", icon: <LooksOneIcon /> },
  {
    segment: "office-category",
    title: "Office Category",
    icon: <CategoryIcon />,
  },
  { kind: "header", title: "Reports" },
  {
    segment: "merged-reports",
    title: "Merged Reports",
    icon: <BarChartIcon />,
  },
];

// Theme setup
const demoTheme = createTheme({
  cssVariables: {
    colorSchemeSelector: "data-toolpad-color-scheme",
  },
  colorSchemes: { light: true },
  breakpoints: { values: { xs: 0, sm: 600, md: 960, lg: 1200, xl: 1536 } },
});

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
    {
      path: "home",
      element: (
        <HomeDashboard navigation={NAVIGATION} onNavigate={router.navigate} />
      ),
    },
    { path: "gh-dashboard", element: <GHDashboard /> },
    { path: "gh-dashboard-range", element: <GHSalesDashboardRange /> },
    { path: "guest-house", element: <GHHome /> },
    { path: "gh-reports/sales-report", element: <GHSalesDashboard /> },
    { path: "gh-reports/bank-books", element: <GHBankBooksDashboard /> },
    { path: "restaurant", element: <RestHome /> },
    { path: "res-reports/sales-report", element: <RestSalesDashboard /> },
    {
      path: "res-reports/upaad-report",
      element: <RestUpaadEntriesDashboard />,
    },
    { path: "res-reports/expenses-report", element: <RestExpensesDashboard /> },
    { path: "res-reports/bank-books", element: <BankBooksDashboard /> },
    { path: "manage-staff", element: <RestStaffDashboard /> },
    { path: "categories-expenses", element: <RestCategoryExpensesDashboard /> },
    { path: "pending-users", element: <RestPendingUsersDashboard /> },
    { path: "office-book", element: <OfficeBookDashboard /> },
    { path: "office-category", element: <OfficeCategoryDashboard /> },
    { path: "merged-reports", element: <OfficeMerged /> },
    { path: "*", element: <Typography>404: Page Not Found</Typography> },
  ]);

  return (
    <AppProvider navigation={NAVIGATION} router={router} theme={demoTheme}>
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
