// Kharch ke naam ek jaise karna (Tally aur app dono ke liye): "Loundry" = "laundry", "Paneer Wala" = "paneer" ...
const ALIAS = {
  loundry: "laundry", "paneer wala": "paneer", "market expense": "market", "pani botel": "water bottles", "pani bottle": "water bottles",
  "papad bill.": "papad", "papad bill": "papad", "light bill": "electricity", "salary paid": "salaries", salary: "salaries",
  "overtime duty": "overtime payment", "tel dabba": "oil tins", "tv recharge": "tv recharge", "kolsa palsana": "kolsa", "kolsa tandoor": "kolsa",
  "personal sbc": "personal", "kia disel": "kia diesel", "g h": "gh",
};
export const headKey = (s) => {
  const k = String(s || "").toLowerCase().replace(/[.\s]+$/g, "").replace(/\s+/g, " ").trim();
  return ALIAS[k] || k || "not named";
};
export const headLabel = (k) => k.replace(/\b\w/g, (c) => c.toUpperCase());
