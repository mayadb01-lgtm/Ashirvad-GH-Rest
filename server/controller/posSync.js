import mongoose from "mongoose";
import { importSync } from "../rasoi/posImport.js";

// POS report bundle of the hotel PC ("pos_reports": dates, dish, category, space, spacetype, footfall, perperson).
// No route any more: the hotel PC never sends anything to Rad Shiva. The super admin's "Import from cashier PC"
// (controller/hotelPcPull.js) fetches it and calls applyPosReports(). Writes only kitchen_pos_daily / kitchen_pos_files.
export const applyPosReports = async (reports, pc) => {
  reports = reports && typeof reports === "object" ? reports : {};
  // 🛡 Khaali data se purani bikri na mite (POS band / galat POS)
  const vals = (x) => (x && typeof x === "object" ? Object.values(x) : []);
  const hasSale = vals(reports.dish).some((r) => vals(r?.daily_data).some((v) => Number(v?.quantity) > 0)) || vals(reports.footfall).some((v) => Number(v?.total_orders) > 0);
  if (!hasSale) return { saved: false, message: "No POS sales in these days - nothing saved" };
  // 🛡 Doosre hotel ka POS na ho: table (space) ke naam pehle wale se milne chahiye
  const names = [...new Set(vals(reports.space).map((r) => String(r?.space_name || "").trim()).filter(Boolean))];
  const recent = await mongoose.connection.db.collection("kitchen_pos_daily").find({}, { projection: { "data.space": 1 } }).sort({ _id: -1 }).limit(60).toArray();
  const k = new Set();
  recent.forEach((d) => Object.keys(d?.data?.space || {}).forEach((n) => k.add(n.replace(/·/g, "."))));
  if (k.size >= 3 && names.length >= 3) {
    const hit = names.filter((n) => k.has(n)).length / names.length;
    if (hit < 0.3) return { saved: false, message: "This looks like a different hotel's POS (table names do not match) - nothing saved" };
  }
  const r = await importSync(reports, `Import from cashier PC${pc ? ` (${String(pc).slice(0, 40)})` : ""}`);
  return { saved: true, ...r };
};
