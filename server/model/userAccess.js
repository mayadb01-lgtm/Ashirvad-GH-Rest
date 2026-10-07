import mongoose from "mongoose";

// 🔐 Super Admin har user ka access tay karta hai (naya collection — purane users ke record nahi badalte)
//   modules    : kaun se business ki entry (gh / rest / office / banquet)
//   entryDays  : kitne din peeche tak entry dekh/badal sake (0 = sirf aaj; null = koi bhi din)
//   reports    : kaun si report dekh sake
//   reportDays : report mein kitne din purana data (null = koi rok nahi)
const schema = new mongoose.Schema(
  {
    userId: { type: String, required: true, unique: true },
    modules: [{ type: String, enum: ["gh", "rest", "office", "banquet"] }],
    entryDays: { type: Number, default: 0 },
    reports: [String],
    reportDays: { type: Number, default: 30 },
    updatedBy: { type: String, default: "" },
  },
  { timestamps: true, versionKey: false }
);
export default mongoose.model("UserAccess", schema, "useraccess");
