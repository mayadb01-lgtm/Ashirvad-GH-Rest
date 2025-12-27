import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActionArea,
  useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Link, useNavigate } from "react-router-dom";
import { useAppSelector } from "../redux/hooks";
import toast from "react-hot-toast";
import ApartmentIcon from "@mui/icons-material/Apartment";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import MenuBookOutlinedIcon from "@mui/icons-material/MenuBookOutlined";
import { BookOutlined } from "@mui/icons-material";

const Home = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { isAdminAuthenticated, admin } = useAppSelector(
    (state) => state.admin
  );
  const { isAuthenticated, user } = useAppSelector((state) => state.user);

  const username = isAdminAuthenticated ? admin?.name : user?.name;

  const services = [
    {
      path: isAdminAuthenticated ? "/admin/hotel" : "/hotel",
      title: "G H",
      icon: <ApartmentIcon fontSize="large" />,
      color: "#FFB74D",
    },
    {
      path: isAdminAuthenticated ? "/admin/restaurant" : "/restaurant",
      title: "R",
      icon: <RestaurantMenuIcon fontSize="large" />,
      color: "#FF8A80",
    },
    {
      path: isAdminAuthenticated ? "/admin/office" : "/office",
      title: "O B",
      icon: <MenuBookOutlinedIcon fontSize="large" />,
      color: "#80CBC4",
    },
  ];

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: theme.palette.background.default,
        p: { xs: 2, sm: 4, md: 6 },
      }}
    >
      <Box mb={4} textAlign="center">
        {username ? (
          <>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Welcome, {username}!
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {import.meta.env.VITE_REACT_APP_BUSINESS_NAME} Management System.
            </Typography>
          </>
        ) : (
          <>
            <Typography variant="h4" fontWeight={600} gutterBottom>
              Welcome to {import.meta.env.VITE_REACT_APP_BUSINESS_NAME}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Please log in to continue.
            </Typography>
          </>
        )}
      </Box>

      <Grid container spacing={3} justifyContent="center" alignItems="center">
        {services.map((service, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card
              elevation={3}
              sx={{
                bgcolor: service.color,
                borderRadius: 3,
                transition: "transform 0.3s ease",
                "&:hover": { transform: "scale(1.03)", boxShadow: 6 },
              }}
            >
              <CardActionArea
                component={Link}
                to={service.path}
                onClick={() => {
                  if (isAdminAuthenticated || isAuthenticated) {
                    toast.promise(new Promise((res) => setTimeout(res, 500)), {
                      loading: "Redirecting...",
                      success: `Welcome to ${service.title}!`,
                      error: `Error accessing ${service.title}.`,
                    });
                  } else {
                    toast.error("Please log in to access this service.");
                    navigate("/login");
                  }
                }}
              >
                <CardContent
                  sx={{
                    textAlign: "center",
                    p: 4,
                    color: theme.palette.getContrastText(service.color),
                  }}
                >
                  <Typography
                    variant="h6"
                    fontWeight={500}
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: "bold",
                    }}
                  >
                    {service.title}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default Home;
