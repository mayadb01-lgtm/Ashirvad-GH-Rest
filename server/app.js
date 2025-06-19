import express from "express";
import process from "process";
const app = express();
import cookieParser from "cookie-parser";
import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";

app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      "http://localhost:5173",
      "https://guesthouse-seven.vercel.app",
    ],
    credentials: true,
  })
);

app.use(express.json());
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

// Use routes
app.use("/api/v1/user", user);
app.use("/api/v1/admin", admin);
app.use("/api/v1/entry", entry);
app.use("/api/v1/restEntry", restEntry);
app.use("/api/v1/restStaff", restStaff);
app.use("/api/v1/restCategory", restCategory);
app.use("/api/v1/aggregation", pendingRestAggregation);
app.use("/api/v1/restPending", restPending);
app.use("/api/v1/officeBook", officeBook);
app.use("/api/v1/room", room);

export default app;
