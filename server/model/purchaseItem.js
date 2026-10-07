import mongoose from "mongoose";

// Purchase bill ke items ki yaad (agli baar jaldi entry): naam, unit, aakhri rate, kis vendor se.
// ⚠️ Naya collection ("purchaseitems"). Bill save hone par apne aap update hota hai.
const purchaseItemSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true }, // naam chhote akshar mein
    name: { type: String, required: true },
    unit: { type: String, default: "kg" },
    lastRate: { type: Number, default: 0 },
    lastVendorId: { type: String, default: "" },
    vendorRates: { type: Map, of: Number, default: {} }, // vendorId → aakhri rate
    uses: { type: Number, default: 0 },
    lastDate: { type: String, default: "" },
  },
  { timestamps: true }
);
export default mongoose.model("PurchaseItem", purchaseItemSchema, "purchaseitems");
