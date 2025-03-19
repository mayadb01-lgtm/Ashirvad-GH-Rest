import { Router } from "express";
import RestStaff from "../model/restStaff.js";
const router = Router();

// Create a new Staff
router.post("/create-staff", async (req, res) => {
  try {
    const reqBody = req.body;

    const staff = await RestStaff.create({
      fullname: reqBody.fullname,
      mobileNumber: reqBody.mobileNumber,
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
    const staff = await RestStaff.find(
      {},
      { id: 1, fullname: 1, mobileNumber: 1 }
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
