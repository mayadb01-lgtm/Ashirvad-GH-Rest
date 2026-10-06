import mongoose from "mongoose";

// Advance booking + advance payment.
// ⚠️ Naya collection ("bookings"). Advance jis din mila, us din ke galla mein dikhaya jaata hai.
const advanceSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    mode: { type: String, default: "Cash" }, // Cash / Card / PPS / PPC
    date: { type: String, required: true }, // DD-MM-YYYY (jis din mila)
    by: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNo: { type: String, required: true },
    guestName: { type: String, required: true },
    mobile: { type: String, default: "" },
    company: { type: String, default: "" },
    people: { type: Number, default: 1 },
    roomNo: { type: Number }, // khaali = abhi room tay nahi
    roomType: { type: String, default: "" },
    checkInDate: { type: String, required: true }, // DD-MM-YYYY
    checkInCreateDate: { type: Date },
    checkInTime: { type: String, default: "" },
    nights: { type: Number, default: 1 },
    rate: { type: Number, default: 0 }, // per raat
    notes: { type: String, default: "" },
    advances: [advanceSchema],
    status: { type: String, enum: ["booked", "checkedin", "cancelled"], default: "booked" },
    checkedIn: {
      date: { type: String, default: "" },
      period: { type: String, default: "" },
      roomNo: { type: Number },
    },
    cancelReason: { type: String, default: "" },
    enteredBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

bookingSchema.index({ status: 1, checkInCreateDate: 1 });
bookingSchema.index({ "advances.date": 1 });

export const Booking = mongoose.model("Booking", bookingSchema);
export default Booking;
