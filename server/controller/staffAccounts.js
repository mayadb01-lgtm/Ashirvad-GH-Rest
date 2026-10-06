// Owner/Admin: staff accounts ka department aur chalu/band set karna
import { Router } from "express";
import User from "../model/user.js";
import { isAdminLike } from "../middleware/staffAccess.js";

const router = Router();
const DEPTS = ["none", "gh", "rest", "office"];

router.use((req, res, next) => {
  if (isAdminLike(req.user) && req.user.constructor?.modelName === "Admin") return next();
  return res.status(403).json({ success: false, message: "Sirf owner/admin" });
});

// GET /api/v1/staff-accounts
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, { name: 1, email: 1, department: 1, isActive: 1, isSuperUser: 1, createdAt: 1 }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: users.map((u) => ({ ...u, department: u.department || "none", isActive: u.isActive !== false })) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT /api/v1/staff-accounts/:id  { department?, isActive? }
router.put("/:id", async (req, res) => {
  try {
    const patch = {};
    if (req.body.department !== undefined) {
      if (!DEPTS.includes(req.body.department)) return res.status(400).json({ success: false, message: "Galat department" });
      patch.department = req.body.department;
    }
    if (req.body.isActive !== undefined) patch.isActive = !!req.body.isActive;
    const u = await User.findByIdAndUpdate(req.params.id, { $set: patch }, { new: true, projection: { name: 1, email: 1, department: 1, isActive: 1, isSuperUser: 1 } });
    if (!u) return res.status(404).json({ success: false, message: "Staff nahi mila" });
    res.json({ success: true, data: u });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
