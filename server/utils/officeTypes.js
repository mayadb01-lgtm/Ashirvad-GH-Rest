// Office Book line ka "type" (sirf reports ke hisaab ke liye). Office Book ke records kabhi nahi badalte.
//   business  → asli business kamai / kharch (revenue / expense mein ginta hai)
//   personal  → ghar / personal paisa (In: personal se aaya, Out: personal kharch)
//   loan      → loan / OD mila (In)
//   emi       → loan EMI / loan wapsi / byaaj ke saath (Out)
//   transfer  → apne hi account mein paisa ghumaya (Cash → PP, PP → PPS…) — kamai/kharch nahi
//   recovery  → purana udhaar wapas aaya (Pending) — sale pehle hi gin chuki hai
import OfficeType from "../model/officeType.js";
import AppSetting from "../model/appSetting.js";

export const OFFICE_TYPES = ["business", "personal", "loan", "emi", "transfer", "recovery", "refund"];
export const nk = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();

const TRANSFER_RE = /^(cash|pp|pps|ppc)\s*(to|->|→)\s*(cash|pp|pps|ppc|\d+)\b/i;

export const defaultType = (side, cat, name) => {
  const c = nk(cat);
  if (TRANSFER_RE.test(nk(name))) return "transfer";
  if (side === "in") {
    if (/loan/.test(c)) return "loan";
    if (/personal/.test(c)) return "personal";
    if (/pending/.test(c)) return "recovery";
    return "business";
  }
  // Guest ko paisa wapas (booking cancel / customer return) — kharch nahi, aaye paise ki wapsi
  if (/refund|return|wapas|cancel/.test(nk(name))) return "refund";
  if (/loan/.test(c)) return "emi";
  if (/^personal/.test(c)) return "personal";
  return "business";
};

// Owner ke bataye hue (07-10-2026): ye codes Loan EMI hain; TGT personal len-den hai.
const SEED = [
  ...["BCCH223", "IIFL38", "KSBK49", "LHM31", "TISL20", "TISL7", "LHM7"].map((x) => ({ side: "out", categoryName: "Personal", expenseName: x, type: "emi" })),
  { side: "in", categoryName: "TGT", expenseName: "*", type: "personal" },
];

let seeded = false;
const seedOnce = async () => {
  if (seeded) return;
  const flag = await AppSetting.findById("officeTypesSeeded").lean();
  if (!flag) {
    for (const s of SEED) {
      await OfficeType.updateOne(
        { side: s.side, categoryName: nk(s.categoryName), expenseName: s.expenseName === "*" ? "*" : nk(s.expenseName) },
        { $setOnInsert: { type: s.type, updatedBy: "setup" } },
        { upsert: true }
      );
    }
    await AppSetting.updateOne({ _id: "officeTypesSeeded" }, { $set: { value: true, at: new Date() } }, { upsert: true });
  }
  seeded = true;
};

let cache = null;
let cacheAt = 0;
export const clearOfficeTypeCache = () => {
  cache = null;
};

// classify(side, categoryName, expenseName) → type
export const loadOfficeClassifier = async () => {
  if (!cache || Date.now() - cacheAt > 60_000) {
    await seedOnce();
    const rules = await OfficeType.find({}).lean();
    cache = new Map(rules.map((r) => [`${r.side}|${nk(r.categoryName)}|${r.expenseName === "*" ? "*" : nk(r.expenseName)}`, r.type]));
    cacheAt = Date.now();
  }
  const map = cache;
  return (side, cat, name) =>
    map.get(`${side}|${nk(cat)}|${nk(name)}`) || (TRANSFER_RE.test(nk(name)) ? "transfer" : null) || map.get(`${side}|${nk(cat)}|*`) || defaultType(side, cat, name);
};

// Office Book line ka naam: expenseName (vendor / staff ke liye fullname bhi ho sakta hai)
export const lineName = (x) => x?.expenseName || x?.fullname || "";
