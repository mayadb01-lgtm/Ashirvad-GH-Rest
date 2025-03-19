import process from "process";
import app from "./app.js";
import connectDatabase from "./db/Database.js";
import dotenv from "dotenv";

// Handling uncaught Exception
process.on("uncaughtException", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(`shutting down the server for handling uncaught exception`);
});

// config
if (process.env.NODE_ENV !== "PRODUCTION") {
  dotenv.config({ path: "./.env" });
}

// connect database
connectDatabase();

const server = app.listen(process.env.PORT || 8080, () => {
  console.log(
    `Server is running on http://localhost:${process.env.PORT || 8080}`
  );
});

app.get("/", (req, res) => {
  res.send("API is running...");
});

// Handling unhandled Promise Rejection
process.on("unhandledRejection", (err) => {
  console.log(`Error: ${err.message}`);
  console.log(
    `shutting down the server for handling unhandled promise rejection`
  );
  server.close(() => {
    process.exit(1);
  });
});
