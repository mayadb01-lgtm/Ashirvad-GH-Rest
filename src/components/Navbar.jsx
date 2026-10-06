import { Link, useLocation } from "react-router-dom";
import {
  AppBar,
  Toolbar,
  Button,
  Typography,
  Stack,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { Menu as MenuIcon } from "@mui/icons-material";
import { useState } from "react";
import { useAppDispatch, useAppSelector } from "../redux/hooks";
import { logoutUser } from "../redux/actions/userAction";
import { logoutAdmin } from "../redux/actions/adminAction";
import { ThemeSwitcher } from "@toolpad/core";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdminAuthenticated, admin } = useAppSelector(
    (state) => state.admin
  );
  const { isAuthenticated, user } = useAppSelector((state) => state.user);
  const isSuperUserOrAdmin = admin?.isSuperAdmin || user?.isSuperUser || false;
  const dispatch = useAppDispatch();
  const location = useLocation();

  const handleLogout = () => {
    if (isAuthenticated) dispatch(logoutUser());
    if (isAdminAuthenticated) dispatch(logoutAdmin());
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const navLinks =
    isAuthenticated || isAdminAuthenticated ? (
      <>
        {isAdminAuthenticated && isSuperUserOrAdmin && (
          <Button color="inherit" component={Link} to="/dashboard">
            Dashboard
          </Button>
        )}
        <Button color="inherit" component={Link} to="/" onClick={handleLogout}>
          Logout
        </Button>
      </>
    ) : (
      <>
        <Button color="inherit" component={Link} to="/signup">
          Signup
        </Button>
        <Button color="inherit" component={Link} to="/login">
          Login
        </Button>
        <Button color="inherit" component={Link} to="/admin-login">
          Admin Login
        </Button>
        <Button color="inherit" component={Link} to="/admin-signup">
          Admin Signup
        </Button>
      </>
    );

  const drawerLinks =
    isAuthenticated || isAdminAuthenticated ? (
      <>
        {isAdminAuthenticated && (
          <ListItem button component={Link} to="/dashboard">
            <ListItemText primary="Dashboard" />
          </ListItem>
        )}
        <ListItem button component={Link} to="/" onClick={handleLogout}>
          <ListItemText primary="Logout" />
        </ListItem>
      </>
    ) : (
      <>
        <ListItem button component={Link} to="/signup">
          <ListItemText primary="Signup" />
        </ListItem>
        <ListItem button component={Link} to="/login">
          <ListItemText primary="Login" />
        </ListItem>
        <ListItem button component={Link} to="/admin-login">
          <ListItemText primary="Admin Login" />
        </ListItem>
        <ListItem button component={Link} to="/admin-signup">
          <ListItemText primary="Admin Signup" />
        </ListItem>
      </>
    );

  const navbarHeading = () => {
    switch (location.pathname) {
      case "/admin/restaurant":
        return `${import.meta.env.VITE_REACT_APP_BUSINESS_NAME} Restaurant - Admin`;
      case "/restaurant":
        return `${import.meta.env.VITE_REACT_APP_BUSINESS_NAME} Restaurant`;
      case "/admin/hotel":
        return `${import.meta.env.VITE_REACT_APP_BUSINESS_NAME} Hotel - Admin`;
      case "/hotel":
        return `${import.meta.env.VITE_REACT_APP_BUSINESS_NAME} Hotel`;
      default:
        return `${import.meta.env.VITE_REACT_APP_BUSINESS_NAME}`;
    }
  };

  return (
    <AppBar
      position="static"
      sx={{
        backgroundColor: "#5f7174",
        height: 40,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Toolbar
        sx={{
          justifyContent: "space-between",
        }}
      >
        <Typography variant="h6" component="div">
          <Link
            to={"/"}
            style={{ color: "white", textDecoration: "none", fontWeight: 600 }}
          >
            {navbarHeading()}
          </Link>
        </Typography>
        <Stack
          direction="row"
          sx={{
            display: { xs: "none", md: "flex" },
          }}
        >
          {navLinks}
          <ThemeSwitcher />
        </Stack>
        <IconButton
          color="inherit"
          edge="start"
          sx={{
            display: { xs: "flex", md: "none" },
          }}
          onClick={handleDrawerToggle}
        >
          <MenuIcon />
        </IconButton>
      </Toolbar>
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        sx={{
          "& .MuiDrawer-paper": {
            width: 250,
          },
        }}
      >
        <List>{drawerLinks}</List>
      </Drawer>
    </AppBar>
  );
};

export default Navbar;
