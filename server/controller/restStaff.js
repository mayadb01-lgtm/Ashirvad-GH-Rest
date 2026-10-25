import { Router } from "express";
import RestStaff from "../model/restStaff.js";
import { cleanMobile, cleanName, findSimilar, isManagerOrOwner, who } from "../utils/managerOnly.js";
const router = Router();

// POST /quick-add { fullname, mobileNumber, force } → entry screen se naya staff (sirf Manager / malik)
router.post("/quick-add", async (req, res) => {
  try {
    if (!(await isManagerOrOwner(req.user))) return res.status(403).json({ success: false, message: "Only the manager or owner can add new staff. Ask the manager." });
    const b = req.body || {};
    const fullname = cleanName(b.fullname);
    const mobile = cleanMobile(b.mobileNumber);
    if (fullname.length < 2) return res.status(400).json({ success: false, message: "Write the staff name" });
    if (!/^[6-9]\d{9}$/.test(mobile)) return res.status(400).json({ success: false, message: "Write a correct 10-digit mobile number" });
    const all = await RestStaff.find({}, { fullname: 1, mobileNumber: 1, category: 1, staffStatus: 1 }).lean();
    const sim = findSimilar(all, fullname, mobile);
    if (sim.some((s) => s.sameMobile)) return res.status(409).json({ success: false, code: "exists", message: "A staff member with this mobile already exists", matches: sim });
    if (sim.length && !b.force) return res.status(409).json({ success: false, code: "similar", message: "Similar name already in the staff list. Is it the same person?", matches: sim });
    const staff = await RestStaff.create({
      fullname,
      mobileNumber: Number(mobile),
      category: "Staff",
      perDayPay: 0, // salary sirf malik set kare (Rest - Manage Staff)
      staffStatus: "Active",
      createDate: new Date().toLocaleDateString(),
      updatedDateTime: new Date().toString(),
    });
    console.log(`staff added by ${who(req)}: ${staff._id}`);
    res.json({ success: true, data: { _id: String(staff._id), fullname: staff.fullname, mobileNumber: staff.mobileNumber, category: staff.category } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Create a new Staff
router.post("/create-staff", async (req, res) => {
  try {
    const reqBody = req.body;

    const staff = await RestStaff.create({
      fullname: reqBody.fullname,
      mobileNumber: reqBody.mobileNumber,
      category: reqBody.category || "Staff",
      perDayPay: reqBody.perDayPay || 0,
      staffStatus: reqBody.staffStatus || "Active",
      createDate: new Date().toLocaleDateString(),
      updatedDateTime: new Date().toString(),
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

// Get Staff All - ID, fullname, Mobile Number
router.get("/get-staff-id-name-mobile", async (req, res) => {
  try {
    // 🔒 Staff ko dusre staff ki per-day salary nahi dikhni chahiye
    const adminLike = req.user && (req.user.constructor?.modelName === "Admin" || req.user.role === "Admin" || req.user.isSuperUser);
    const staff = await RestStaff.find(
      {},
      {
        id: 1,
        fullname: 1,
        mobileNumber: 1,
        category: 1,
        ...(adminLike ? { perDayPay: 1 } : {}),
        staffStatus: 1,
      }
    );

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

// Update Staff - id = ObjectId
router.put("/update-staff/:id", async (req, res) => {
  try {
    const staff = await RestStaff.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
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

// Remove Staff
router.delete("/remove-staff/:id", async (req, res) => {
  try {
    await RestStaff.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;
