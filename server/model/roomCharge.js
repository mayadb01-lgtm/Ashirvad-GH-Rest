import mongoose from "mongoose";

// Room ke saath judne wale charges: restaurant ka food bill + extra charges (extra bed, laundry...).
// ⚠️ Alag collection ("roomcharges"). Purani GH entries / restaurant entries mein koi badlaav nahi.
//   kind   : "food"  = restaurant "Levana baaki" se apne aap aaya
//            "extra" = GH pe staff ne joda (GH kamai mein judta hai)
//   source : "rest" | "gh"
const roomChargeSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // DD-MM-YYYY (kis din ka bill)
    entryCreateDate: { type: Date },
    roomNo: { type: Number, required: true },
    period: { type: String, default: "" }, // day / night / extraDay / extraNight / "" (pata nahi)
    guestName: { type: String, default: "" },
    mobile: { type: String, default: "" },
    kind: { type: String, enum: ["food", "extra"], required: true },
    label: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    source: { type: String, enum: ["rest", "gh"], required: true },
    // restaurant wale rows ka link (Levana baaki ki row)
    restDate: { type: String, default: "" },
    restRowId: { type: Number },
    // vasooli (GH counter pe)
    isPaid: { type: Boolean, default: false },
    paidMode: { type: String, default: "" }, // Cash / Card / PPS / PPC
    // Bill do mode mein (jaise Cash 500 + PPS 700). Khaali = poori rakam paidMode mein.
    paidSplit: { type: [{ _id: false, mode: String, amount: Number }], default: undefined },
    paidDate: { type: String, default: "" },
    paidBy: { type: String, default: "" },
    paidAt: { type: String, default: "" }, // "" / "gh" = GH counter, "rest" = Restaurant counter par wasool
    enteredBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

roomChargeSchema.index({ date: 1, roomNo: 1 });
roomChargeSchema.index({ source: 1, restDate: 1 });
roomChargeSchema.index({ entryCreateDate: 1 });

export default mongoose.model("RoomCharge", roomChargeSchema);
