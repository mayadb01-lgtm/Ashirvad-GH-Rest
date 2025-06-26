import { OfficeCategory } from "../model/officeBook.js";
import RestPending from "../model/restPending.js";

export async function initPendingCategory() {
  const category = await OfficeCategory.findOne({ categoryName: "Pending" });
  if (!category) {
    const pendingUsers = await RestPending.find({});
    await new OfficeCategory({
      categoryName: "Pending",
      categoryDescription: "Pending",
      expense: pendingUsers.map((user) => ({
        expenseName: user.fullname,
        expenseDescription: user.fullname,
      })),
    }).save();
  }
}

export default initPendingCategory;
