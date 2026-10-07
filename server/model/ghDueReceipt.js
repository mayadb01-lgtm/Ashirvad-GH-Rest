import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
dayjs.extend(customParseFormat);

// GH ka purana baaki (UnPaid room) jo OFFICE mein wasool hua.
// ⚠️ Naya collection ("ghduereceipts"). Purani GH entry (entries) ko nahi chhedta — GH ki baaki list isse dekh kar us row ko hata deti hai.
const schema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // wasooli ka din DD-MM-YYYY
    entryCreateDate: { type: Date },
    srcId: { type: String, required: true }, // asli UnPaid row ka _id
    srcDate: { type: String, default: "" }, // room kis din ka tha
    roomNo: { type: Number },
    name: { type: String, default: "" },
    mobile: { type: String, default: "" },
    amount: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: ["Cash", "PP", "PPS", "PPC"], required: true },
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
schema.index({ srcId: 1 });
schema.index({ date: 1 });
export default mongoose.model("GhDueReceipt", schema, "ghduereceipts");

// Office mein wasool hue GH baaki ke row id (cancel wale chhod ke)
export const officeReceivedGhIds = async () => new Set((await mongoose.model("GhDueReceipt").find({ cancelled: { $ne: true } }, { srcId: 1 }).lean()).map((x) => x.srcId));
