import { Router } from "express";
const router = Router();
import sendToken from "../utils/jwtToken.js";
import User from "../model/user.js";
import { isAuthenticated } from "../middleware/auth.js";
import process from "process";

// Sign Up User
router.post("/create-user", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    console.log(req.body);

    // Check if the user already exists
    const userEmail = await User.findOne({ email: email });
    if (userEmail) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create the user directly
    const user = await User.create({
      name: name,
      email: email,
      password: password,
    });

    // Send success response with token
    sendToken(user, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Login User
router.post("/login-user", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if the user exists
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please enter email and password",
      });
    }

    // Find the user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if the password is correct
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(404).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Send success response with token
    sendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Load User
router.get("/getuser", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Logout User
router.get("/logout-user", async (req, res) => {
  try {
    res.cookie("token", null, {
      expires: new Date(Date.now()),
      httpOnly: true,
      sameSite: "none",
      secure: true,
    });
    res.status(200).json({
      success: true,
      message: "Logged out",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Reset Password - Using one Referral Code Directly - POST
router.post("/reset-password", async (req, res) => {
  try {
    const { email, password, referralCode } = req.body;

    // Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
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
    user.password = password;
    await user.save();

    // Send success response with token
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
