// Hotel PC ka "POS Sync" program yahan roz ki bikri bhejta hai (bina login; malik ki di hui sync key se).
// ⚠️ Sirf kitchen_pos_daily / kitchen_pos_files mein likhta hai. Key ka sirf hash rakha jata hai.
import express, { Router } from "express";
import mongoose from "mongoose";
import crypto from "crypto";
import { importSync } from "../rasoi/posImport.js";

const router = Router();
const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();
export let lastSync = null;

// Browser se bhi bheja ja sake (POS ke page se, text/plain + body mein key) — CORS ki zaroorat nahi
router.post("/", express.text({ type: "text/plain", limit: "15mb" }), async (req, res) => {
  try {
    if (typeof req.body === "string") {
      try {
        req.body = JSON.parse(req.body || "{}");
      } catch {
        return res.status(400).json({ success: false, message: "Bad data" });
      }
    }
    const key = String(req.get("x-sync-key") || req.body?.key || "");
    const doc = await mongoose.connection.db.collection("kitchen_docs").findOne({ _id: "secret/possync" });
    const hash = doc?.data?.hash;
    if (!key || !hash || !crypto.timingSafeEqual(sha(key), Buffer.from(hash, "hex"))) return res.status(401).json({ success: false, message: "Wrong sync key" });
    const r = await importSync(req.body?.reports || {}, "POS sync");
    lastSync = { at: new Date(), ...r, pc: String(req.body?.pc || "").slice(0, 40) };
    await mongoose.connection.db.collection("kitchen_docs").updateOne({ _id: "secret/possync" }, { $set: { "data.lastSync": lastSync } });
    res.json({ success: true, ...r });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

export default router;
