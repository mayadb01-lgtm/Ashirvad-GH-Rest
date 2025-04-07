import { Router } from "express";
import RestPending from "../model/restPending.js";
const router = Router();

// Create a Pending User
router.post("/create-pending-user", async (req, res) => {
  try {
    const reqBody = req.body;

    const staff = await RestPending.create({
      fullname: reqBody.fullname,
      mobileNumber: reqBody.mobileNumber,
      amount: reqBody.amount,
      createDate: reqBody.createDate,
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
        amount: reqBody.amount,
        updatedDateTime: new Date().toString(),
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
