import mongoose from "mongoose";

// Govt / police register ke liye guest ki poori details.
// ⚠️ Alag collection hai: purani GH entries (entries collection) mein koi badlaav nahi.
// Ek record = ek din + ek period (day/night/...) + ek room.
const otherGuestSchema = new mongoose.Schema(
  {
    fullName: { type: String, default: "" },
    mobile: { type: String, default: "" },
    documentType: { type: String, default: "" },
    documentNumber: { type: String, default: "" },
  },
  { _id: false }
);

const guestRegisterSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // DD-MM-YYYY (entry ka din)
    entryCreateDate: { type: Date },
    period: { type: String, required: true },
    roomNo: { type: Number, required: true },

    firstName: { type: String, default: "" },
    middleName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    companyName: { type: String, default: "" },
    houseNo: { type: String, default: "" },
    address: { type: String, default: "" },
    locality: { type: String, default: "" },
    country: { type: String, default: "India" },
    state: { type: String, default: "" },
    district: { type: String, default: "" },
    city: { type: String, default: "" },
    zipCode: { type: String, default: "" },
    dob: { type: String, default: "" }, // YYYY-MM-DD
    mobile: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    comingFrom: { type: String, default: "" },
    goingTo: { type: String, default: "" },
    documentType: { type: String, default: "" },
    documentNumber: { type: String, default: "" },
    documentImages: { type: [String], default: [] }, // server pe file naam
    checkinDate: { type: String, default: "" }, // YYYY-MM-DD
    checkinTime: { type: String, default: "" }, // HH:mm
    checkoutDate: { type: String, default: "" },
    checkoutTime: { type: String, default: "" },
    children: { type: Number, default: 0 },
    adults: { type: Number, default: 1 },
    vehicleType: { type: String, default: "" },
    vehicleNo: { type: String, default: "" },
    otherGuests: { type: [otherGuestSchema], default: [] },

    enteredBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

guestRegisterSchema.index({ date: 1, period: 1, roomNo: 1 }, { unique: true });
guestRegisterSchema.index({ entryCreateDate: 1 });

export default mongoose.model("GuestRegister", guestRegisterSchema);
