import { Schema, model } from "mongoose";

const pendingUsersSchema = new Schema(
  {
    id: { type: String, required: true },
    fullname: { type: String, required: true },
    mobileNumber: { type: Number, required: true },
    amount: { type: Number, required: true },
    createDate: { type: String, required: true },
    updatedDateTime: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
  },
  {
    timestamps: true,
  }
);

export default model("RestPending", pendingUsersSchema);
