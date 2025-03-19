import { Schema, model } from "mongoose";

const upadEntrySchemaObj = new Schema(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true },
    fullname: { type: String, required: true },
    mobileNumber: { type: Number, required: true },
    createDate: { type: String, required: true },
    updatedDateTime: { type: Date, default: Date.now() },
    updatedDate: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);
const pendingEntrySchemaObj = new Schema(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true },
    fullname: { type: String, required: true },
    mobileNumber: { type: Number, required: true },
    createDate: { type: String, required: true },
    updatedDate: { type: String, default: "" },
    updatedDateTime: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);
const expensesEntrySchemaObj = new Schema(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true },
    expenseName: { type: String, required: true },
    categoryName: { type: String, required: true },
    createDate: { type: String, required: true },
    updatedDate: { type: String, default: "" },
    updatedDateTime: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);

const restEntrySchema = new Schema(
  {
    upad: [upadEntrySchemaObj],
    pending: [pendingEntrySchemaObj],
    expenses: [expensesEntrySchemaObj],
    extraAmount: { type: Number, default: 0 },
    totalUpad: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },
    totalExpenses: { type: Number, default: 0 },
    totalCard: { type: Number, default: 0 },
    totalPP: { type: Number, default: 0 },
    totalCash: { type: Number, default: 0 },
    grandTotal: { type: Number, default: 0 },
    computerAmount: { type: Number, default: 0 },
    date: { type: String, required: true },
    createDate: { type: String, required: true },
    updatedDate: { type: String, default: "" },
    updatedDateTime: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);

export default model("RestEntry", restEntrySchema);
