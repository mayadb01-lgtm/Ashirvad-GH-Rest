import { useRoutes, useNavigate, Navigate } from "react-router-dom";
import { AppProvider } from "@toolpad/core/AppProvider";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import { Button, createTheme, Stack, Typography } from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import CategoryIcon from "@mui/icons-material/Category";
import BadgeIcon from "@mui/icons-material/Badge";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import HotelIcon from "@mui/icons-material/Hotel";
import BarChartIcon from "@mui/icons-material/BarChart";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import PaymentsIcon from "@mui/icons-material/Payments";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import { BookOutlined } from "@mui/icons-material";
import HomeIcon from "@mui/icons-material/Home";

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

const DashboardHeader = ({ onNavigate }) => {
  return (
    <Stack
      direction="row"
      spacing={2}
      alignItems="center"
      justifyContent="space-between"
    >
      <Typography variant="h6" fontWeight="bold">
        TGT Admin Dashboard
      </Typography>
      <Button variant="contained" onClick={() => onNavigate("home")}>
        <HomeIcon /> Home
      </Button>
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
  { segment: "guest-house", title: "Guest House", icon: <HotelIcon /> },
  { segment: "gh-dashboard", title: "GH-Dashboard", icon: <HotelIcon /> },
  {
    segment: "gh-dashboard-range",
    title: "GH-Dashboard-Range",
    icon: <HotelIcon />,
  },
  {
    segment: "gh-reports",
    title: "Reports",
    icon: <BarChartIcon />,
    children: [
      {
        segment: "sales-report",
        title: "Sales Report",
        icon: <CurrencyRupeeIcon />,
      },
    ],
  },
  { kind: "header", title: "Restaurant" },
  { segment: "restaurant", title: "Restaurant", icon: <HotelIcon /> },
  {
    segment: "res-dashboard",
    title: "Res-Dashboard",
    icon: <RestaurantIcon />,
  },
  {
    segment: "res-reports",
    title: "Reports",
    icon: <BarChartIcon />,
    children: [
      {
        segment: "sales-report",
        title: "Sales Report",
        icon: <CurrencyRupeeIcon />,
      },
      {
        segment: "upaad-report",
        title: "Upaad Report",
        icon: <PaymentsIcon />,
      },
      {
        segment: "expenses-report",
        title: "Expenses Report",
        icon: <CreditScoreIcon />,
      },
      { segment: "bank-books", title: "Bank Books", icon: <BookOutlined /> },
    ],
  },
  { segment: "manage-staff", title: "Manage Staff", icon: <BadgeIcon /> },
  {
    segment: "categories-expenses",
    title: "Categories & Expenses",
    icon: <CategoryIcon />,
  },
  { segment: "pending-users", title: "Pending Users", icon: <BadgeIcon /> },
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
    { path: "restaurant", element: <RestHome /> },
    {
      path: "res-dashboard",
      element: <Typography>Restaurant Dashboard</Typography>,
    },
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
