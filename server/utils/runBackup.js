// utils/runBackup.js
import fs from "fs-extra";
import path from "path";
import AdmZip from "adm-zip";

const runBackup = async (models) => {
  const backupDir = path.join("backup");
  const backupZipPath = path.join("backup.zip");

  // Ensure backup directory exists and is clean
  await fs.ensureDir(backupDir);
  await fs.emptyDir(backupDir);

  // Remove old ZIP file if it exists
  if (await fs.pathExists(backupZipPath)) {
    await fs.remove(backupZipPath);
    console.log("🗑️ Old backup.zip removed");
  }

  // Loop through models and export data
  for (const model of models) {
    try {
      if (!model || !model.modelName) {
        console.warn("⚠️ Skipping invalid model:", model);
        continue;
      }

      const name = model.modelName;
      const data = await model.find().lean();
      const filePath = path.join(backupDir, `${name}.json`);

      await fs.writeJson(filePath, data, { spaces: 2 });
      console.log(`✅ Backed up: ${name}`);
    } catch (err) {
      console.error(`❌ Failed to backup model: ${model?.modelName}`, err);
    }
  }

  // Zip the backup folder
  const zip = new AdmZip();
  zip.addLocalFolder(backupDir);
  zip.writeZip(backupZipPath);

  console.log("✅ Backup completed and saved as backup.zip");
};

export default runBackup;
