import { Schema, model } from "mongoose";

const restCategorySchema = new Schema(
  {
    categoryName: { type: String, required: true },
    categoryDescription: { type: String, required: true },
    expense: [
      {
        expenseName: { type: String, required: true },
        expenseDescription: { type: String, required: true },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export default model("RestCategory", restCategorySchema);
