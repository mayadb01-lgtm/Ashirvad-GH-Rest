import { Schema, model } from "mongoose";

const restStaffSchema = new Schema(
  {
    fullname: { type: String, required: true },
    mobileNumber: { type: Number, required: true },
    createDate: { type: String, required: true },
    updatedDateTime: { type: Date, default: Date.now() },
  },
  {
    timestamps: true,
  }
);

export default model("RestStaff", restStaffSchema);
