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
    const reports = req.body?.reports || {};
    // 🛡 Khaali data se purani bikri na mite (POS band / galat POS / login nahi hua)
    const vals = (x) => (x && typeof x === "object" ? Object.values(x) : []);
    const hasSale = vals(reports.dish).some((r) => vals(r?.daily_data).some((v) => Number(v?.quantity) > 0)) || vals(reports.footfall).some((v) => Number(v?.total_orders) > 0);
    if (!hasSale) return res.status(422).json({ success: false, message: "No sales in this data - nothing saved (is the POS address right?)" });
    // 🛡 Doosre hotel ka POS na ho: table (space) ke naam pehle wale se milne chahiye
    const names = [...new Set(vals(reports.space).map((r) => String(r?.space_name || "").trim()).filter(Boolean))];
    let known = Array.isArray(doc?.data?.spaces) ? doc.data.spaces : null;
    if (!known) {
      const recent = await mongoose.connection.db.collection("kitchen_pos_daily").find({}, { projection: { "data.space": 1 } }).sort({ _id: -1 }).limit(60).toArray();
      const k = new Set();
      recent.forEach((d) => Object.keys(d?.data?.space || {}).forEach((n) => k.add(n.replace(/·/g, "."))));
      known = [...k];
    }
    if (known.length >= 3 && names.length >= 3) {
      const ks = new Set(known.map((n) => n.replace(/·/g, ".")));
      const hit = names.filter((n) => ks.has(n)).length / names.length;
      if (hit < 0.3) return res.status(409).json({ success: false, message: "This looks like a different hotel's POS (table names do not match) - nothing saved" });
    }
    if (names.length) await mongoose.connection.db.collection("kitchen_docs").updateOne({ _id: "secret/possync" }, { $set: { "data.spaces": [...new Set([...known, ...names])].slice(0, 300) } });
    const r = await importSync(reports, "POS sync");
    lastSync = { at: new Date(), ...r, pc: String(req.body?.pc || "").slice(0, 40) };
    await mongoose.connection.db.collection("kitchen_docs").updateOne({ _id: "secret/possync" }, { $set: { "data.lastSync": lastSync } });
    res.json({ success: true, ...r });
  } catch (e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

export default router;
