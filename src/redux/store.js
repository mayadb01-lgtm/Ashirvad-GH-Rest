import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./reducers/userReducer";
import adminReducer from "./reducers/adminReducer";
import entryReducer from "./reducers/entryReducer";
import restEntryReducer from "./reducers/restEntryReducer";
import restStaffReducer from "./reducers/restStaffReducer";
import restCategoryReducer from "./reducers/restCategory";
import restPendingReducer from "./reducers/restPendingReducer";
import officeBookReducer from "./reducers/officeBookReducer";
import roomReducer from "./reducers/roomReducer";
import staffSalaryReducer from "./reducers/staffSalaryReducer";

const Store = configureStore({
  reducer: {
    rooms: roomReducer,
    user: userReducer,
    admin: adminReducer,
    entry: entryReducer,
    restEntry: restEntryReducer,
    restStaff: restStaffReducer,
    restCategory: restCategoryReducer,
    restPending: restPendingReducer,
    officeBook: officeBookReducer,
    staffSalary: staffSalaryReducer,
  },
});

export default Store;
