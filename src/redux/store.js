import { configureStore } from "@reduxjs/toolkit";
import userReducer from "./reducers/userReducer";
import adminReducer from "./reducers/adminReducer";
import entryReducer from "./reducers/entryReducer";
import restEntryReducer from "./reducers/restEntryReducer";
import restStaffReducer from "./reducers/restStaffReducer";
import restCategoryReducer from "./reducers/restCategory";

const Store = configureStore({
  reducer: {
    user: userReducer,
    admin: adminReducer,
    entry: entryReducer,
    restEntry: restEntryReducer,
    restStaff: restStaffReducer,
    restCategory: restCategoryReducer,
  },
});

export default Store;
