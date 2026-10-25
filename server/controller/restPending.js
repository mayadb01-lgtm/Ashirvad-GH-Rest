import { Router } from "express";
import RestPending from "../model/restPending.js";
import { cleanMobile, cleanName, findSimilar, isManagerOrOwner } from "../utils/managerOnly.js";
const router = Router();

// POST /quick-add { fullname, mobileNumber, force } → entry screen se naya "Levana baaki" wala (sirf Manager / malik)
router.post("/quick-add", async (req, res) => {
  try {
    if (!(await isManagerOrOwner(req.user))) return res.status(403).json({ success: false, message: "Only the manager or owner can add a new person. Ask the manager." });
    const b = req.body || {};
    const fullname = cleanName(b.fullname);
    const mobile = cleanMobile(b.mobileNumber);
    if (fullname.length < 2) return res.status(400).json({ success: false, message: "Write the name" });
    if (mobile && !/^[6-9]\d{9}$/.test(mobile)) return res.status(400).json({ success: false, message: "Mobile must be 10 digits (or leave it empty)" });
    const all = await RestPending.find({}, { fullname: 1, mobileNumber: 1, category: 1 }).lean();
    const sim = findSimilar(all, fullname, mobile);
    if (sim.some((s) => s.exact)) return res.status(409).json({ success: false, code: "exists", message: "This person is already in the list", matches: sim });
    if (sim.length && !b.force) return res.status(409).json({ success: false, code: "similar", message: "Similar name already in the list. Is it the same person?", matches: sim });
    const p = await RestPending.create({ fullname, mobileNumber: mobile ? Number(mobile) : 0, category: "Pending" });
    res.json({ success: true, data: { _id: String(p._id), fullname: p.fullname, mobileNumber: p.mobileNumber, category: p.category } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Create a Pending User
router.post("/create-pending-user", async (req, res) => {
  try {
    const reqBody = req.body;

    const staff = await RestPending.create({
      fullname: reqBody.fullname,
      mobileNumber: reqBody.mobileNumber,
      category: reqBody.category,
    });

    res.status(200).json({
      success: true,
      data: staff,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get All Pending Users
router.get("/get-all-pending-users", async (req, res) => {
  try {
    const pendingUsers = await RestPending.find({});

    res.status(200).json({
      success: true,
      data: pendingUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Get All Pending Users - fullname
router.get("/get-all-pending-users-fullname", async (req, res) => {
  try {
    const pendingUsers = await RestPending.find({}, { fullname: 1 });

    res.status(200).json({
      success: true,
      data: pendingUsers,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Update Pending User - Using _id
router.put("/update-pending-user/:id", async (req, res) => {
  try {
    const reqBody = req.body;

    const pendingUser = await RestPending.findByIdAndUpdate(
      req.params.id,
      {
        fullname: reqBody.fullname,
        mobileNumber: reqBody.mobileNumber,
        category: reqBody.category,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: pendingUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Delete a Pending User
router.delete("/remove-pending-user/:id", async (req, res) => {
  try {
    const pendingUser = await RestPending.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: pendingUser,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
