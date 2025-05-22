import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { Schema, model } from "mongoose";

dayjs.extend(customParseFormat);

const upadEntrySchemaObj = new Schema(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true },
    fullname: { type: String, required: true },
    mobileNumber: { type: Number, required: true },
    createDate: { type: String, required: true },
    entryCreateDate: { type: Date },
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
    entryCreateDate: { type: Date },
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
    entryCreateDate: { type: Date },
    updatedDate: { type: String, default: "" },
    updatedDateTime: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);

const pendingUsersSchema = new Schema(
  {
    fullname: { type: String, required: true },
    mobileNumber: { type: Number, required: true },
    amount: { type: Number },
    createDate: { type: String },
    entryCreateDate: { type: Date },
    updatedDateTime: { type: Date, default: Date.now() },
    createdAt: { type: Date, default: Date.now() },
  },
  {
    timestamps: true,
  }
);

const restEntrySchema = new Schema(
  {
    upad: [upadEntrySchemaObj],
    pending: [pendingEntrySchemaObj],
    expenses: [expensesEntrySchemaObj],
    pendingUsers: [pendingUsersSchema],
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
    entryCreateDate: { type: Date },
    updatedDate: { type: String, default: "" },
    updatedDateTime: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);

restEntrySchema.pre("save", function (next) {
  const parsedDate = dayjs(this.date, "DD-MM-YYYY");
  this.entryCreateDate = parsedDate.isValid()
    ? parsedDate.startOf("day").toDate()
    : undefined;

  // Process nested subdocs
  if (Array.isArray(this.upad)) {
    this.upad.forEach((e) => {
      const dt = dayjs(e.createDate, "DD-MM-YYYY");
      e.entryCreateDate = dt.isValid() ? dt.startOf("day").toDate() : undefined;
    });
  }

  if (Array.isArray(this.pending)) {
    this.pending.forEach((e) => {
      const dt = dayjs(e.createDate, "DD-MM-YYYY");
      e.entryCreateDate = dt.isValid() ? dt.startOf("day").toDate() : undefined;
    });
  }

  if (Array.isArray(this.expenses)) {
    this.expenses.forEach((e) => {
      const dt = dayjs(e.createDate, "DD-MM-YYYY");
      e.entryCreateDate = dt.isValid() ? dt.startOf("day").toDate() : undefined;
    });
  }

  if (Array.isArray(this.pendingUsers)) {
    this.pendingUsers.forEach((e) => {
      const dt = dayjs(e.createDate, "DD-MM-YYYY");
      e.entryCreateDate = dt.isValid() ? dt.startOf("day").toDate() : undefined;
    });
  }

  next();
});

export default model("RestEntry", restEntrySchema);
