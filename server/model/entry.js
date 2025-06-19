import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { Schema, model } from "mongoose";

dayjs.extend(customParseFormat);

const entrySchemaObj = new Schema(
  {
    id: { type: String, required: true },
    roomNo: { type: Number, required: true },
    cost: { type: Number },
    roomType: { type: String },
    rate: { type: Number, required: true },
    noOfPeople: { type: Number },
    type: {
      type: String,
      enum: [
        "Select",
        "Single",
        "Couple",
        "Family",
        "Employee",
        "NRI",
        "Foreigner",
        "Group",
        "Other",
      ],
    },
    modeOfPayment: {
      type: String,
      enum: ["Cash", "Card", "PPS", "PPC", "UnPaid"],
      required: true,
    },
    fullname: { type: String, default: "" },
    mobileNumber: { type: Number, default: 0 },
    checkInTime: { type: String },
    checkOutTime: { type: String },
    checkInDateTime: { type: String },
    checkOutDateTime: { type: String },
    advancePayment: { type: Number, default: 0 },
    advancePaymentDate: { type: String, default: "" },
    reservationId: { type: String, default: "" },
    date: { type: String, required: true },
    createDate: { type: String, required: true },
    entryCreateDate: { type: Date },
    updatedDateTime: { type: String, default: "" },
    period: { type: String, required: true },
    discount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    paidDate: { type: String, default: "" },
    isPaid: {
      type: Boolean,
      default: function () {
        return this.modeOfPayment !== "UnPaid";
      },
    },
  },
  { timestamps: true }
);

const entrySchema = new Schema({
  entry: [entrySchemaObj],
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  entryCreateDate: { type: Date },
  // user: { type: Schema.Types.ObjectId, ref: "User" },
});

entrySchema.pre("save", function (next) {
  const dt = dayjs(this.date, "DD-MM-YYYY");
  if (!dt.isValid()) {
    console.warn(`Invalid 'date' in Entry document: ${this.date}`);
    this.entryCreateDate = undefined;
  } else {
    this.entryCreateDate = dt.startOf("day").toDate();
  }
  next();
});

// Ensure 'entryCreateDate' is in IST for individual entries
entrySchemaObj.pre("save", function (next) {
  const dt = dayjs(this.createDate, "DD-MM-YYYY");
  if (!dt.isValid()) {
    console.warn(`Invalid 'createDate' in entry object: ${this.createDate}`);
    this.entryCreateDate = undefined;
  } else {
    this.entryCreateDate = dt.startOf("day").toDate();
  }
  next();
});

export default model("Entry", entrySchema);
