// /manager → "Manager" (kitchen board): sirf jise access hai (Manager apne aap, baaki ko Super Admin tick kare)
import { useEffect, useState } from "react";
import axios from "axios";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";
import RasoiBoard from "../components/rasoi/RasoiBoard";
import { useAppSelector } from "../redux/hooks/index.js";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

const RasoiPage = () => {
  const navigate = useNavigate();
  const { admin } = useAppSelector((state) => state.admin);
  const { user } = useAppSelector((state) => state.user);
  const canDash = admin?.isSuperAdmin || admin?.viewOnly === true || user?.isSuperUser || false;
  const [me, setMe] = useState(undefined);
  useEffect(() => {
    document.title = "Manager";
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
  // Home = owner dashboard ka home page (jise dashboard milta hai), warna app ka main page
  const back = canDash ? "/dashboard/home" : me.isAdmin ? "/" : "/entry";
  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#fff" }}>
      <Paper elevation={0} square sx={{ borderBottom: "1px solid #E5E7EB", pt: "env(safe-area-inset-top)" }}>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1, height: 48 }}>
          <Button component={RouterLink} to={back} startIcon={<HomeIcon />} variant="outlined" size="small" sx={{ textTransform: "none", fontWeight: 700, borderRadius: 999 }}>
            Home
          </Button>
          <Typography fontWeight={800} noWrap>
            Manager
          </Typography>
        </Stack>
      </Paper>
      {me.rasoi ? <RasoiBoard onHome={() => navigate(back)} height="calc(100vh - 49px - env(safe-area-inset-top))" /> : <Alert severity="warning" sx={{ m: 2 }}>Manager is not allowed for you. Ask the Super Admin.</Alert>}
    </Box>
  );
};

export default RasoiPage;
