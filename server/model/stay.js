import mongoose from "mongoose";

// Room stay plan: guest kitni raat rukega + checkout.
// ⚠️ Naya collection ("roomstays"). GH ki roz ki entry (entries) waisi hi rehti hai — ye sirf
// batata hai ki agle din room apne aap bharna hai (continue stay) ya room khaali ho gaya (checkout).
const staySchema = new mongoose.Schema(
  {
    roomNo: { type: Number, required: true },
    startDate: { type: String, required: true }, // DD-MM-YYYY (pehla din)
    startCreateDate: { type: Date },
    period: { type: String, default: "day" }, // pehle din ka slot
    nights: { type: Number, default: 1, min: 1, max: 60 },
    guest: {
      fullname: { type: String, default: "" },
      mobileNumber: { type: String, default: "" },
      type: { type: String, default: "" },
      noOfPeople: { type: Number, default: 0 },
      rate: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      checkInTime: { type: String, default: "" },
      checkOutTime: { type: String, default: "" },
      modeOfPayment: { type: String, default: "" }, // footprint ke liye (badla to log mein dikhta hai)
    },
    status: { type: String, enum: ["active", "out"], default: "active" },
    checkoutDate: { type: String, default: "" },
    checkoutPeriod: { type: String, default: "" },
    checkoutTime: { type: String, default: "" },
    bookingId: { type: String, default: "" },
    // room badla (shift / swap) to naya stay: purane room / stay ka link
    shiftedFrom: {
      roomNo: { type: Number },
      stayId: { type: String, default: "" },
      reason: { type: String, default: "" },
    },
    enteredBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

staySchema.index({ startDate: 1, period: 1, roomNo: 1 }, { unique: true });
staySchema.index({ status: 1, startCreateDate: 1 });

export default mongoose.model("Stay", staySchema, "roomstays");
