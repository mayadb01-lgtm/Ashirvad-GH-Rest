import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
dayjs.extend(customParseFormat);

// Counter (Restaurant / GH) ka cash Office ko diya — sirf haath badalna (TRANSFER), kamai nahi.
// ⚠️ Naya collection ("cashhandovers"). Office mein ise "Money in" mein dobara nahi likhna.
const schema = new mongoose.Schema(
  {
    date: { type: String, required: true },
    entryCreateDate: { type: Date },
    from: { type: String, enum: ["rest", "gh"], required: true },
    amount: { type: Number, required: true, min: 1 },
    note: { type: String, default: "" },
    enteredBy: { type: String, default: "" },
    cancelled: { type: Boolean, default: false },
    cancelledBy: { type: String, default: "" },
    cancelledAt: { type: Date },
  },
  { timestamps: true, versionKey: false }
);
schema.pre("validate", function (next) {
  const d = dayjs(this.date, "DD-MM-YYYY", true);
  this.entryCreateDate = d.isValid() ? d.startOf("day").toDate() : undefined;
  next();
});
schema.index({ date: 1 });
export default mongoose.model("CashHandover", schema, "cashhandovers");
