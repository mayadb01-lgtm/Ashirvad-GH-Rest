import mongoose from "mongoose";

// Har backup ka record: kab hua, kaise hua, safal hua ya nahi.
const backupLogSchema = new mongoose.Schema(
  {
    trigger: { type: String, enum: ["schedule", "external", "manual"], required: true },
    ok: { type: Boolean, required: true },
    collections: { type: Object, default: {} }, // { entries: 1200, ... }
    sizeKB: { type: Number, default: 0 },
    emailedTo: { type: String, default: "" },
    error: { type: String, default: "" },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.model("BackupLog", backupLogSchema);
