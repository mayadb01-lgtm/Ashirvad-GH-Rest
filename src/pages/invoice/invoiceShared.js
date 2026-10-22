// Invoice ke common hisaab / details (frontend). Server bhi yahi hisaab dobara karta hai.
// Hotel ka naam / pata / GSTIN: src/business.js (har business ki apni)
import { BUSINESS } from "../../business";
export const HOTEL = BUSINESS;

export const BUSINESSES = ["Guest House", "Restaurant", "Banquet Hall", "Other"];
export const TAX_RATES = [0, 5, 12, 18, 28];
export const PAY_MODES = ["Cash", "Card", "UPI", "PPS", "PPC", "Bank transfer", "Credit (pay later)"];
export const SAC_OPTIONS = [
  { sac: "996311", label: "996311 · Room / accommodation" },
  { sac: "996331", label: "996331 · Restaurant food" },
  { sac: "997212", label: "997212 · Hall / banquet rent" },
  { sac: "996334", label: "996334 · Outdoor catering" },
];
export const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
export const STATE_CODES = {
  "01": "Jammu and Kashmir", "02": "Himachal Pradesh", "03": "Punjab", "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
  "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh", 10: "Bihar", 11: "Sikkim", 12: "Arunachal Pradesh", 13: "Nagaland",
  14: "Manipur", 15: "Mizoram", 16: "Tripura", 17: "Meghalaya", 18: "Assam", 19: "West Bengal", 20: "Jharkhand", 21: "Odisha",
  22: "Chhattisgarh", 23: "Madhya Pradesh", 24: "Gujarat", 26: "Dadra and Nagar Haveli and Daman and Diu", 27: "Maharashtra",
  29: "Karnataka", 30: "Goa", 31: "Lakshadweep", 32: "Kerala", 33: "Tamil Nadu", 34: "Puducherry", 35: "Andaman and Nicobar Islands",
  36: "Telangana", 37: "Andhra Pradesh", 38: "Ladakh",
};

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;

export const calcItem = (it, inclusive, gst) => {
  const qty = Math.max(0, Number(it.qty) || 0);
  const rate = Math.max(0, Number(it.rate) || 0);
  const taxRate = gst ? Number(it.taxRate) || 0 : 0;
  const gross = qty * rate;
  const taxable = inclusive && taxRate ? gross / (1 + taxRate / 100) : gross;
  const tax = (taxable * taxRate) / 100;
  return { ...it, taxRate, taxable: r2(taxable), cgst: r2(tax / 2), sgst: r2(tax / 2), total: r2(taxable + tax) };
};

export const calcTotals = (items, inclusive, gst) => {
  const rows = items.map((it) => calcItem(it, inclusive, gst));
  const taxable = r2(rows.reduce((s, x) => s + x.taxable, 0));
  const cgst = r2(rows.reduce((s, x) => s + x.cgst, 0));
  const sgst = r2(rows.reduce((s, x) => s + x.sgst, 0));
  const exact = taxable + cgst + sgst;
  const grandTotal = Math.round(exact);
  return { rows, taxable, cgst, sgst, roundOff: r2(grandTotal - exact), grandTotal };
};

export const money = (n) => (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Rupees in words (Indian system)
const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
const two = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? " " + ONES[n % 10] : ""}`);
const three = (n) => (n >= 100 ? `${ONES[Math.floor(n / 100)]} Hundred${n % 100 ? " " + two(n % 100) : ""}` : two(n));
export const inWords = (amount) => {
  let n = Math.round(Number(amount) || 0);
  if (!n) return "Rupees Zero Only";
  const parts = [];
  const crore = Math.floor(n / 1e7);
  n %= 1e7;
  const lakh = Math.floor(n / 1e5);
  n %= 1e5;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${three(crore)} Crore`);
  if (lakh) parts.push(`${two(lakh)} Lakh`);
  if (thousand) parts.push(`${two(thousand)} Thousand`);
  if (n) parts.push(three(n));
  return `Rupees ${parts.join(" ")} Only`;
};
