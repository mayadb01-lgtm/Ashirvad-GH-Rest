import mongoose from "mongoose";

// Ek din ki GH entry ek hi baar bane (do phone ek saath Submit / double-click) — chhota sa taala.
// ⚠️ Naya collection ("entrylocks"). Purani entries ko nahi chhoota. Taala save ke baad hat jaata hai.
const entryLockSchema = new mongoose.Schema({ _id: String, at: { type: Date, default: Date.now } }, { versionKey: false });
export default mongoose.model("EntryLock", entryLockSchema, "entrylocks");
