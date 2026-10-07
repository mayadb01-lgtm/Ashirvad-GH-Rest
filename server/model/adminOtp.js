import mongoose from "mongoose";

// 🔐 Super Admin OTP (login / password reset) — naya collection, 10 minute mein apne aap mit jaata hai
const schema = new mongoose.Schema(
  {
    adminId: { type: String, required: true },
    purpose: { type: String, enum: ["login", "reset"], required: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    tries: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model("AdminOtp", schema, "adminotps");
