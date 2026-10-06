import mongoose from "mongoose";

// Tax Invoice (GST) aur Bill (Non-GST).
// ⚠️ Naye collections: "invoices" + "invoicecounters". Purani entries ko chhoote nahi.
// Numbering alag-alag series mein, har financial year (Apr–Mar) naye sire se:
//   GST  → GST/26-27/0001
//   NON  → INV/26-27/0001
const itemSchema = new mongoose.Schema(
  {
    desc: { type: String, default: "" },
    sac: { type: String, default: "" },
    qty: { type: Number, default: 1 },
    rate: { type: Number, default: 0 }, // per unit, GST se pehle
    taxRate: { type: Number, default: 0 }, // % (0, 5, 12, 18, 28)
    taxable: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    series: { type: String, enum: ["GST", "NON"], required: true },
    fy: { type: String, required: true }, // 2026-27
    seq: { type: Number, required: true },
    invoiceNo: { type: String, required: true },
    invoiceDate: { type: String, required: true }, // DD-MM-YYYY
    entryCreateDate: { type: Date },
    business: { type: String, default: "Guest House" }, // Guest House / Restaurant / Banquet Hall / Other

    customer: {
      name: { type: String, default: "" },
      company: { type: String, default: "" },
      gstin: { type: String, default: "" },
      address: { type: String, default: "" },
      mobile: { type: String, default: "" },
      state: { type: String, default: "Gujarat" },
    },
    stay: {
      roomNo: { type: String, default: "" },
      checkIn: { type: String, default: "" },
      checkOut: { type: String, default: "" },
      guests: { type: Number, default: 0 },
    },
    items: [itemSchema],
    taxInclusive: { type: Boolean, default: false },
    taxable: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    roundOff: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    paymentMode: { type: String, default: "" },
    notes: { type: String, default: "" },

    source: {
      type: { type: String, default: "" }, // room / manual
      date: { type: String, default: "" },
      period: { type: String, default: "" },
      roomNo: { type: Number },
    },
    status: { type: String, enum: ["active", "cancelled"], default: "active" },
    cancelReason: { type: String, default: "" },
    cancelledBy: { type: String, default: "" },
    cancelledAt: { type: Date },
    createdBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

invoiceSchema.index({ series: 1, fy: 1, seq: 1 }, { unique: true });
invoiceSchema.index({ entryCreateDate: 1 });
invoiceSchema.index({ "source.date": 1, "source.roomNo": 1 });

export const Invoice = mongoose.model("Invoice", invoiceSchema);

const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false });
export const InvoiceCounter = mongoose.model("InvoiceCounter", counterSchema);

export default Invoice;
