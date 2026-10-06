import { Router } from "express";
import { isAuthenticated } from "../middleware/auth.js";
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

// Owner: room ka list rate (roomCost) badlo. Sirf Admin / Super User.
// Purani entries ka rate nahi badalta, sirf aage ki entry mein naya rate aata hai.
router.put("/update-rate/:roomNumber", isAuthenticated, async (req, res) => {
  try {
    if (!(req.user?.role === "Admin" || req.user?.isSuperUser)) {
      return res.status(403).json({ success: false, message: "Sirf owner/admin room rate badal sakta hai" });
    }
    const roomNumber = Number(req.params.roomNumber);
    const roomCost = Number(req.body?.roomCost);
    if (!Number.isFinite(roomCost) || roomCost < 100 || roomCost > 100000) {
      return res.status(400).json({ success: false, message: "Rate ₹100 se ₹1,00,000 ke beech hona chahiye" });
    }
    const room = await Room.findOneAndUpdate({ roomNumber }, { $set: { roomCost: Math.round(roomCost) } }, { new: true });
    if (!room) return res.status(404).json({ success: false, message: `Room ${roomNumber} nahi mila` });
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
