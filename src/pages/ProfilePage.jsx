import { Box, Typography, Button } from "@mui/material";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const user = JSON.parse(localStorage.getItem("currentUser"));

  const handleLogout = () => {
    localStorage.removeItem("currentUser");
    toast.success("Logged out successfully!");
  };

  if (!user) {
    return <Typography variant="h5">You are not logged in!</Typography>;
  }

  return (
    <Box p={4} maxWidth={400} mx="auto">
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Typography variant="h6">Username: {user.username}</Typography>
      <Typography variant="h6">Email: {user.email}</Typography>
      <Button
        variant="contained"
        color="secondary"
        fullWidth
        onClick={handleLogout}
      >
        Logout
      </Button>
    </Box>
  );
};

export default ProfilePage;
