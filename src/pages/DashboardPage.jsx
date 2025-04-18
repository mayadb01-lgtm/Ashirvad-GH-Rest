import { useEffect, useState, useMemo } from "react";
import { AppProvider } from "@toolpad/core/AppProvider";
import DashboardIcon from "@mui/icons-material/Dashboard";
import { createTheme } from "@mui/material/styles";
import { Typography } from "@mui/material";
import { DashboardLayout } from "@toolpad/core/DashboardLayout";
import dayjs from "dayjs";
import RestStaffDashboard from "../components/restaurant/RestStaffDashboard";
import HomeDashboard from "../components/HomeDashboard";
import GHDashboard from "../components/guest-house/GHDashboard";
import RestCategoryExpensesDashboard from "../components/restaurant/RestCategoryExpensesDashboard";
import CategoryIcon from "@mui/icons-material/Category";
import BadgeIcon from "@mui/icons-material/Badge";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import HotelIcon from "@mui/icons-material/Hotel";
import BarChartIcon from "@mui/icons-material/BarChart";
import CurrencyRupeeIcon from "@mui/icons-material/CurrencyRupee";
import GHSalesDashboard from "../components/guest-house/GHSalesDashboard";
import RestSalesDashboard from "../components/restaurant/RestSalesDashboard";
import RestUpaadEntriesDashboard from "../components/restaurant/RestUpaadEntriesDashboard";
import PaymentsIcon from "@mui/icons-material/Payments";
import CreditScoreIcon from "@mui/icons-material/CreditScore";
import RestExpensesDashboard from "../components/restaurant/RestExpensesDashboard";
import { BookOutlined } from "@mui/icons-material";
import BankBooksDashboard from "../components/restaurant/RestBankBookEntry";
import RestPendingUsersDashboard from "../components/restaurant/RestPendingUsersDashboard";
import GHSalesDashboardRange from "../components/guest-house/GHDashboardRange";
import GHHome from "../components/guest-house/GHHome";
dayjs.locale("en-gb");

const NAVIGATION = [
  {
    segment: "home",
    title: "Home",
    icon: <DashboardIcon />,
  },
  { kind: "header", title: "Guest House" },
  { segment: "guest-house", title: "Guest House", icon: <HotelIcon /> },
  {
    segment: "gh-dashboard",
    title: "GH-Dashboard",
    icon: <HotelIcon />,
  },
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
      {
        segment: "bank-books",
        title: "Bank Books",
        icon: <BookOutlined />,
      },
    ],
  },
  { segment: "manage-staff", title: "Manage Staff", icon: <BadgeIcon /> },
  {
    segment: "categories-expenses",
    title: "Categories & Expenses",
    icon: <CategoryIcon />,
  },
  {
    segment: "pending-users",
    title: "Pending Users",
    icon: <BadgeIcon />,
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
  const [pathname, setPathname] = useState("/dashboard");
  const [segments, setSegments] = useState([]);

  const router = useMemo(() => {
    return {
      pathname,
      searchParams: new URLSearchParams(),
      navigate: (path) => {
        setPathname(path);
        setSegments(path.replace("/dashboard", "").split("/").filter(Boolean));
      },
    };
  }, [pathname]);

  useEffect(() => {
    setSegments(pathname.replace("/dashboard", "").split("/").filter(Boolean));
  }, [pathname]);

  const renderPageContent = () => {
    if (segments.length === 0) return <HomeDashboard />;

    switch (segments[0]) {
      case "gh-dashboard":
        return <GHDashboard />;
      case "guest-house":
        return <GHHome />;
      case "gh-dashboard-range":
        return <GHSalesDashboardRange />;
      case "gh-reports":
        if (segments[1] === "sales-report") {
          return <GHSalesDashboard />;
        }
        return <Typography>Reports Overview</Typography>;
      case "res-reports":
        if (segments[1] === "sales-report") {
          return <RestSalesDashboard />;
        }
        if (segments[1] === "upaad-report") {
          return <RestUpaadEntriesDashboard />;
        }
        if (segments[1] === "expenses-report") {
          return <RestExpensesDashboard />;
        }
        if (segments[1] === "bank-books") {
          return <BankBooksDashboard />;
        }
        return <Typography>Reports Overview</Typography>;
      case "res-dashboard":
        return <Typography>Restaurant Dashboard</Typography>;
      case "manage-staff":
        return <RestStaffDashboard />;
      case "categories-expenses":
        return <RestCategoryExpensesDashboard />;
      case "pending-users":
        return <RestPendingUsersDashboard />;
      default:
        return <HomeDashboard />;
    }
  };

  return (
    <AppProvider navigation={NAVIGATION} router={router} theme={demoTheme}>
      <DashboardLayout
        // defaultSidebarCollapsed
        slots={{
          appTitle: () => (
            <Typography variant="h6">TGT Admin Dashboard</Typography>
          ),
        }}
        sidebarExpandedWidth={260}
        navigation={NAVIGATION}
      >
        {renderPageContent()}
      </DashboardLayout>
    </AppProvider>
  );
};

export default DashboardPage;
