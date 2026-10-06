// Automatic full-database backup → backup.zip → email.
// - Saare collections (sirf models wale nahi), EJSON format (restore-db.js se seedha restore ho sake)
// - Roz raat 2:00 AM (India time) chalta hai, koi extra package nahi chahiye
// - Server so gaya ho (free hosting) to bhi: start hote hi check karta hai ki
//   pichhla backup 26 ghante se purana to nahi, purana ho to turant le leta hai
import mongoose from "mongoose";
import AdmZip from "adm-zip";
import fs from "fs-extra";
import sendMailWithAttachment from "./sendMail.js";
import BackupLog from "../model/backupLog.js";

const { EJSON } = mongoose.mongo.BSON;
const ZIP_PATH = "backup.zip";
const IST_OFFSET_MIN = 330; // UTC+5:30
const RUN_HOUR_IST = Number(process.env.BACKUP_HOUR_IST ?? 2);
let running = false;

export const createBackupZip = async () => {
  const db = mongoose.connection.db;
  if (!db) throw new Error("Database not connected");
  const zip = new AdmZip();
  const names = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."));
  const manifest = { database: db.databaseName, createdAt: new Date().toISOString(), collections: {} };
  for (const name of names) {
    const docs = await db.collection(name).find({}).toArray();
    zip.addFile(`${name}.json`, Buffer.from(EJSON.stringify(docs, { relaxed: false })));
    manifest.collections[name] = docs.length;
  }
  zip.addFile("manifest.json", Buffer.from(JSON.stringify(manifest, null, 2)));
  zip.writeZip(ZIP_PATH);
  const { size } = await fs.stat(ZIP_PATH);
  return { manifest, sizeKB: Math.round(size / 1024) };
};

export const runAutoBackup = async (trigger = "manual") => {
  if (running) return { ok: false, error: "A backup is already running" };
  running = true;
  const started = Date.now();
  let log = { trigger, ok: false, collections: {}, sizeKB: 0 };
  try {
    const { manifest, sizeKB } = await createBackupZip();
    log.collections = manifest.collections;
    log.sizeKB = sizeKB;
    await sendMailWithAttachment();
    log.ok = true;
    log.emailedTo = process.env.SMPT_MAIL_RECEIVER || "";
    console.log(`✅ Backup (${trigger}) emailed, ${sizeKB} KB`);
  } catch (err) {
    log.error = err.message;
    console.error(`❌ Backup (${trigger}) failed:`, err.message);
  } finally {
    log.durationMs = Date.now() - started;
    await fs.remove(ZIP_PATH).catch(() => {}); // customer data server pe pada na rahe
    running = false;
    try {
      await BackupLog.create(log);
    } catch (e) {
      console.error("Could not save backup log:", e.message);
    }
  }
  return log;
};

const msUntilNextRun = () => {
  const now = new Date();
  const ist = new Date(now.getTime() + IST_OFFSET_MIN * 60000);
  const next = new Date(ist);
  next.setUTCHours(RUN_HOUR_IST, 0, 0, 0);
  if (next <= ist) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - ist.getTime();
};

export const startBackupScheduler = () => {
  if ((process.env.AUTO_BACKUP || "on").toLowerCase() === "off") {
    console.log("⏸️  Auto backup is OFF (AUTO_BACKUP=off)");
    return;
  }
  const scheduleNext = () => {
    const wait = msUntilNextRun();
    console.log(`🗓️  Next auto backup in ${(wait / 3600000).toFixed(1)} hours`);
    setTimeout(async () => {
      await runAutoBackup("schedule");
      scheduleNext();
    }, wait).unref();
  };
  scheduleNext();

  // Catch-up: server soya hua tha to chhoota hua backup abhi le lo
  setTimeout(async () => {
    try {
      const last = await BackupLog.findOne({ ok: true }).sort({ createdAt: -1 }).lean();
      const age = last ? Date.now() - new Date(last.createdAt).getTime() : Infinity;
      if (age > 26 * 3600000) {
        console.log("⏰ Last good backup is old/missing, taking one now");
        await runAutoBackup("schedule");
      }
    } catch (e) {
      console.error("Backup catch-up check failed:", e.message);
    }
  }, 2 * 60000).unref();
};
