import process from "process";
import app from "./app.js";
import connectDatabase from "./db/Database.js";
import dotenv from "dotenv";

import dns from 'dns';
dns.setServers(['8.8.8.8', '8.8.4.4']);

// Uncaught Exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`shutting down the server for handling uncaught exception`);
});

// Config
if (process.env.NODE_ENV !== "PRODUCTION") {
  dotenv.config({ path: "./.env" });
}

// DB Connection
connectDatabase();

// Server
const server = app.listen(process.env.PORT || 8080, () => {
  console.log(
    `Server is running on http://localhost:${process.env.PORT || 8080}`
  );
});

// Routes
app.get("/", (req, res) => {
  res.send("API is running...");
});

// Unhandled Rejection
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(
    `shutting down the server for handling unhandled promise rejection`
  );
  server.close(() => {
    process.exit(1);
  });
});
