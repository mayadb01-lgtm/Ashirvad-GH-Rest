import { Router } from "express";
const router = Router();
import { isAuthenticated } from "../middleware/auth.js";
import sendAdminToken from "../utils/adminToken.js";
import process from "process";
import { runAutoBackup } from "../utils/autoBackup.js";
import Admin from "../model/admin.js";
import { otpOn, sendOtp, checkOtp, maskEmail } from "../utils/adminOtp.js";

// Sign Up Admin
router.post("/create-admin", async (req, res) => {
  // 🔒 Band: referral code se koi bhi naya admin bana sakta tha. Super Admin sirf ek (owner) — naya chahiye to server se.
  if (process.env.ALLOW_ADMIN_SIGNUP !== "yes") {
    return res.status(403).json({ success: false, message: "New admin accounts are closed. Ask the owner." });
  }
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
    const admin = await Admin.findOne({
      // email ke aage-peeche space ya Capital letter (phone keyboard) se login fail na ho
      email: new RegExp("^" + String(email).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i"),
    }).select("+password");

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

    // 🔐 Password sahi → email par OTP (email set ho tabhi)
    if (otpOn()) {
      try {
        const otpId = await sendOtp(admin, "login");
        return res.status(200).json({ success: true, otpRequired: true, otpId, sentTo: maskEmail(admin.email) });
      } catch (e) {
        console.log("OTP mail failed:", e.message);
        return res.status(500).json({ success: false, message: "Could not send the login code by email. Please try again." });
      }
    }
    sendAdminToken(admin, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// POST /admin/verify-otp { email, otpId, code } → login poora
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otpId, code } = req.body || {};
    const admin = await Admin.findOne({ email: new RegExp("^" + String(email || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") });
    if (!admin) return res.status(400).json({ success: false, message: "Code expired. Please start again." });
    const ok = await checkOtp(otpId, admin._id, "login", code);
    if (ok !== true) return res.status(400).json({ success: false, message: ok });
    sendAdminToken(admin, 200, res);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

// 🔐 Password reset: referral code wala tarika band (koi bhi admin ka password badal sakta tha).
// Ab: 1) /reset-password/request { email } → email par OTP   2) /reset-password { email, otpId, code, password }
const findAdmin = (email) => Admin.findOne({ email: new RegExp("^" + String(email || "").trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$", "i") });
router.post("/reset-password/request", async (req, res) => {
  try {
    if (!otpOn()) return res.status(400).json({ success: false, message: "Password reset by email is not set up yet. Ask the owner." });
    const admin = await findAdmin(req.body?.email);
    // Email galat ho tab bhi wahi jawab (koi email dhoondh na sake)
    const otpId = admin ? await sendOtp(admin, "reset") : "000000000000000000000000";
    res.json({ success: true, otpId, message: "If this email is an admin, a code has been sent to it." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Could not send the code. Please try again." });
  }
});
router.post("/reset-password", async (req, res) => {
  try {
    const { email, otpId, code, password } = req.body || {};
    if (!password || String(password).length < 8) return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    const admin = await findAdmin(email);
    if (!admin) return res.status(400).json({ success: false, message: "Code expired. Please start again." });
    const ok = await checkOtp(otpId, admin._id, "reset", code);
    if (ok !== true) return res.status(400).json({ success: false, message: ok });
    admin.password = password;
    await admin.save();
    res.json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/send-backup", isAuthenticated, async (req, res) => {
  // Ab ye bhi naya full backup use karta hai (saare collections, restore-ready)
  const log = await runAutoBackup("manual");
  if (log.ok) return res.status(200).json({ success: true, message: "Backup sent successfully" });
  return res.status(500).json({ success: false, message: log.error || "Backup failed" });
});

export default router;
