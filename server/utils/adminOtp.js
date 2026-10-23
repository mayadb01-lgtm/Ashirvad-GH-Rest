// 🔐 Super Admin OTP: password ke baad email par 6 ankon ka code
import crypto from "crypto";
import { makeTransport } from "./mailAuth.js";
import AdminOtp from "../model/adminOtp.js";

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest("hex");

// Email set hai tabhi OTP chalu (warna owner khud lock na ho jaye). ADMIN_OTP=off se band bhi kar sakte hain.
export const mailReady = () => !!(process.env.SMPT_MAIL && process.env.SMPT_PASSWORD && (process.env.SMPT_SERVICE || process.env.SMPT_HOST));
export const otpOn = () => process.env.ADMIN_OTP !== "off" && mailReady();

export const maskEmail = (e = "") => {
  const [u, d] = String(e).split("@");
  if (!d) return "";
  return `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
};

export const sendOtp = async (admin, purpose) => {
  const code = String(crypto.randomInt(100000, 1000000));
  // Purane bina use kiye OTP band
  await AdminOtp.updateMany({ adminId: String(admin._id), purpose, used: false }, { $set: { used: true } });
  const doc = await AdminOtp.create({ adminId: String(admin._id), purpose, codeHash: sha(`${admin._id}:${code}`), expiresAt: new Date(Date.now() + 10 * 60 * 1000) });
  const transporter = await makeTransport();
  const name = process.env.VITE_REACT_APP_BUSINESS_NAME || "Ashirvad";
  const what = purpose === "login" ? "login" : "password reset";
  await transporter.sendMail({
    from: `"${name} Security" <${process.env.SMPT_MAIL}>`,
    to: admin.email,
    subject: `${name}: ${code} is your ${what} code`,
    html: `<div style="font-family:Arial,sans-serif;font-size:15px">
      <p>Your ${what} code for <b>${name}</b> Super Admin:</p>
      <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p>
      <p>Valid for 10 minutes. If you did not try to ${what === "login" ? "log in" : "reset the password"}, change your password — someone knows it.</p></div>`,
  });
  return String(doc._id);
};

// true / ya galti ka message
export const checkOtp = async (otpId, adminId, purpose, code) => {
  if (!/^[a-f0-9]{24}$/.test(String(otpId || ""))) return "Code expired. Please start again.";
  const doc = await AdminOtp.findById(otpId);
  if (!doc || doc.used || doc.adminId !== String(adminId) || doc.purpose !== purpose || doc.expiresAt < new Date()) return "Code expired. Please start again.";
  if (doc.tries >= 5) return "Too many wrong codes. Please start again.";
  if (doc.codeHash !== sha(`${adminId}:${String(code || "").trim()}`)) {
    doc.tries += 1;
    await doc.save();
    return "Wrong code";
  }
  doc.used = true;
  await doc.save();
  return true;
};
