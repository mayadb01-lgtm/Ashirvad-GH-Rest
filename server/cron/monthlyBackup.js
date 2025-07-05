import cron from "node-cron";
import runBackup from "../utils/runBackup.js";
import sendMailWithAttachment from "../utils/sendMail.js";

// Your models
import User from "../model/user.js";
import Admin from "../model/admin.js";
import Room from "../model/room.js";
import Entry from "../model/entry.js";
import RestEntry from "../model/restEntry.js";
import RestStaff from "../model/restStaff.js";
import RestPending from "../model/restPending.js";
import OfficeBook, { OfficeCategory } from "../model/officeBook.js";

const backupModels = [
  User,
  Admin,
  Room,
  Entry,
  RestEntry,
  RestStaff,
  RestPending,
  OfficeBook,
  OfficeCategory,
];

// Schedule: 1st day of every month at 2:00 AM
cron.schedule("0 2 1 * *", async () => {
  try {
    console.log("📅 Monthly backup started...");

    await runBackup(backupModels);
    await sendMailWithAttachment();

    console.log("✅ Monthly backup sent successfully.");
  } catch (err) {
    console.error("❌ Monthly backup failed:", err.message);
  }
});
