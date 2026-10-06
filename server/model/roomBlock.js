import mongoose from "mongoose";

// Room calendar ke liye: room band (maintenance / block) aur safai (dirty) status.
// ⚠️ Naye collections ("roomblocks", "roomstatuses"). Purani GH entries ko nahi chhoote.
const roomBlockSchema = new mongoose.Schema(
  {
    roomNo: { type: Number, required: true },
    from: { type: String, required: true }, // DD-MM-YYYY
    to: { type: String, required: true }, // DD-MM-YYYY (is din tak band)
    fromDate: { type: Date },
    toDate: { type: Date },
    reason: { type: String, default: "Maintenance" },
    by: { type: String, default: "" },
  },
  { timestamps: true }
);
roomBlockSchema.index({ toDate: 1, fromDate: 1 });

const roomStatusSchema = new mongoose.Schema(
  {
    roomNo: { type: Number, required: true, unique: true },
    dirty: { type: Boolean, default: false },
    since: { type: Date },
    by: { type: String, default: "" },
  },
  { timestamps: true }
);

export const RoomBlock = mongoose.model("RoomBlock", roomBlockSchema);
export const RoomStatus = mongoose.model("RoomStatus", roomStatusSchema);
