import mongoose from "mongoose";

// Office Book ki category / naam ka "type" — sirf REPORTS ke hisaab ke liye (Office Book ke records nahi badalte).
// ⚠️ Naya collection ("officecategorytypes").
//   side: "in" | "out"
//   categoryName + expenseName ("*" = poori category)
//   type: business | personal | loan | emi | transfer | recovery
const officeTypeSchema = new mongoose.Schema(
  {
    side: { type: String, enum: ["in", "out"], required: true },
    categoryName: { type: String, required: true },
    expenseName: { type: String, default: "*" },
    type: { type: String, enum: ["business", "personal", "loan", "emi", "transfer", "recovery", "refund"], required: true },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);
officeTypeSchema.index({ side: 1, categoryName: 1, expenseName: 1 }, { unique: true });

export default mongoose.model("OfficeType", officeTypeSchema, "officecategorytypes");
