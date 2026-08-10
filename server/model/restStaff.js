import { Schema, model } from "mongoose";

const restStaffSchema = new Schema(
  {
    id: { type: String },
    fullname: { type: String, required: true },
    mobileNumber: { type: Number, required: true },
    category: { type: String, required: true },
    perDayPay: { type: Number, default: 0, min: 0 },
    staffStatus: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    createDate: { type: String, required: true },
    updatedDateTime: { type: Date, default: Date.now() },
  },
  {
    timestamps: true,
  }
);

export default model("RestStaff", restStaffSchema);
