// 404 — saadha, bina naam ka page. Anjaan aadmi ko bas yahi dikhta hai.
// 🔑 Chhupa darwaza: "404" par 3 second ke andar 5 baar click / tap → login page (us device par yaad rehta hai)
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { unlockLogin } from "../utils/gate";

const NotFound = () => {
  const navigate = useNavigate();
  const taps = useRef([]);

  useEffect(() => {
    document.title = "404 Not Found";
  }, []);

  const tap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < 3000), now];
    if (taps.current.length >= 5) {
      taps.current = [];
      unlockLogin();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff",
        color: "#000",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <h1
          onClick={tap}
          style={{
            margin: "0 20px 0 0",
            padding: "0 23px 0 0",
            fontSize: 24,
            fontWeight: 500,
            borderRight: "1px solid rgba(0,0,0,.3)",
            lineHeight: "49px",
            userSelect: "none",
            WebkitTapHighlightColor: "transparent",
            cursor: "default",
          }}
        >
          404
        </h1>
        <h2 style={{ fontSize: 14, fontWeight: 400, lineHeight: "49px", margin: 0 }}>This page could not be found.</h2>
      </div>
    </div>
  );
};

export default NotFound;
