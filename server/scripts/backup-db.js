// Full database backup → server/backups/<db>_<timestamp>/
// Usage (server folder se):
//   node scripts/backup-db.js                 # .env ka DB_URL use karega
//   node scripts/backup-db.js "<mongo-uri>"   # koi aur DB
//
// - SAARE collections export hote hain (sirf models wale nahi)
// - EJSON format: ObjectId, Date, numbers ka type safe rehta hai, isliye
//   restore karne pe data bilkul original jaisa aata hai.
// - Ye script sirf PADHTI hai, DB mein kuch nahi likhti.
import mongoose from "mongoose";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });
const { EJSON } = mongoose.mongo.BSON;

export const backupDatabase = async (uri, label = "") => {
  const conn = await mongoose.createConnection(uri).asPromise();
  const db = conn.db;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const dir = path.join("backups", `${db.databaseName}_${stamp}${label ? "_" + label : ""}`);
  await fs.ensureDir(dir);

  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map((c) => c.name)
    .filter((n) => !n.startsWith("system."));

  const manifest = { database: db.databaseName, createdAt: new Date().toISOString(), collections: {} };
  for (const name of collections) {
    const docs = await db.collection(name).find({}).toArray();
    await fs.writeFile(path.join(dir, `${name}.json`), EJSON.stringify(docs, { relaxed: false }, 2));
    manifest.collections[name] = docs.length;
    console.log(`  ✔ ${name.padEnd(20)} ${docs.length} docs`);
  }
  await fs.writeJson(path.join(dir, "manifest.json"), manifest, { spaces: 2 });
  await conn.close();
  console.log(`\n✅ Backup saved: ${path.resolve(dir)}`);
  return dir;
};

// CLI
if (process.argv[1] && process.argv[1].endsWith("backup-db.js")) {
  const uri = process.argv[2] || process.env.DB_URL;
  if (!uri) {
    console.error("❌ DB_URL nahi mila. .env check karo ya URI argument do.");
    process.exit(1);
  }
  console.log("📦 Backup started...\n");
  backupDatabase(uri)
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("❌ Backup failed:", e.message);
      process.exit(1);
    });
}
