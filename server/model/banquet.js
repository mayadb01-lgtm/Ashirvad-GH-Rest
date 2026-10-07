import mongoose from "mongoose";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
dayjs.extend(customParseFormat);

// 🎉 Banquet module — sab NAYE collections (purane data ko nahi chhedta)
//   banquetitems     : menu item master (per kg/litre rate + per person gram) — sirf owner (backend)
//   banquetpackages  : menu plan / package (items + gram) → per plate cost + selling rate
//   banquetaddons    : stage, decoration, sound… (fixed / per hour / per day / per plate)
//   banquethalls     : jagah (rent per hour / per day, min hours)
//   banquetbookings  : booking + bill + payments
const opts = { timestamps: true, versionKey: false };

const itemSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    category: { type: String, default: "Other" },
    pricePerKg: { type: Number, default: 0 }, // selling/cost rate per kg (ya litre / 1000 pc)
    unit: { type: String, enum: ["kg", "litre", "pc"], default: "kg" },
    defaultGrams: { type: Number, default: 0 }, // per person (gram / ml / pc)
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  opts
);
export const BanquetItem = mongoose.model("BanquetItem", itemSchema, "banquetitems");

const packageSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    meal: { type: String, default: "Lunch" }, // Breakfast / Lunch / Dinner / Hi-Tea
    items: [{ itemId: String, name: String, category: String, grams: Number }], // purana tarika (fix items)
    // Naya: har hissa (Starter, Sabji, Sweet…) mein se customer "pick" item chunta hai; har chune item ke "grams" per person
    sections: [{ label: String, pick: Number, grams: Number, options: [{ itemId: String, name: String, category: String }] }],
    pricePerPlate: { type: Number, default: 0 }, // customer ko yeh rate dikhta hai
    minPlates: { type: Number, default: 0 },
    description: { type: String, default: "" },
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  opts
);
export const BanquetPackage = mongoose.model("BanquetPackage", packageSchema, "banquetpackages");

const addonSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, default: 0 },
    unit: { type: String, enum: ["fixed", "hour", "day", "plate"], default: "fixed" },
    active: { type: Boolean, default: true },
    sort: { type: Number, default: 0 },
  },
  opts
);
export const BanquetAddon = mongoose.model("BanquetAddon", addonSchema, "banquetaddons");

const hallSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    rentPerHour: { type: Number, default: 0 },
    rentPerDay: { type: Number, default: 0 },
    minHours: { type: Number, default: 0 },
    capacity: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  opts
);
export const BanquetHall = mongoose.model("BanquetHall", hallSchema, "banquethalls");

const paymentSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true },
    mode: { type: String, enum: ["Cash", "PP", "PPS", "PPC", "Card"], required: true },
    date: { type: String, required: true }, // DD-MM-YYYY jis din mila
    note: { type: String, default: "" },
    by: { type: String, default: "" },
    cancelled: { type: Boolean, default: false },
    cancelledBy: { type: String, default: "" },
  },
  { timestamps: true }
);

const bookingSchema = new mongoose.Schema(
  {
    bookingNo: { type: String, required: true },
    customer: {
      name: { type: String, required: true },
      mobile: { type: String, default: "" },
      company: { type: String, default: "" },
      address: { type: String, default: "" },
      gstin: { type: String, default: "" },
    },
    occasion: { type: String, default: "" },
    eventDate: { type: String, required: true }, // DD-MM-YYYY
    eventCreateDate: { type: Date },
    slot: { type: String, default: "Lunch" }, // Breakfast / Lunch / Dinner / Hi-Tea / Full day
    startTime: { type: String, default: "" },
    endTime: { type: String, default: "" },
    hall: { id: String, name: String },
    hours: { type: Number, default: 0 },
    hallRent: { type: Number, default: 0 },
    guests: { type: Number, default: 0 }, // andaaz (booking ke time)
    // menu (snapshot — baad mein package ka rate badle to purani booking na badle)
    menus: [
      {
        packageId: String, name: String, meal: String, pricePerPlate: Number, plates: Number,
        items: [{ itemId: String, name: String, category: String, grams: Number }],
        choices: [{ label: String, grams: Number, items: [{ itemId: String, name: String, category: String }] }], // customer ka chuna menu
      },
    ],
    addons: [{ name: String, price: Number, unit: String, qty: Number }],
    discount: { type: Number, default: 0 },
    gstPercent: { type: Number, default: 0 },
    status: { type: String, enum: ["booked", "billed", "cancelled"], default: "booked" },
    billNo: { type: String, default: "" },
    billedAt: { type: String, default: "" }, // DD-MM-YYYY
    payments: [paymentSchema],
    notes: { type: String, default: "" },
    cancelReason: { type: String, default: "" },
    enteredBy: { type: String, default: "" },
    updatedBy: { type: String, default: "" },
  },
  opts
);
bookingSchema.pre("validate", function (next) {
  const d = dayjs(this.eventDate, "DD-MM-YYYY", true);
  this.eventCreateDate = d.isValid() ? d.startOf("day").toDate() : undefined;
  next();
});
bookingSchema.index({ eventCreateDate: 1 });
bookingSchema.index({ "payments.date": 1 });
export const BanquetBooking = mongoose.model("BanquetBooking", bookingSchema, "banquetbookings");

// Bill ka hisaab (ek hi jagah — app, bill print, reports sab yahi use karte hain)
export const banquetTotals = (b) => {
  const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
  const food = (b.menus || []).reduce((t, m) => t + (Number(m.pricePerPlate) || 0) * (Number(m.plates) || 0), 0);
  const addons = (b.addons || []).reduce((t, a) => t + (Number(a.price) || 0) * (Number(a.qty) || 0), 0);
  const hall = Number(b.hallRent) || 0;
  const sub = food + addons + hall;
  const discount = Math.min(Number(b.discount) || 0, sub);
  const taxable = sub - discount;
  const gst = (taxable * (Number(b.gstPercent) || 0)) / 100;
  const total = taxable + gst;
  const paid = (b.payments || []).filter((p) => !p.cancelled).reduce((t, p) => t + (Number(p.amount) || 0), 0);
  return { food: r2(food), addons: r2(addons), hall: r2(hall), sub: r2(sub), discount: r2(discount), taxable: r2(taxable), gst: r2(gst), total: Math.round(total), paid: r2(paid), balance: Math.round(total - paid) };
};
