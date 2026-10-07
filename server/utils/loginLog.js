// Login log likho — kabhi bhi login ko rokna ya fail nahi karna (galti ho to bas console)
import LoginLog from "../model/loginLog.js";

const ipOf = (req) => String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim().replace(/^::ffff:/, "");

// User-agent se chhota naam: "Chrome · Windows", "Safari · iPhone"
const deviceOf = (req) => {
  const ua = String(req.headers["user-agent"] || "");
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : /Linux/.test(ua) ? "Linux" : "";
  const br = /Edg\//.test(ua) ? "Edge" : /OPR\//.test(ua) ? "Opera" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : ua ? "Other" : "";
  return [br, os].filter(Boolean).join(" · ").slice(0, 60);
};

export const logLogin = (req, { kind, event, user, email, note }) => {
  LoginLog.create({
    kind,
    event,
    userId: user?._id ? String(user._id) : "",
    name: String(user?.name || "").slice(0, 80),
    email: String(user?.email || email || "").trim().toLowerCase().slice(0, 120),
    ip: ipOf(req).slice(0, 60),
    device: deviceOf(req),
    note: String(note || "").slice(0, 200),
  }).catch((e) => console.log("Login log failed:", e.message));
};

export default logLogin;
