// 🍳 Rasoi Board: kitchen ka board (aaj ki taiyari, team ke kaam, order, recipe, rates).
// Board ka page server se login ke baad aata hai (recipes / rates public file mein nahi).
// Board apna data naye kitchen_* collections mein rakhta hai; app ka roz ka sale sirf padhta hai.
import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Alert, Box, CircularProgress } from "@mui/material";

const API = import.meta.env.VITE_REACT_APP_SERVER_URL;

const RasoiBoard = ({ height = "calc(100vh - 64px)" }) => {
  const [html, setHtml] = useState(null);
  const [err, setErr] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    let alive = true;
    axios
      .get(`${API}/rasoi/board`, { responseType: "text", transformResponse: (x) => x })
      .then(({ data }) => alive && setHtml(String(data)))
      .catch((e) => {
        if (!alive) return;
        const s = e?.response?.status;
        setErr(s === 401 ? "Please log in again." : s === 403 ? "Manager is not allowed for you. Ask the Super Admin." : "Could not open Manager. Check the internet and try again.");
      });
    return () => {
      alive = false;
    };
  }, []);

  const onLoad = () => {
    try {
      const w = ref.current?.contentWindow;
      if (w && typeof w.rasoiBoot === "function") w.rasoiBoot(API);
    } catch {
      setErr("Could not start Manager.");
    }
  };

  if (err) return <Alert severity="warning" sx={{ m: 2 }}>{err}</Alert>;
  if (html == null)
    return (
      <Box sx={{ display: "grid", placeItems: "center", height: 240 }}>
        <CircularProgress />
      </Box>
    );
  return (
    <Box
      component="iframe"
      ref={ref}
      title="Manager"
      srcDoc={html}
      onLoad={onLoad}
      sx={{ border: 0, width: "100%", height, display: "block", bgcolor: "#fff" }}
    />
  );
};

export default RasoiBoard;
