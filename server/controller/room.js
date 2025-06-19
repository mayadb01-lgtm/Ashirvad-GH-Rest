import { Router } from "express";
const router = Router();
import Room from "../model/room.js";

router.get("/", async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    res.status(200).json({
      success: true,
      data: rooms,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
