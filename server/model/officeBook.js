import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { Schema, model } from "mongoose";
dayjs.extend(customParseFormat);

const officeBookSchema = new Schema(
  {
    id: { type: String, required: true },
    amount: { type: Number, required: true },
    modeOfPayment: { type: String, required: true },
    fullname: { type: String, required: true },
    categoryName: { type: String, required: true },
    expenseName: { type: String, required: true },
    remark: { type: String },
    createDate: { type: String, required: true },
    entryCreateDate: { type: Date },
    fullname_id: { type: String },
    updatedDate: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now() },
    updatedAt: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);

const officeEntrySchema = new Schema(
  {
    officeIn: [officeBookSchema],
    officeOut: [officeBookSchema],
    createDate: { type: String, required: true },
    entryCreateDate: { type: Date },
    updatedDate: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now() },
    updatedAt: { type: Date, default: Date.now() },
  },
  { timestamps: true }
);

officeEntrySchema.pre("save", function (next) {
  const dt = dayjs(this.createDate, "DD-MM-YYYY");
  if (!dt.isValid()) {
    console.warn(`Invalid 'createDate' in entry object: ${this.createDate}`);
    this.entryCreateDate = undefined;
  } else {
    this.entryCreateDate = dt.startOf("day").toDate();
  }
  next();
});

officeBookSchema.pre("save", function (next) {
  const dt = dayjs(this.createDate, "DD-MM-YYYY");
  if (!dt.isValid()) {
    console.warn(`Invalid 'createDate' in entry object: ${this.createDate}`);
    this.entryCreateDate = undefined;
  } else {
    this.entryCreateDate = dt.startOf("day").toDate();
  }
  next();
});

// Office Category Schema
const officeCategorySchema = new Schema(
  {
    categoryName: { type: String, required: true },
    categoryDescription: { type: String },
    expense: [
      {
        expenseName: { type: String },
        expenseDescription: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const OfficeCategory = model("OfficeCategory", officeCategorySchema);

export default model("OfficeBook", officeEntrySchema);
