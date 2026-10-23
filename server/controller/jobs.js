// Staff bharti: public apply form (bina login) + Manager ke liye candidate list.
// ⚠️ Sirf naye collection "kitchen_candidates" + kitchen_docs "hiring/main" (khuli jagah). App ka purana data nahi chhoota.
import { Router } from "express";
import mongoose from "mongoose";

export const ROLES = {
  cook_pun: ["पंजाबी कुक", "Punjabi cook"],
  cook_chi: ["चाइनीज़ कुक", "Chinese cook"],
  tandoor: ["तंदूर वाला", "Tandoor cook"],
  cook_guj: ["गुजराती / काठियावाड़ी कुक", "Gujarati / Kathiyawadi cook"],
  cook_fast: ["पिज़्ज़ा-सैंडविच / फ़ास्ट फ़ूड", "Pizza-sandwich / fast food"],
  helper: ["किचन हेल्पर", "Kitchen helper"],
  dish: ["बर्तन धोने वाला", "Dishwasher"],
  captain: ["कैप्टन", "Captain"],
  waiter: ["वेटर", "Waiter"],
  hall: ["हॉल हेल्पर / सफ़ाई", "Hall helper / cleaning"],
  roomboy: ["रूम बॉय (हाउसकीपिंग)", "Room boy (housekeeping)"],
  reception: ["रिसेप्शन", "Reception"],
  other: ["दूसरा काम", "Other"],
};
export const STATUSES = ["new", "called", "interview", "trial", "hired", "no"];

const candSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    roles: [String],
    exp: Number, // saal
    lastPlace: String,
    area: String,
    join: String, // turant / 1 hafta / 1 mahina
    salary: Number, // maangi hui (₹/mahina)
    stay: Boolean, // rehne ki jagah chahiye
    note: String,
    source: { type: String, default: "form" }, // form | manual | referral
    referredBy: String,
    status: { type: String, default: "new" },
    interviewAt: String,
    notes: String, // malik / manager ki baat
    applies: { type: Number, default: 1 },
    at: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    by: String,
  },
  { versionKey: false }
);
candSchema.index({ phone: 1 });
candSchema.index({ at: -1 });
export const Candidate = mongoose.models.KitchenCandidate || mongoose.model("KitchenCandidate", candSchema, "kitchen_candidates");
const KitchenDoc = () => mongoose.models.KitchenDoc;

const clean = (v, max = 80) => String(v ?? "").replace(/[<>\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const num = (v, max) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));
export function candFields(b) {
  return {
    name: clean(b.name, 60),
    phone: String(b.phone || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "").slice(0, 10),
    roles: (Array.isArray(b.roles) ? b.roles : []).map(String).filter((r) => ROLES[r]).slice(0, 5),
    exp: num(b.exp, 50),
    lastPlace: clean(b.lastPlace, 80),
    area: clean(b.area, 60),
    join: clean(b.join, 30),
    salary: num(b.salary, 200000),
    stay: !!b.stay,
    note: clean(b.note, 300),
    referredBy: clean(b.referredBy, 60),
  };
}

const router = Router();
let todayCount = { d: "", n: 0 };

// GET /jobs/open → khuli jagah (public; sirf wahi jo malik ne dikhane ko rakha)
router.get("/open", async (req, res) => {
  try {
    const h = (await KitchenDoc()?.findById("hiring/main").lean())?.data || {};
    const open = Object.entries(h.open || {})
      .filter(([k, v]) => ROLES[k] && Number(v?.n) > 0)
      .map(([k, v]) => ({ key: k, hi: ROLES[k][0], en: ROLES[k][1], n: Number(v.n), salary: h.showSalary ? clean(v.sal, 30) : "" }));
    res.set("Cache-Control", "no-store").json({ success: true, hotel: clean(h.hotel || "Hotel Ashirvad", 60), perks: clean(h.perks, 200), open, roles: Object.entries(ROLES).map(([k, v]) => ({ key: k, hi: v[0], en: v[1] })) });
  } catch (e) {
    res.status(500).json({ success: false, message: "Please try again" });
  }
});

// POST /jobs/apply → candidate khud bhare (public; rate limit security.js mein + yahan spam rok)
router.post("/apply", async (req, res) => {
  try {
    const b = req.body || {};
    if (b.website) return res.json({ success: true }); // honeypot: bots
    if (Date.now() - Number(b.t0 || 0) < 4000) return res.status(400).json({ success: false, message: "Please fill the form again" });
    if (!b.consent) return res.status(400).json({ success: false, message: "Please tick the consent box" });
    const f = candFields(b);
    if (f.name.length < 2) return res.status(400).json({ success: false, message: "Please write your name" });
    if (!/^[6-9]\d{9}$/.test(f.phone)) return res.status(400).json({ success: false, message: "Please write a correct 10-digit mobile number" });
    if (!f.roles.length) return res.status(400).json({ success: false, message: "Please choose the work you want" });
    const d = new Date().toISOString().slice(0, 10);
    if (todayCount.d !== d) todayCount = { d, n: 0 };
    if (++todayCount.n > 300) return res.status(429).json({ success: false, message: "Please try again tomorrow" });
    // Same mobile 60 din mein dobara → nayi line nahi, purani update
    const old = await Candidate.findOne({ phone: f.phone, at: { $gte: new Date(Date.now() - 60 * 864e5) } });
    if (old) {
      Object.assign(old, f, { applies: (old.applies || 1) + 1, updatedAt: new Date(), status: old.status === "no" ? "new" : old.status });
      await old.save();
    } else await Candidate.create({ ...f, source: f.referredBy ? "referral" : "form" });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: "Please try again" });
  }
});

export default router;
