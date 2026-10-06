// Restore a backup folder into a database.
//
// Usage (server folder se):
//   node scripts/restore-db.js --from backups/<folder> --to "<target-mongo-uri>"
//   node scripts/restore-db.js --from backups/<folder> --to "<uri>" --only Entry,restentries
//   node scripts/restore-db.js --from backups/<folder> --to "<LIVE uri>" --yes-production
//
// Safety:
//   1. --to dena compulsory hai (galti se live DB pe restore na ho).
//   2. Agar --to wahi hai jo .env ka DB_URL (live) hai, to --yes-production
//      flag ke bina script ruk jaayegi.
//   3. Restore se PEHLE target DB ka automatic backup liya jaata hai
//      (label "pre-restore"), taaki restore bhi undo ho sake.
import mongoose from "mongoose";
import fs from "fs-extra";
import path from "path";
import dotenv from "dotenv";
import readline from "readline";
import { backupDatabase } from "./backup-db.js";

dotenv.config({ path: "./.env" });
const { EJSON } = mongoose.mongo.BSON;

const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : undefined;
};
const flag = (name) => process.argv.includes(name);
const ask = (q) =>
  new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(q, (a) => {
      rl.close();
      res(a.trim());
    });
  });

const main = async () => {
  const from = arg("--from");
  const to = arg("--to");
  const only = arg("--only")?.split(",").map((s) => s.trim());

  if (!from || !to) {
    console.error("Usage: node scripts/restore-db.js --from backups/<folder> --to \"<mongo-uri>\"");
    process.exit(1);
  }
  if (!(await fs.pathExists(path.join(from, "manifest.json")))) {
    console.error(`❌ ${from} mein manifest.json nahi hai. Sahi backup folder do.`);
    process.exit(1);
  }

  const isLive = process.env.DB_URL && to.trim() === process.env.DB_URL.trim();
  if (isLive && !flag("--yes-production")) {
    console.error("⛔ Target LIVE database hai. Agar sach mein live restore karna hai to --yes-production lagao.");
    process.exit(1);
  }

  const manifest = await fs.readJson(path.join(from, "manifest.json"));
  const names = Object.keys(manifest.collections).filter((n) => !only || only.includes(n));
  console.log(`\nBackup:  ${manifest.database} @ ${manifest.createdAt}`);
  console.log(`Target:  ${isLive ? "⚠️  LIVE DATABASE" : to.replace(/\/\/.*@/, "//***@")}`);
  console.log(`Collections: ${names.map((n) => `${n}(${manifest.collections[n]})`).join(", ")}\n`);
  console.log("Ye collections target mein POORE REPLACE ho jaayenge.");
  const answer = await ask('Continue? Type "RESTORE" to confirm: ');
  if (answer !== "RESTORE") {
    console.log("Cancelled. Kuch nahi badla.");
    process.exit(0);
  }

  console.log("\n🛟 Safety backup of target before restore...");
  await backupDatabase(to, "pre-restore");

  const conn = await mongoose.createConnection(to).asPromise();
  const db = conn.db;
  for (const name of names) {
    const docs = EJSON.parse(await fs.readFile(path.join(from, `${name}.json`), "utf8"), { relaxed: false });
    const exists = (await db.listCollections({ name }).toArray()).length > 0;
    if (exists) await db.collection(name).deleteMany({});
    if (docs.length) await db.collection(name).insertMany(docs, { ordered: false });
    const count = await db.collection(name).countDocuments();
    console.log(`  ✔ ${name.padEnd(20)} ${count} docs ${count === docs.length ? "" : "⚠️ count mismatch"}`);
  }
  await conn.close();
  console.log("\n✅ Restore complete.");
};

main().catch((e) => {
  console.error("❌ Restore failed:", e.message);
  process.exit(1);
});
