import mongoose from "mongoose";

// Chhoti app settings (jaise naya niyam kis tareekh se laagu). ⚠️ Naya collection ("appsettings").
const appSettingSchema = new mongoose.Schema({ _id: String, value: mongoose.Schema.Types.Mixed, at: { type: Date, default: Date.now } }, { versionKey: false });
export default mongoose.model("AppSetting", appSettingSchema, "appsettings");
