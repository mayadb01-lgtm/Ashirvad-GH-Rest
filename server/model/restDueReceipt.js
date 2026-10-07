import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
dayjs.extend(customParseFormat);

// Restaurant mein purana udhaar (Receivables) wapas mila — "old dues received".
// ⚠️ Naya collection ("restduereceipts"). Yeh SALE nahi hai (sale udhaar dene wale din gin chuki), isliye din ke Grand total mein nahi judta.
const schema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // DD-MM-YYYY
    entryCreateDate: { type: Date },
    name: { type: String, required: true },
    nameKey: { type: String, required: true },
    amount: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: ["Cash", "Card", "PP"], required: true },
    note: { type: String, default: "" },
    // source "gh": GH cashier ne room ka food bill (Cash) wasool karke Restaurant cashier ko diya — handover.
    // Paisa GH par wasooli ke din hi reports mein gin chuka, isliye reports isse dobara nahi ginti.
    source: { type: String, enum: ["rest", "gh"], default: "rest" },
    chargeId: { type: String, default: "" },
    enteredBy: { type: String, default: "" },
    cancelled: { type: Boolean, default: false }, // hatana = cancel (record rehta hai)
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
schema.index({ nameKey: 1 });
export default mongoose.model("RestDueReceipt", schema, "restduereceipts");
