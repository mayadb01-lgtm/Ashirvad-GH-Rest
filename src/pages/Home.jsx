import { Stack, Typography, Paper } from "@mui/material";
import toast from "react-hot-toast";
import { useAppSelector } from "../redux/hooks";
import { Link, useNavigate } from "react-router-dom";

const Home = () => {
  const navigate = useNavigate();
  const { isAdminAuthenticated, admin } = useAppSelector(
    (state) => state.admin
  );
  const { isAuthenticated, user } = useAppSelector((state) => state.user);

  const services = [
    {
      path: isAdminAuthenticated ? "/admin/hotel" : "/hotel",
      title: "Guest House",
      bg: "#fec86a",
    },
    {
      path: isAdminAuthenticated ? "/admin/restaurant" : "/restaurant",
      title: "Restaurant",
      bg: "#ff6a6a",
    },
    {
      path: isAdminAuthenticated ? "/admin/office" : "/office",
      title: "Office Book",
      bg: "#97c2ff", // a pleasant blue shade
    },
  ];

  return (
    <Stack
      spacing={4}
      sx={{
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "#f4f4f9",
      }}
    >
      {(isAdminAuthenticated && admin?.name) ||
      (isAuthenticated && user?.name) ? (
        <>
          <Typography variant="h5">
            Welcome, {isAdminAuthenticated ? admin?.name : user?.name}!
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Glad to have you back in the{" "}
            {import.meta.env.VITE_REACT_APP_BUSINESS_NAME} Business Management
            System.
          </Typography>
        </>
      ) : (
        <>
          <Typography variant="h5">
            Welcome to the {import.meta.env.VITE_REACT_APP_BUSINESS_NAME}{" "}
            Business Management System
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Please log in to continue.
          </Typography>
        </>
      )}

      {/* Service Cards */}
      {services.map((service, index) => (
        <Link
          key={index}
          to={service.path}
          style={{
            textDecoration: "none",
            color: "inherit",
            width: "90%",
            maxWidth: "600px",
            textAlign: "center",
          }}
          onClick={() => {
            if (isAdminAuthenticated || isAuthenticated) {
              toast.promise(
                new Promise((resolve) => setTimeout(resolve, 500)),
                {
                  loading: "Redirecting...",
                  success: `Welcome to the ${service.title} page!`,
                  error: `Error accessing the ${service.title} page.`,
                }
              );
            } else {
              toast.error("Please login to access the services.");
              navigate("/login");
            }
          }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 4,
              width: "90%",
              maxWidth: "600px",
              borderRadius: 4,
              bgcolor: service.bg,
              transition: "transform 0.3s ease, box-shadow 0.3s ease",
              "&:hover": {
                transform: "translateY(-5px)",
                boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
              },
            }}
          >
            <Typography variant="h4" gutterBottom>
              {service.title}
            </Typography>
          </Paper>
        </Link>
      ))}
    </Stack>
  );
};

export default Home;
