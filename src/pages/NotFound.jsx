import { Stack, Typography, Paper, Button } from "@mui/material";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <Stack
      spacing={4}
      sx={{
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        bgcolor: "#f4f4f9",
        textAlign: "center",
      }}
    >
      <Typography variant="h2" color="error">
        404
      </Typography>

      <Typography variant="h5">
        Oops! The page you're looking for doesn't exist.
      </Typography>

      <Typography variant="body1" color="text.secondary">
        It might have been moved or deleted. Let’s get you back on track.
      </Typography>

      <Link to="/" style={{ textDecoration: "none" }}>
        <Paper
          elevation={4}
          sx={{
            p: 2,
            bgcolor: "#97c2ff",
            borderRadius: 3,
            transition: "transform 0.3s ease, box-shadow 0.3s ease",
            "&:hover": {
              transform: "translateY(-5px)",
              boxShadow: "0px 10px 30px rgba(0,0,0,0.1)",
            },
          }}
        >
          <Typography variant="h6">Go to Home Page</Typography>
        </Paper>
      </Link>
    </Stack>
  );
};

export default NotFound;
