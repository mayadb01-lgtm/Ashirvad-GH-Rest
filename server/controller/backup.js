import { Router } from "express";
import crypto from "crypto";
import BackupLog from "../model/backupLog.js";
import { runAutoBackup } from "../utils/autoBackup.js";

const router = Router();
const isAdminLike = (u) => u && (u.role === "Admin" || u.isSuperUser === true);

// GET /api/v1/backup/status  → pichhle 10 backup (admin)
router.get("/status", async (req, res) => {
  if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Admin only" });
  const logs = await BackupLog.find().sort({ createdAt: -1 }).limit(10).lean();
  const lastGood = logs.find((l) => l.ok) || (await BackupLog.findOne({ ok: true }).sort({ createdAt: -1 }).lean());
  res.json({ success: true, lastGood, logs });
});

// POST /api/v1/backup/run  → abhi backup lo aur email karo (admin)
router.post("/run", async (req, res) => {
  if (!isAdminLike(req.user)) return res.status(403).json({ success: false, message: "Admin only" });
  const log = await runAutoBackup("manual");
  res.status(log.ok ? 200 : 500).json({ success: log.ok, log, message: log.ok ? "Backup emailed" : log.error });
});

// GET /api/v1/backup/run-scheduled?key=SECRET
// Bahar ki free cron service (cron-job.org) roz is link ko kholegi, taaki
// server so bhi raha ho to backup ho jaaye. Secret key ke bina kuch nahi hota.
router.get("/run-scheduled", async (req, res) => {
  const expected = process.env.BACKUP_CRON_KEY || "";
  const given = String(req.query.key || "");
  const ok =
    expected.length >= 16 &&
    given.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
  if (!ok) return res.status(401).json({ success: false, message: "Invalid key" });

  // 6 ghante mein ek se zyada nahi
  const recent = await BackupLog.findOne({ ok: true, createdAt: { $gte: new Date(Date.now() - 6 * 3600000) } }).lean();
  if (recent) return res.json({ success: true, message: "Recent backup already exists, skipped" });

  const log = await runAutoBackup("external");
  res.status(log.ok ? 200 : 500).json({ success: log.ok, message: log.ok ? "Backup emailed" : log.error });
});

export default router;
