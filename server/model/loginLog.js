import mongoose from "mongoose";

// 🔐 Login log (naya collection): kaun, kab, kahan se login / logout / galat password. 400 din baad apne aap mit jaata hai.
const schema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    kind: { type: String, enum: ["admin", "staff"], required: true },
    event: { type: String, required: true }, // login | failed | otp_sent | otp_failed | logout | disabled | reset
    userId: { type: String, default: "" },
    name: { type: String, default: "" },
    email: { type: String, default: "" },
    ip: { type: String, default: "" },
    device: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { versionKey: false }
);
schema.index({ at: -1 });
schema.index({ at: 1 }, { expireAfterSeconds: 400 * 24 * 3600 });
export default mongoose.model("LoginLog", schema, "loginlogs");
