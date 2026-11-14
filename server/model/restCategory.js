import { Schema, model } from "mongoose";

const restCategorySchema = new Schema(
  {
    categoryName: { type: String, required: true },
    categoryDescription: { type: String, required: true },
    expense: [
      {
        expenseName: { type: String, required: true },
        // optional: 109 old items were saved with a blank description, and "required" made every save of
        // their category fail (e.g. adding a new vendor, 14 Nov 2026)
        expenseDescription: { type: String, default: "" },
        isVendor: { type: Boolean, default: false },
        // Vendor ki jaankari (sab optional; purane items mein khaali)
        mobile: { type: String, default: "" },
        gstin: { type: String, default: "" },
        supplies: { type: [String], default: undefined }, // kya maal deta hai: Sabzi, Dairy, Kirana...
        payTerms: { type: String, default: "" }, // "Cash" | "Payable" (udhaar)
        note: { type: String, default: "" },
        addedBy: { type: String, default: "" },
        addedAt: { type: Date },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default model("RestCategory", restCategorySchema);
