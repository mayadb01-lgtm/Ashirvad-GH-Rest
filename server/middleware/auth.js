import jwt from "jsonwebtoken";
import User from "../model/user.js";
import Admin from "../model/admin.js";
import process from "process";

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
      res.clearCookie("token");
      res.clearCookie("admin_token");
      return res.status(401).json({
        success: false,
        message: "Due to inactivity, please login again",
      });
    }

    if (admin_token && !token) {
      const decoded = jwt.verify(admin_token, process.env.JWT_SECRET_KEY);
      req.user = await Admin.findById(decoded.id);
      return next();
    } else if (!admin_token && token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);
      req.user = await User.findById(decoded.id);
      next();
    }
  } catch (error) {
    console.log(error);
    return res.status(401).json({
      success: false,
      message: "Please login as user or admin",
    });
  }
};

export default {
  isAuthenticated,
};
