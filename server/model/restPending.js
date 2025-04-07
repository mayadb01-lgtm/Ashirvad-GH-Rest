import { Schema, model } from "mongoose";

const pendingUsersSchema = new Schema(
  {
    fullname: { type: String, required: true },
    mobileNumber: { type: Number, required: true },
    amount: { type: Number },
    createDate: { type: String },
    updatedDateTime: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
  },
  {
    timestamps: true,
  }
);

export default model("RestPending", pendingUsersSchema);
