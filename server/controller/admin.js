import { Router } from "express";
const router = Router();
import Admin from "../model/admin.js";
import { isAuthenticated } from "../middleware/auth.js";
import sendAdminToken from "../utils/adminToken.js";
import process from "process";

// Sign Up Admin
router.post("/create-admin", async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;

    if (!referralCode) {
      return res.status(400).json({
        success: false,
        message: "Please enter referral code",
      });
    }

    if (referralCode !== process.env.REFERRAL_CODE) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code",
      });
    }

    // Check if the admin already exists
    const adminEmail = await Admin.findOne({ email: email });
    if (adminEmail) {
      return res.status(400).json({
        success: false,
        message: "Admin already exists with this email",
      });
    }

    // Create the admin directly
    const admin = await Admin.create({
      name: name,
      email: email,
      password: password,
    });

    // Send success response with token
    sendAdminToken(admin, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Login Admin
router.post("/login-admin", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the admin exists
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter email and password",
      });
    }

    // Find the admin
    const admin = await Admin.findOne({ email }).select("+password");

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if the password is correct
    const isPasswordMatch = await admin.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Send success response with token
    sendAdminToken(admin, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Load Admin
router.get("/getadmin", isAuthenticated, async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin Login - Failed",
      });
    }
    res.status(200).json({
      success: true,
      admin,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Logout Admin
router.get("/logout-admin", isAuthenticated, async (req, res) => {
  try {
    res.cookie("admin_token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({
      success: true,
      message: "Admin Logged out",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, password, referralCode } = req.body;

    // Check if the admin exists
    const admin = await Admin.findOne({ email });

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Check if the referral code is correct
    if (referralCode !== process.env.REFERRAL_CODE) {
      return res.status(400).json({
        success: false,
        message: "Invalid referral code",
      });
    }

    // Update the password
    admin.password = password;
    await admin.save();

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
