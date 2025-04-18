import { Schema, model } from "mongoose";

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
    mobileNumber: { type: Number, default: "" },
    checkInTime: { type: String },
    checkOutTime: { type: String },
    checkInDateTime: { type: String },
    checkOutDateTime: { type: String },
    advancePayment: { type: Number, default: 0 },
    advancePaymentDate: { type: String, default: "" },
    reservationId: { type: String, default: "" },
    date: { type: String, required: true },
    createDate: { type: String, required: true },
    updatedDateTime: { type: String, default: "" },
    period: { type: String, required: true },
    createdAt: { type: Date, default: Date.now() },
    paidDate: { type: String, default: "" },
    isPaid: {
      type: Boolean,
      default: function () {
        return this.modeOfPayment === "UnPaid" ? false : true;
      },
    },
  },
  { timestamps: true }
);

const entrySchema = new Schema({
  entry: [entrySchemaObj],
  date: { type: String, required: true },
  createdAt: { type: Date, default: Date.now() },
  // user: { type: Schema.Types.ObjectId, ref: "User" },
});

export default model("Entry", entrySchema);
