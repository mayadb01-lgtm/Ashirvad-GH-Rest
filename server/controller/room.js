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

// Owner: room ka list rate (roomCost) aur type (2 Bed / 3 Bed / Deluxe) badlo. Sirf Admin / Super User.
// Purani entries ka rate nahi badalta, sirf aage ki entry mein naya rate aata hai.
router.put("/update-rate/:roomNumber", isAuthenticated, async (req, res) => {
  try {
    if (!(req.user?.role === "Admin" || req.user?.isSuperUser)) {
      return res.status(403).json({ success: false, message: "Only the owner can change room rates" });
    }
    const roomNumber = Number(req.params.roomNumber);
    const roomCost = Number(req.body?.roomCost);
    if (!Number.isFinite(roomCost) || roomCost < 100 || roomCost > 100000) {
      return res.status(400).json({ success: false, message: "Rate must be between ₹100 and ₹1,00,000" });
    }
    const set = { roomCost: Math.round(roomCost) };
    if (req.body?.roomType !== undefined) {
      const t = String(req.body.roomType).trim().slice(0, 30);
      if (!t) return res.status(400).json({ success: false, message: "Room type cannot be empty" });
      set.roomType = t;
    }
    const room = await Room.findOneAndUpdate({ roomNumber }, { $set: set }, { new: true });
    if (!room) return res.status(404).json({ success: false, message: `Room ${roomNumber} not found` });
    res.status(200).json({ success: true, data: room });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
