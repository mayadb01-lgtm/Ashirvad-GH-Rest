// 📚 Purane saal (app se pehle) ke mahine ke total — sirf performance comparison ke liye.
// Ek document = ek mahina. App ke data (2025 se) ko ye kabhi nahi chhoota.
import { Schema, model } from "mongoose";

const pastMonthlySchema = new Schema(
  {
    month: { type: String, required: true, unique: true, match: /^\d{4}-\d{2}$/ }, // "2024-01"
    ghRevenue: { type: Number, default: null }, // GH room revenue ₹
    roomNights: { type: Number, default: null }, // kitne room-nights bike
    guests: { type: Number, default: null },
    restaurant: { type: Number, default: null }, // restaurant sale ₹
    banquet: { type: Number, default: null }, // banquet ka aaya hua paisa ₹
    note: { type: String, default: "" },
    source: { type: String, default: "past records" },
  },
  { timestamps: true }
);

const PastMonthly = model("PastMonthly", pastMonthlySchema);
export default PastMonthly;
