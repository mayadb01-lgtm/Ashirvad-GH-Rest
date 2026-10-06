import axios from "axios";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { Provider } from "react-redux";
import Store from "./redux/store.js";

// 🔒 Har request ke saath login cookie bhejo (server ab bina login ke data nahi deta)
axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")).render(
  <Provider store={Store}>
    <App />
  </Provider>
);

// 📱 Phone pe "Add to Home screen" ke liye (sirf production build mein)
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
