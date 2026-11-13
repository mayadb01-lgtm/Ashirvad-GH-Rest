// Makes the key for "Import from cashier PC" (controller/hotelPcPull.js).
// Run it ON THE RAD SHIVA SERVER, in the server folder:
//
//   node scripts/make-pull-key.js              # writes HOTEL_PC_PULL_KEY into ./.env
//   node scripts/make-pull-key.js <env file>   # another .env file
//
// - The plain key goes ONLY into the .env file (HOTEL_PC_PULL_KEY=...). An old key there is replaced.
// - It prints the key and its SHA-256. Only the SHA-256 goes to the hotel PC:
//     bin/rails runner script/radshiva_pull_setup.rb <sha256>
//   The plain key never goes to the hotel PC, into git, a chat or a message.
// - Restart the server afterwards so it reads the new key.
import crypto from "crypto";
import fs from "fs";
import path from "path";

const file = path.resolve(process.argv[2] || "./.env");
const key = crypto.randomBytes(32).toString("base64url");
const sha = crypto.createHash("sha256").update(key).digest("hex");

const old = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const lines = old.split(/\r?\n/).filter((l, i, a) => !(i === a.length - 1 && l === ""));
const at = lines.findIndex((l) => /^\s*HOTEL_PC_PULL_KEY\s*=/.test(l));
const line = `HOTEL_PC_PULL_KEY=${key}`;
if (at >= 0) lines[at] = line;
else lines.push(line);
fs.writeFileSync(file, lines.join("\n") + "\n", { mode: 0o600 });

console.log(`Saved HOTEL_PC_PULL_KEY in ${file}${at >= 0 ? " (the old key there is replaced)" : ""}.`);
console.log("");
console.log(`Plain key (stays in that file only): ${key}`);
console.log(`SHA-256 (give ONLY this to the hotel PC): ${sha}`);
console.log("");
console.log("On the hotel PC:  bin/rails runner script/radshiva_pull_setup.rb " + sha);
console.log("Then restart this server so it reads the new key.");
if (!/^\s*HOTEL_PC_PULL_URL\s*=/m.test(old)) console.log("Also set HOTEL_PC_PULL_URL in the same file (e.g. https://<vps>/shop/api/radshiva/pull).");
