import mongoose from "mongoose";

// Room shift / swap ka record (wajah zaroori) + bill merge (group).
// ⚠️ Naye collections ("roommoves", "roomgroups"). Purani GH entries ko nahi chhoote.
const roomMoveSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // DD-MM-YYYY
    period: { type: String, default: "day" },
    type: { type: String, enum: ["shift", "swap"], required: true },
    fromRoom: { type: Number, required: true },
    toRoom: { type: Number, required: true },
    guestFrom: { type: String, default: "" },
    guestTo: { type: String, default: "" },
    reason: { type: String, required: true },
    by: { type: String, default: "" },
  },
  { timestamps: true }
);

const roomGroupSchema = new mongoose.Schema(
  {
    name: { type: String, default: "" }, // party / company ka naam
    mainRoom: { type: Number, required: true },
    rooms: [{ type: Number }], // main ke alawa
    fromDate: { type: String, required: true },
    status: { type: String, enum: ["active", "closed"], default: "active" },
    by: { type: String, default: "" },
    closedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

export const RoomMove = mongoose.model("RoomMove", roomMoveSchema);
export const RoomGroup = mongoose.model("RoomGroup", roomGroupSchema);
