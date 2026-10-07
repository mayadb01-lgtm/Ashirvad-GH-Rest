import mongoose from "mongoose";

// GH room ka har kaam ka footprint: check-in, badlaav, hataana (wajah ke saath), check-out.
// ⚠️ Naya collection ("ghactivitylogs"). Sirf likha jaata hai — app se kabhi delete nahi hota.
const ghLogSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // DD-MM-YYYY (room ka din)
    dateAt: { type: Date },
    period: { type: String, default: "day" },
    roomNo: { type: Number, required: true },
    action: { type: String, enum: ["checkin", "edit", "remove", "checkout", "undo-checkout"], required: true },
    guest: {
      fullname: { type: String, default: "" },
      mobileNumber: { type: String, default: "" },
      rate: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      noOfPeople: { type: Number, default: 0 },
      checkInTime: { type: String, default: "" },
      checkOutTime: { type: String, default: "" },
      modeOfPayment: { type: String, default: "" },
    },
    changes: [{ field: String, from: String, to: String, _id: false }],
    reason: { type: String, default: "" },
    stayStatus: { type: String, default: "" }, // hataate waqt stay active tha ya check-out ho chuka tha
    by: { type: String, default: "" },
    role: { type: String, default: "" },
  },
  { timestamps: true }
);
ghLogSchema.index({ dateAt: 1, action: 1 });

export default mongoose.model("GhLog", ghLogSchema, "ghactivitylogs");
