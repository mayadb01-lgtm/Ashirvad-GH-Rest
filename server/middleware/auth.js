import jwt from "jsonwebtoken";
import User from "../model/user.js";
import Admin from "../model/admin.js";
import process from "process";

// Cookie hatane ke liye wahi options chahiye jo set karte waqt the (cross-site: sameSite none + secure),
// warna browser purana cookie nahi hatata.
const COOKIE_OPTS = { httpOnly: true, sameSite: "none", secure: true };
const clearAuthCookies = (res) => {
  res.clearCookie("token", COOKIE_OPTS);
  res.clearCookie("admin_token", COOKIE_OPTS);
};

export const isAuthenticated = async (req, res, next) => {
  try {
    const { token } = req.cookies;
    const { admin_token } = req.cookies;

    if (!admin_token && !token) {
      return res.status(401).json({
        success: false,
        message: "Please login as user or admin",
      });
    }

    if (admin_token && token) {
      clearAuthCookies(res);
      return res.status(401).json({
        success: false,
        message: "Due to inactivity, please login again",
      });
    }

    if (admin_token && !token) {
      const decoded = jwt.verify(admin_token, process.env.JWT_SECRET_KEY);
      req.user = await Admin.findById(decoded.id);
      if (!req.user) {
        res.clearCookie("admin_token", COOKIE_OPTS);
        return res.status(401).json({ success: false, message: "Account not found. Please login again." });
      }
      return next();
    } else if (!admin_token && token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = await User.findById(decoded.id);
      if (!req.user) {
        res.clearCookie("token", COOKIE_OPTS);
        return res.status(401).json({ success: false, message: "Account not found. Please login again." });
      }
      return next();
    }
  } catch (error) {
    // Purana / kharab login cookie (jaise secret badalne ke baad): hata do taaki dobara login ho sake
    console.log("Auth cookie invalid:", error.message);
    clearAuthCookies(res);
    return res.status(401).json({
      success: false,
      message: "Session khatam ho gaya, please dobara login karo",
    });
  }
};

export default {
  isAuthenticated,
};
