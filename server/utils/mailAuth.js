// Email (Gmail) ka login: malik app se Gmail "App Password" daal sakta hai (encrypt hokar DB mein).
// App wala na ho to purana server env wala chalta hai. Password kabhi wapas screen par nahi bheja jaata.
import crypto from "crypto";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

const DOC = "secret/smtp";
const col = () => mongoose.connection.db.collection("kitchen_docs");
const key = () => crypto.createHash("sha256").update("smtp-app-password:" + (process.env.JWT_SECRET_KEY || "")).digest();

const enc = (s) => {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([c.update(String(s), "utf8"), c.final()]);
  return [iv, c.getAuthTag(), ct].map((b) => b.toString("base64")).join(".");
};
const dec = (v) => {
  const [iv, tag, ct] = String(v).split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
};

export const mailUser = () => process.env.SMPT_MAIL || "";

// { user, pass, src: "app" | "env" }
export async function mailAuth() {
  try {
    const d = (await col().findOne({ _id: DOC }))?.data;
    if (d?.pass) return { user: mailUser(), pass: dec(d.pass), src: "app" };
  } catch {
    /* env par chalo */
  }
  return { user: mailUser(), pass: process.env.SMPT_PASSWORD, src: "env" };
}

export async function makeTransport(auth) {
  const a = auth || (await mailAuth());
  return nodemailer.createTransport({
    host: process.env.SMPT_HOST,
    port: process.env.SMPT_PORT,
    service: process.env.SMPT_SERVICE,
    auth: { user: a.user, pass: a.pass },
  });
}

// Naya App Password: pehle Gmail se check, sahi ho tabhi save
export async function saveAppPassword(raw, by) {
  const pass = String(raw || "").replace(/\s+/g, "");
  if (!/^[a-z]{16}$/i.test(pass)) {
    const e = new Error("App Password has 16 letters (like abcd efgh ijkl mnop). Please copy it again from Google.");
    e.status = 400;
    throw e;
  }
  if (!mailUser()) {
    const e = new Error("Sender Gmail is not set on the server.");
    e.status = 400;
    throw e;
  }
  const t = await makeTransport({ user: mailUser(), pass });
  try {
    await t.verify();
  } catch (err) {
    const e = new Error(/535|BadCredentials|not accepted/i.test(err.message) ? `Google did not accept this App Password for ${maskMail(mailUser())}. Create it while logged in to that Gmail.` : "Could not reach Gmail: " + err.message);
    e.status = 400;
    throw e;
  }
  await col().updateOne({ _id: DOC }, { $set: { col: "secret", data: { pass: enc(pass) }, by: String(by || ""), at: new Date() } }, { upsert: true });
  return true;
}

export const maskMail = (m) => {
  const [u, d] = String(m || "").split("@");
  if (!d) return "";
  return `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
};

export async function mailInfo() {
  let at = null;
  try {
    at = (await col().findOne({ _id: DOC }, { projection: { at: 1 } }))?.at || null;
  } catch {
    /* */
  }
  return { sender: maskMail(mailUser()), appPasswordSetAt: at };
}
