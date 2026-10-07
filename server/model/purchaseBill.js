import mongoose from "mongoose";

// Restaurant purchase bill (maal ka bill): photo + vendor + rakam + mode (Cash / Payable).
// ⚠️ Naya collection ("purchasebills"). Restaurant ki din ki entry (restentries) ko ye nahi chhoota —
// app bill save hone par Expenses / Payables mein ek line bana deta hai, jo din ke Update se save hoti hai.
const itemSchema = new mongoose.Schema({ name: String, qty: Number, unit: String, rate: Number, amount: Number }, { _id: false });
const purchaseBillSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // restaurant ka din DD-MM-YYYY
    entryCreateDate: { type: Date },
    billDate: { type: String, default: "" },
    billNo: { type: String, default: "" },
    vendor: {
      _id: { type: String, default: "" }, // expense list wala vendor item
      name: { type: String, default: "" },
      expenseName: { type: String, default: "" },
      categoryName: { type: String, default: "" },
      isVendor: { type: Boolean, default: false },
    },
    amount: { type: Number, required: true },
    mode: { type: String, enum: ["Cash", "Payable"], required: true },
    items: [itemSchema],
    itemsTotal: { type: Number, default: 0 },
    extra: { type: Number, default: 0 }, // tax / round-off / transport (items ke alawa)
    note: { type: String, default: "" },
    source: { type: String, enum: ["scan", "manual"], default: "manual" },
    ocrText: { type: String, default: "" },
    photos: [{ type: String }],
    rowKey: { type: String, default: "" }, // restaurant draft line se jodne ke liye
    enteredBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);
purchaseBillSchema.index({ date: 1 });
purchaseBillSchema.index({ entryCreateDate: 1 });

export default mongoose.model("PurchaseBill", purchaseBillSchema, "purchasebills");
