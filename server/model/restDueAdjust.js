import mongoose from "mongoose";

// Restaurant udhaar ka hisaab-sudhaar (sirf owner): purana baaki (app se pehle ka) ya maafi / bahar settle.
// ⚠️ Naya collection ("restdueadjusts"). Yeh PAISA nahi hai — sirf "kiska kitna baaki" sudharta hai, reports (cash / balance) mein nahi ginta.
const schema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // DD-MM-YYYY
    name: { type: String, required: true },
    nameKey: { type: String, required: true },
    kind: { type: String, enum: ["opening", "writeoff"], required: true }, // opening = purana baaki jodo, writeoff = baaki ghatao
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, default: "" },
    enteredBy: { type: String, default: "" },
    cancelled: { type: Boolean, default: false },
    cancelledBy: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);
schema.index({ nameKey: 1 });
export default mongoose.model("RestDueAdjust", schema, "restdueadjusts");
