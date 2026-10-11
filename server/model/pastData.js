// 📚 Purane records (Tally wagairah) — app se pehle ke din. Sirf performance comparison ke liye.
// Ye alag collections hain: app ki asli entries (GH, restaurant, office book) ko kabhi nahi chhoote.
import { Schema, model } from "mongoose";

// Ek document = ek din ki aavak
const pastDailySchema = new Schema(
  {
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // "2024-03-15"
    source: { type: String, required: true }, // "tally"
    restaurant: { type: Number, default: 0 },
    gh: { type: Number, default: 0 },
    banquet: { type: Number, default: 0 },
    other: { type: Number, default: 0 },
  },
  { timestamps: true }
);
pastDailySchema.index({ source: 1, date: 1 }, { unique: true });

// Ek document = ek mahine mein ek kharch head ka total
const pastExpenseSchema = new Schema(
  {
    month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
    source: { type: String, required: true },
    book: { type: String, required: true, enum: ["restaurant", "office", "upad", "personal"] },
    head: { type: String, required: true }, // Tally cost centre (vendor / item / staff)
    category: { type: String, default: "" }, // app wali category (Food & Beverages, Utility, Staff ...)
    amount: { type: Number, default: 0 },
    entries: { type: Number, default: 0 },
  },
  { timestamps: true }
);
pastExpenseSchema.index({ source: 1, month: 1, book: 1, head: 1 }, { unique: true });

export const PastDaily = model("PastDaily", pastDailySchema);
export const PastExpense = model("PastExpense", pastExpenseSchema);
