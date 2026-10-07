import express from "express";
import process from "process";
const app = express();
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

app.use(
  cors({
    origin: [process.env.CLIENT_URL, "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" })); // bulk import ke liye limit badhayi
app.use(cookieParser());
app.get("/test", (req, res) => {
  res.send("Hello World!");
});
app.use(bodyParser.urlencoded({ extended: true }));

// Environment variables
if (process.env.NODE_ENV !== "PRODUCTION") {
  dotenv.config({ path: "./.env" });
}

// Import routes
import user from "./controller/user.js";
import admin from "./controller/admin.js";
import entry from "./controller/entry.js";
import restEntry from "./controller/restEntry.js";
import restStaff from "./controller/restStaff.js";
import restCategory from "./controller/restCategory.js";
import pendingRestAggregation from "./controller/pendingRestAggregation.js";
import restPending from "./controller/restPending.js";
import officeBook from "./controller/officeBook.js";
import room from "./controller/room.js";
import staffSalary from "./controller/staffSalary.js";
import vendor from "./controller/vendor.js";
import dataImport from "./controller/import.js";
import backup from "./controller/backup.js";
import { apiGate } from "./middleware/security.js";
import owner from "./controller/owner.js";
import insights from "./controller/insights.js";
import officeTypes from "./controller/officeTypes.js";
import restDues from "./controller/restDues.js";
import counterCash from "./controller/counterCash.js";
import guestRegister from "./controller/guestRegister.js";
import purchase from "./controller/purchase.js";
import roomCharges from "./controller/roomCharges.js";
import invoice from "./controller/invoice.js";
import { stayRouter, bookingRouter } from "./controller/stays.js";
import quickEntry from "./controller/quickEntry.js";
import staffAccounts from "./controller/staffAccounts.js";

// Use routes
// 🔒 Har API ke liye login zaroori (public list security.js mein)
app.set("trust proxy", 1);
app.use("/api/v1", apiGate);

app.use("/api/v1/user", user);
app.use("/api/v1/admin", admin);
app.use("/api/v1/entry", entry);
app.use("/api/v1/restEntry", restEntry);
app.use("/api/v1/restStaff", restStaff);
app.use("/api/v1/restCategory", restCategory);
app.use("/api/v1/aggregation", pendingRestAggregation);
app.use("/api/v1/vendor", vendor);
app.use("/api/v1/restPending", restPending);
app.use("/api/v1/officeBook", officeBook);
app.use("/api/v1/room", room);
app.use("/api/v1/staffSalary", staffSalary);
app.use("/api/v1/import", dataImport);
app.use("/api/v1/owner", owner); // read-only owner report
app.use("/api/v1/guest-register", guestRegister); // govt guest register (alag collection)
app.use("/api/v1/purchase", purchase); // restaurant purchase bills (alag collection)
app.use("/api/v1/room-charges", roomCharges); // food bill + extra charges (alag collection)
app.use("/api/v1/invoice", invoice); // GST / Non-GST invoice (alag collection + numbering)
app.use("/api/v1/stay", stayRouter); // continue stay + checkout (alag collection)
app.use("/api/v1/booking", bookingRouter); // advance booking (alag collection)
app.use("/api/v1/counter", counterCash); // GH baaki Office mein + counter cash Office ko (naye collections)
app.use("/api/v1/rest-dues", restDues); // restaurant: purana udhaar wasool (naya collection)
app.use("/api/v1/office-types", officeTypes); // owner: Office category ka type (sirf reports ke liye, naya collection)
app.use("/api/v1/insights", insights); // read-only: cashflow, GH growth, kharch control, data check
app.use("/api/v1/backup", backup);
app.use("/api/v1/quick", quickEntry); // mobile/PC quick entry helpers (read-only)
app.use("/api/v1/staff-accounts", staffAccounts); // owner: staff ka department / band-chalu

export default app;
