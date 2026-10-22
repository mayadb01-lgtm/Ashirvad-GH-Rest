// /rasoi → Manager (aur jise Super Admin ne diya) ke liye poore page par Rasoi Board
import { useEffect, useState } from "react";
import axios from "axios";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import RasoiBoard from "../components/rasoi/RasoiBoard";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

const RasoiPage = () => {
  const navigate = useNavigate();
  const [me, setMe] = useState(undefined);
  useEffect(() => {
    document.title = "Rasoi Board";
    let alive = true;
    axios
      .get(`${API}/quick/me`)
      .then(({ data }) => alive && setMe(data.me))
      .catch(() => alive && navigate("/login", { replace: true }));
    return () => {
      alive = false;
    };
  }, [navigate]);

  if (me === undefined) return null;
  const back = me.isOwnerAdmin ? "/dashboard" : "/entry";
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff" }}>
      <Paper elevation={0} square sx={{ borderBottom: "1px solid #E5E7EB", pt: "env(safe-area-inset-top)" }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, height: 48 }}>
          <Button component={RouterLink} to={back} startIcon={<ArrowBackIcon />} size="small" sx={{ textTransform: "none" }}>
            Back
          </Button>
          <Typography fontWeight={800} noWrap>
            Rasoi Board
          </Typography>
        </Stack>
      </Paper>
      {me.rasoi ? <RasoiBoard height="calc(100vh - 49px - env(safe-area-inset-top))" /> : <Alert severity="warning" sx={{ m: 2 }}>Rasoi Board is not allowed for you. Ask the Super Admin.</Alert>}
    </Box>
  );
};

export default RasoiPage;
