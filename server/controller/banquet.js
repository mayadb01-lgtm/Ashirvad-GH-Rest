// 🎉 Banquet: package (menu), booking, billing, payments + owner ke liye menu planning / reports
// ⚠️ Sirf naye collections (banquet*) likhta hai. Purane records nahi chhedta.
// User side (Office staff): package naam + per plate rate, booking, bill, payment.
// Backend (sirf owner): item ka rate, per person gram, package ka cost, kitchen quantity, reports.
import { Router } from "express";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat.js";
import { BanquetItem, BanquetPackage, BanquetAddon, BanquetHall, BanquetBooking, banquetTotals } from "../model/banquet.js";
import AppSetting from "../model/appSetting.js";
import { allowedStaffDates, isAdminLike, dateOk as staffDateOk } from "../middleware/staffAccess.js";
import { HALL_NAME } from "../business.js";

dayjs.extend(customParseFormat);
const router = Router();
const F = "DD-MM-YYYY";
const IST_MS = 330 * 60 * 1000;
const todayIst = () => dayjs(new Date(Date.now() + IST_MS).toISOString().slice(0, 10)).format(F);
const bad = (res, message, code = 400) => res.status(code).json({ success: false, message });
const fail = (res, e) => res.status(500).json({ success: false, message: e.message });
const who = (req) => req.user?.name || req.user?.email || "";
const n = (v) => Number(v) || 0;
const clean = (v, max = 120) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const valid = (d) => dayjs(d, F, true).isValid();
const admin = (req) => isAdminLike(req.user);
const ownerOrReport = (req, res, next) => (admin(req) || req.reportOk === "banquet-report" ? next() : bad(res, "Only the owner can do this", 403));
const ownerOnly = (req, res, next) => (admin(req) ? next() : bad(res, "Only the owner can do this", 403));
const SLOTS = ["Breakfast", "Lunch", "Hi-Tea", "Dinner", "Full day"];
const MODES = ["Cash", "PP", "PPS", "PPC", "Card"];

/* ───────── Pehli baar: owner ki sheet (Calculator BQ Quotation) se shuruaati data ───────── */
const SEED_ITEMS = [
  // [category, name, price per kg/litre, default gram per person]
  ["Beverage", "Tea", 100, 50], ["Beverage", "Coffee", 120, 50], ["Beverage", "Milk", 160, 0],
  ["Beverage", "Soft drink", 52, 200], ["Beverage", "Buttermilk", 40, 200], ["Beverage", "Shakes", 80, 0], ["Beverage", "Mocktail", 60, 150],
  ["Breakfast - Gujarati", "Dal pakvan", 300, 150], ["Breakfast - Gujarati", "Jalebi", 300, 100], ["Breakfast - Gujarati", "Fafda", 300, 100],
  ["Breakfast - Gujarati", "Samosa", 300, 100], ["Breakfast - Gujarati", "Methi gota", 400, 100], ["Breakfast - Gujarati", "Patra", 300, 100],
  ["Breakfast - Gujarati", "Dhokla", 300, 150], ["Breakfast - Gujarati", "Edla", 200, 100], ["Breakfast - Gujarati", "Aloo paratha", 200, 100], ["Breakfast - Gujarati", "Thepla", 300, 100],
  ["Breakfast - South Indian", "Idli sambhar", 180, 150], ["Breakfast - South Indian", "Dosa", 180, 150], ["Breakfast - South Indian", "Upma", 180, 150],
  ["Breakfast - South Indian", "Uttapam", 180, 150], ["Breakfast - South Indian", "Vada sambhar", 180, 150],
  ["Breakfast - Marathi", "Poha", 210, 150], ["Breakfast - Marathi", "Misal pav", 180, 150],
  ["Breakfast - Fast food", "Bread butter", 200, 150], ["Breakfast - Fast food", "Bread jam", 200, 150], ["Breakfast - Fast food", "Toast", 200, 100], ["Breakfast - Fast food", "Veg sandwich", 400, 150],
  ["Starter", "Khaman / dhokla", 300, 100], ["Starter", "Soup", 250, 100], ["Starter", "Manchurian dry", 350, 100], ["Starter", "Paneer starter", 450, 100],
  ["Starter", "Crispy potato starter", 150, 100], ["Starter", "Veg Chinese nugget", 250, 100],
  ["Veg curry", "Ringan bharthu", 320, 100], ["Veg curry", "Sev tameta", 300, 100], ["Veg curry", "Undhiyu", 400, 100], ["Veg curry", "Mix veg", 400, 100],
  ["Veg curry", "PTM", 420, 100], ["Veg curry", "PBM", 420, 100], ["Veg curry", "Veg handi", 400, 130], ["Veg curry", "Paneer maharaja", 450, 100], ["Veg curry", "Veg raita", 150, 100],
  ["Indian bread", "Chapati", 280, 180], ["Indian bread", "Rotla / puri", 320, 150], ["Indian bread", "Tandoori roti", 320, 150],
  ["Rice", "Bhat / khichdi", 150, 120], ["Rice", "Jeera rice", 150, 100], ["Rice", "Veg pulao", 150, 100],
  ["Dal", "Dal kadhi", 300, 100], ["Dal", "Dal fry", 300, 100], ["Dal", "Dal bukhara", 300, 100],
  ["Salad / papad", "Roasted papad, salad", 200, 60],
  ["Dessert", "Gulab jamun / Mohanthal", 330, 100], ["Dessert", "Shrikhand", 300, 80], ["Dessert", "Shahi kheer", 300, 100],
];
// Package = hisse (sections). Har hisse mein se customer "pick" item chunta hai; har chune item ke "grams" per person.
// [label, pick, grams, [options]]
const SEED_PACKAGES = [
  ["Breakfast", "Breakfast", [
    ["Hot beverage", 2, 50, ["Tea", "Coffee", "Milk"]],
    ["Breakfast items", 2, 150, ["Dal pakvan", "Jalebi", "Fafda", "Samosa", "Methi gota", "Patra", "Dhokla", "Thepla", "Aloo paratha", "Idli sambhar", "Dosa", "Upma", "Uttapam", "Vada sambhar", "Poha", "Misal pav", "Bread butter", "Bread jam", "Veg sandwich"]],
  ]],
  // Sheet ke Lunch/Dinner plan weight ke hisab se: Silver ≈ 900 gm, Gold ≈ 1100 gm, Platinum ≈ 1200 gm per person (owner 08-10-2026)
  ["Silver", "Lunch", [
    ["Welcome drink", 1, 150, ["Soft drink", "Buttermilk"]],
    ["Starter / farsan", 1, 100, ["Khaman / dhokla", "Crispy potato starter", "Veg Chinese nugget"]],
    ["Sabji", 1, 150, ["Ringan bharthu", "Sev tameta", "Mix veg", "Veg handi", "Undhiyu"]],
    ["Bread", 1, 180, ["Chapati", "Rotla / puri"]],
    ["Rice", 1, 120, ["Bhat / khichdi", "Jeera rice", "Veg pulao"]],
    ["Dal / kadhi", 1, 100, ["Dal kadhi", "Dal fry"]],
    ["Salad / papad", 1, 50, ["Roasted papad, salad"]],
    ["Sweet", 1, 80, ["Gulab jamun / Mohanthal", "Shahi kheer"]],
  ]],
  ["Gold", "Lunch", [
    ["Welcome drink", 1, 200, ["Soft drink", "Buttermilk", "Mocktail"]],
    ["Starter / farsan", 1, 120, ["Khaman / dhokla", "Soup", "Manchurian dry", "Crispy potato starter", "Veg Chinese nugget", "Paneer starter"]],
    ["Sabji", 2, 100, ["Ringan bharthu", "Sev tameta", "Undhiyu", "Mix veg", "PTM", "PBM", "Veg handi", "Paneer maharaja"]],
    ["Bread", 1, 200, ["Chapati", "Rotla / puri", "Tandoori roti"]],
    ["Rice", 1, 120, ["Bhat / khichdi", "Jeera rice", "Veg pulao"]],
    ["Dal / kadhi", 1, 100, ["Dal kadhi", "Dal fry", "Dal bukhara"]],
    ["Salad / papad", 1, 60, ["Roasted papad, salad"]],
    ["Sweet", 1, 100, ["Gulab jamun / Mohanthal", "Shrikhand", "Shahi kheer"]],
  ]],
  ["Platinum", "Lunch", [
    ["Drinks", 2, 100, ["Soft drink", "Buttermilk", "Mocktail", "Shakes"]],
    ["Soup", 1, 100, ["Soup"]],
    ["Starter / farsan", 1, 100, ["Khaman / dhokla", "Manchurian dry", "Paneer starter", "Crispy potato starter", "Veg Chinese nugget"]],
    ["Sabji", 2, 100, ["Ringan bharthu", "Sev tameta", "Undhiyu", "Mix veg", "PTM", "PBM", "Veg handi", "Paneer maharaja"]],
    ["Bread", 2, 100, ["Chapati", "Rotla / puri", "Tandoori roti"]],
    ["Rice", 1, 100, ["Bhat / khichdi", "Jeera rice", "Veg pulao"]],
    ["Dal / kadhi", 1, 100, ["Dal kadhi", "Dal fry", "Dal bukhara"]],
    ["Salad / papad", 1, 60, ["Roasted papad, salad"]],
    ["Sweet", 2, 70, ["Gulab jamun / Mohanthal", "Shrikhand", "Shahi kheer"]],
  ]],
];
const MIN_PLATES = 50; // owner 08-10-2026: kam se kam 50 person
const buildPackages = (byName) =>
  SEED_PACKAGES.map(([name, meal, secs], i) => {
    const sections = secs.map(([label, pick, grams, opts]) => ({ label, pick, grams, options: opts.filter((o) => byName[o]).map((o) => ({ itemId: String(byName[o]._id), name: o, category: byName[o].category })) }));
    return { name, meal, sections, items: [], pricePerPlate: Math.round(rateRange({ sections }, Object.fromEntries(Object.values(byName).map((x) => [String(x._id), x.pricePerKg]))).max), minPlates: MIN_PLATES, sort: i };
  });
const SEED_ADDONS = [
  ["Stage 15' x 10'", 8000], ["Red carpet entry", 5000], ["Mandap 70' x 90'", 50000], ["Decoration (basic balloon)", 5000], ["VIP sofa (4 + 2 seating)", 4000],
  ["Chairs with cover", 3000], ["Projector", 1500], ["Sound", 1500], ["Lighting", 1000], ["Washroom", 1000], ["Parking", 1000],
];
let seeded = false;
const seedOnce = async () => {
  if (seeded) return;
  const flag = await AppSetting.findById("banquetSeeded").lean();
  if (!flag) {
    const items = await BanquetItem.insertMany(SEED_ITEMS.map(([category, name, pricePerKg, defaultGrams], i) => ({ category, name, pricePerKg, defaultGrams, unit: category === "Beverage" ? "litre" : "kg", sort: i })));
    const byName = Object.fromEntries(items.map((x) => [x.name, x]));
    await BanquetPackage.insertMany(buildPackages(byName));
    await AppSetting.updateOne({ _id: "banquetPackagesV2" }, { $set: { value: true, at: new Date() } }, { upsert: true });
    await AppSetting.updateOne({ _id: "banquetPackagesTiers" }, { $set: { value: true, at: new Date() } }, { upsert: true });
    await BanquetAddon.insertMany(SEED_ADDONS.map(([name, price], i) => ({ name, price, unit: "fixed", sort: i })));
    await BanquetHall.create({ name: HALL_NAME, rentPerHour: 2500, rentPerDay: 0, minHours: 3 });
    await AppSetting.updateOne({ _id: "banquetSeeded" }, { $set: { value: true, at: new Date() } }, { upsert: true });
  }
  // V2 (owner 08-10-2026): Diwali Dinner hatao, har package mein selection ke options. Purane (fix item wale) package band, naye jodo.
  const v2 = await AppSetting.findById("banquetPackagesV2").lean();
  if (!v2) {
    await BanquetPackage.updateMany({ $or: [{ sections: { $exists: false } }, { sections: { $size: 0 } }] }, { $set: { active: false } });
    const items = await BanquetItem.find({}).lean();
    await BanquetPackage.insertMany(buildPackages(Object.fromEntries(items.map((x) => [x.name, x]))));
    await AppSetting.updateOne({ _id: "banquetPackagesV2" }, { $set: { value: true, at: new Date() } }, { upsert: true });
  }
  // V3 (owner 08-10-2026): har package mein minimum 50 person
  const v3 = await AppSetting.findById("banquetMinPlates50").lean();
  if (!v3) {
    await BanquetPackage.updateMany({ minPlates: { $lt: MIN_PLATES } }, { $set: { minPlates: MIN_PLATES } });
    await AppSetting.updateOne({ _id: "banquetMinPlates50" }, { $set: { value: true, at: new Date() } }, { upsert: true });
  }
  // Owner 08-10-2026: Silver / Gold / Platinum (sheet ke 900 / 1100 / 1200 gm plan). Gujarati / Punjabi wale band, Breakfast waisa hi.
  const v5 = await AppSetting.findById("banquetPackagesTiers").lean();
  if (!v5) {
    const keep = SEED_PACKAGES.map(([name]) => name);
    await BanquetPackage.updateMany({ name: { $nin: keep } }, { $set: { active: false } });
    const have = new Set((await BanquetPackage.find({ active: true }, { name: 1 }).lean()).map((x) => x.name));
    const items = await BanquetItem.find({}).lean();
    const add = buildPackages(Object.fromEntries(items.map((x) => [x.name, x]))).filter((p) => !have.has(p.name));
    if (add.length) await BanquetPackage.insertMany(add);
    await AppSetting.updateOne({ _id: "banquetPackagesTiers" }, { $set: { value: true, at: new Date() } }, { upsert: true });
  }
  // Owner: package ke naam mein gram nahi (andar ki baat) — "Silver (≈900 gm)" → "Silver"
  for (const t of ["Silver", "Gold", "Platinum"]) await BanquetPackage.updateMany({ name: new RegExp(`^${t} \\(`) }, { $set: { name: t } });
  // Owner 08-10-2026: hall rent ₹2,500 / hour, per day wala band
  const v4 = await AppSetting.findById("banquetHallRent2500").lean();
  if (!v4) {
    await BanquetHall.updateMany({ name: HALL_NAME }, { $set: { rentPerHour: 2500 } });
    await BanquetHall.updateMany({}, { $set: { rentPerDay: 0 } });
    await AppSetting.updateOne({ _id: "banquetHallRent2500" }, { $set: { value: true, at: new Date() } }, { upsert: true });
  }
  seeded = true;
};

// Sheet ka rate / plate (item rate × gram): sabse sasta chunav (min) se sabse mehnga (max)
function rateRange(pkg, priceById) {
  let min = 0;
  let max = 0;
  let grams = 0;
  (pkg.items || []).forEach((x) => {
    const v = (n(priceById[x.itemId]) * n(x.grams)) / 1000;
    min += v;
    max += v;
    grams += n(x.grams);
  });
  (pkg.sections || []).forEach((s) => {
    const prices = (s.options || []).map((o) => n(priceById[o.itemId])).sort((a, b) => a - b);
    const k = Math.min(n(s.pick) || 1, prices.length);
    min += (prices.slice(0, k).reduce((t, v) => t + v, 0) * n(s.grams)) / 1000;
    max += (prices.slice(-k).reduce((t, v) => t + v, 0) * n(s.grams)) / 1000;
    grams += k * n(s.grams);
  });
  return { min: Math.round(min * 100) / 100, max: Math.round(max * 100) / 100, grams };
}
// Package ka sheet rate (aaj ke item rate se) — sirf owner ko
const withCost = (pkg, priceById) => {
  const r = rateRange(pkg, priceById);
  return { ...pkg, costPerPlate: r.max, rateMin: r.min, rateMax: r.max, gramsPerPerson: r.grams };
};

/* ───────── Setup (masters) ───────── */
router.get("/setup", async (req, res) => {
  try {
    await seedOnce();
    const [items, packages, addons, halls] = await Promise.all([
      BanquetItem.find({}).sort({ sort: 1, name: 1 }).lean(),
      BanquetPackage.find({}).sort({ sort: 1, name: 1 }).lean(),
      BanquetAddon.find({}).sort({ sort: 1, name: 1 }).lean(),
      BanquetHall.find({}).sort({ name: 1 }).lean(),
    ]);
    if (admin(req)) {
      const priceById = Object.fromEntries(items.map((x) => [String(x._id), x.pricePerKg]));
      return res.json({ success: true, data: { items, packages: packages.map((p) => withCost(p, priceById)), addons, halls, isOwner: true } });
    }
    // Staff: sirf package naam, item naam (gram / cost nahi), rate
    res.json({
      success: true,
      data: {
        packages: packages
          .filter((p) => p.active)
          .map((p) => ({
            _id: p._id, name: p.name, meal: p.meal, pricePerPlate: p.pricePerPlate, minPlates: p.minPlates, description: p.description,
            items: (p.items || []).map((x) => ({ name: x.name, category: x.category })),
            sections: (p.sections || []).map((s) => ({ label: s.label, pick: s.pick, options: (s.options || []).map((o) => ({ itemId: o.itemId, name: o.name })) })), // gram nahi
          })),
        addons: addons.filter((a) => a.active),
        halls: halls.filter((h) => h.active),
        isOwner: false,
      },
    });
  } catch (e) {
    fail(res, e);
  }
});

const KINDS = {
  item: [BanquetItem, (b) => ({ name: clean(b.name, 80), category: clean(b.category, 60) || "Other", pricePerKg: n(b.pricePerKg), unit: ["kg", "litre", "pc"].includes(b.unit) ? b.unit : "kg", defaultGrams: n(b.defaultGrams), active: b.active !== false, sort: n(b.sort) })],
  addon: [BanquetAddon, (b) => ({ name: clean(b.name, 80), price: n(b.price), unit: ["fixed", "hour", "day", "plate"].includes(b.unit) ? b.unit : "fixed", active: b.active !== false, sort: n(b.sort) })],
  hall: [BanquetHall, (b) => ({ name: clean(b.name, 80), rentPerHour: n(b.rentPerHour), rentPerDay: 0, minHours: n(b.minHours), capacity: n(b.capacity), active: b.active !== false })],
  package: [
    BanquetPackage,
    (b) => ({
      name: clean(b.name, 80),
      meal: SLOTS.includes(b.meal) ? b.meal : "Lunch",
      items: (Array.isArray(b.items) ? b.items : []).filter((x) => x.itemId && n(x.grams) >= 0).map((x) => ({ itemId: String(x.itemId), name: clean(x.name, 80), category: clean(x.category, 60), grams: n(x.grams) })),
      sections: (Array.isArray(b.sections) ? b.sections : [])
        .filter((x) => clean(x.label) && (x.options || []).length)
        .map((x) => ({ label: clean(x.label, 60), pick: Math.max(1, Math.round(n(x.pick))), grams: n(x.grams), options: (x.options || []).filter((o) => o.itemId).map((o) => ({ itemId: String(o.itemId), name: clean(o.name, 80), category: clean(o.category, 60) })) })),
      pricePerPlate: n(b.pricePerPlate),
      minPlates: n(b.minPlates),
      description: clean(b.description, 300),
      active: b.active !== false,
      sort: n(b.sort),
    }),
  ],
};
// POST /master/:kind  { _id?, ...fields }  (owner) — naya ya badlav. Hatana = active false.
router.post("/master/:kind", ownerOnly, async (req, res) => {
  try {
    const k = KINDS[req.params.kind];
    if (!k) return bad(res, "Unknown");
    const [Model, pick] = k;
    const data = pick(req.body || {});
    if (!data.name) return bad(res, "Name is required");
    const doc = req.body?._id ? await Model.findByIdAndUpdate(req.body._id, { $set: data }, { new: true }) : await Model.create(data);
    res.json({ success: true, data: doc });
  } catch (e) {
    fail(res, e);
  }
});

/* ───────── Bookings ───────── */
const nextNo = async () => {
  const doc = await AppSetting.findOneAndUpdate({ _id: "banquetBookingNo" }, { $inc: { value: 1 } }, { upsert: true, new: true }).lean();
  return `BQ-${String(doc.value).padStart(4, "0")}`;
};
const nextBillNo = async () => {
  const doc = await AppSetting.findOneAndUpdate({ _id: "banquetBillNo" }, { $inc: { value: 1 } }, { upsert: true, new: true }).lean();
  return `BQB-${String(doc.value).padStart(4, "0")}`;
};
const shape = (b) => ({ ...b, totals: banquetTotals(b) });

// Booking form se data (menu ka rate/item package se snapshot; owner rate badal sakta hai)
const readBooking = async (req, b) => {
  const pkgs = await BanquetPackage.find({ _id: { $in: (b.menus || []).map((m) => m.packageId).filter((x) => /^[a-f0-9]{24}$/.test(String(x))) } }).lean();
  const pk = Object.fromEntries(pkgs.map((p) => [String(p._id), p]));
  const menus = (b.menus || [])
    .filter((m) => pk[m.packageId] && n(m.plates) > 0)
    .map((m) => {
      const p = pk[m.packageId];
      // Customer ka chunav: har hisse mein package ke options mein se hi, aur "pick" se zyada nahi
      const chosen = Object.fromEntries((m.choices || []).map((c) => [c.label, (c.items || []).map((x) => String(x.itemId || x))]));
      const choices = (p.sections || []).map((sec) => {
        const ok = (sec.options || []).filter((o) => (chosen[sec.label] || []).includes(String(o.itemId)));
        const auto = (sec.options || []).length === 1 ? sec.options : ok; // ek hi option ho to apne aap
        return { label: sec.label, grams: sec.grams, pick: sec.pick, items: auto.slice(0, Math.max(1, n(sec.pick))).map((o) => ({ itemId: o.itemId, name: o.name, category: o.category })) };
      });
      return { packageId: String(p._id), name: p.name, meal: p.meal, pricePerPlate: admin(req) && m.pricePerPlate !== undefined && m.pricePerPlate !== "" ? n(m.pricePerPlate) : p.pricePerPlate /* staff: package ka hi rate */, plates: Math.round(n(m.plates)), items: p.items, choices };
    });
  // Package ka minimum person se kam plate? (save nahi hoga)
  const short = menus.filter((m) => n(pk[m.packageId]?.minPlates) > m.plates).map((m) => `${m.name}: minimum ${pk[m.packageId].minPlates} persons`);
  return {
    short,
    customer: { name: clean(b.customer?.name, 80), mobile: clean(b.customer?.mobile, 15).replace(/\D/g, ""), company: clean(b.customer?.company, 80), address: clean(b.customer?.address, 200), gstin: clean(b.customer?.gstin, 20).toUpperCase() },
    occasion: clean(b.occasion, 80),
    eventDate: b.eventDate,
    slot: SLOTS.includes(b.slot) ? b.slot : "Lunch",
    startTime: clean(b.startTime, 10),
    endTime: clean(b.endTime, 10),
    hall: { id: clean(b.hall?.id, 30), name: clean(b.hall?.name, 80) },
    hours: n(b.hours),
    hallRent: n(b.hallRent),
    guests: Math.round(n(b.guests)),
    menus,
    addons: (b.addons || []).filter((a) => clean(a.name) && n(a.qty) > 0).map((a) => ({ name: clean(a.name, 80), price: n(a.price), unit: clean(a.unit, 10) || "fixed", qty: n(a.qty) })),
    discount: Math.max(0, n(b.discount)),
    gstPercent: [0, 5, 12, 18].includes(n(b.gstPercent)) ? n(b.gstPercent) : 0,
    notes: clean(b.notes, 500),
  };
};
// Usi din, usi jagah, usi time (ya full day) koi aur booking?
const clash = async (data, exceptId) => {
  const list = await BanquetBooking.find({ eventDate: data.eventDate, status: { $ne: "cancelled" }, ...(exceptId ? { _id: { $ne: exceptId } } : {}) }, { bookingNo: 1, slot: 1, hall: 1, customer: 1 }).lean();
  return list.filter((x) => (!data.hall?.name || !x.hall?.name || x.hall.name === data.hall.name) && (x.slot === data.slot || x.slot === "Full day" || data.slot === "Full day"));
};

router.get("/bookings", async (req, res) => {
  try {
    const from = valid(req.query.from) ? dayjs(req.query.from, F) : dayjs().subtract(30, "day");
    const to = valid(req.query.to) ? dayjs(req.query.to, F) : dayjs().add(365, "day");
    const list = await BanquetBooking.find({ eventCreateDate: { $gte: from.startOf("day").toDate(), $lte: to.endOf("day").toDate() } }).sort({ eventCreateDate: 1, slot: 1 }).lean();
    res.json({ success: true, data: list.map(shape) });
  } catch (e) {
    fail(res, e);
  }
});

router.get("/bookings/:id([a-f0-9]{24})", async (req, res) => {
  try {
    const b = await BanquetBooking.findById(req.params.id).lean();
    if (!b) return bad(res, "Not found", 404);
    res.json({ success: true, data: shape(b) });
  } catch (e) {
    fail(res, e);
  }
});

router.post("/bookings", async (req, res) => {
  try {
    const data = await readBooking(req, req.body || {});
    if (!data.customer.name) return bad(res, "Customer name is required");
    if (!valid(data.eventDate)) return bad(res, "Choose the event date");
    if (data.short.length) return bad(res, data.short.join(", "));
    delete data.short;
    if (!admin(req) && dayjs(data.eventDate, F).isBefore(dayjs(todayIst(), F), "day")) return bad(res, "Event date cannot be in the past");
    const c = await clash(data);
    if (c.length && !req.body?.force) return res.status(409).json({ success: false, clash: c, message: `Already booked: ${c.map((x) => `${x.bookingNo} ${x.customer?.name} (${x.slot})`).join(", ")}` });
    const doc = await BanquetBooking.create({ ...data, bookingNo: await nextNo(), enteredBy: who(req) });
    res.json({ success: true, data: shape(doc.toObject()) });
  } catch (e) {
    fail(res, e);
  }
});

router.put("/bookings/:id([a-f0-9]{24})", async (req, res) => {
  try {
    const doc = await BanquetBooking.findById(req.params.id);
    if (!doc) return bad(res, "Not found", 404);
    if (doc.status === "cancelled") return bad(res, "This booking is cancelled");
    if (doc.status === "billed" && !admin(req)) return bad(res, "Bill is final. Only the owner can change it.", 403);
    const data = await readBooking(req, req.body || {});
    if (!data.customer.name) return bad(res, "Customer name is required");
    if (!valid(data.eventDate)) return bad(res, "Choose the event date");
    if (data.short.length) return bad(res, data.short.join(", "));
    delete data.short;
    const c = await clash(data, doc._id);
    if (c.length && !req.body?.force) return res.status(409).json({ success: false, clash: c, message: `Already booked: ${c.map((x) => `${x.bookingNo} ${x.customer?.name} (${x.slot})`).join(", ")}` });
    Object.assign(doc, data, { updatedBy: who(req) });
    await doc.save();
    res.json({ success: true, data: shape(doc.toObject()) });
  } catch (e) {
    fail(res, e);
  }
});

// Payment (advance / baaki) — staff sirf aaj ki date se
router.post("/bookings/:id([a-f0-9]{24})/payment", async (req, res) => {
  try {
    const b = req.body || {};
    const doc = await BanquetBooking.findById(req.params.id);
    if (!doc) return bad(res, "Not found", 404);
    if (doc.status === "cancelled") return bad(res, "This booking is cancelled");
    const amount = Math.round(n(b.amount));
    const date = admin(req) && valid(b.date) ? b.date : todayIst();
    if (!staffDateOk(req, date)) return bad(res, "Only today's payment can be added", 403);
    if (!(amount > 0)) return bad(res, "Enter the amount");
    if (!MODES.includes(b.mode)) return bad(res, "Choose the payment mode");
    const recent = doc.payments.find((p) => !p.cancelled && p.amount === amount && p.mode === b.mode && p.date === date && Date.now() - new Date(p.createdAt).getTime() < 15000);
    if (!recent) doc.payments.push({ amount, mode: b.mode, date, note: clean(b.note, 200), by: who(req) });
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: shape(doc.toObject()) });
  } catch (e) {
    fail(res, e);
  }
});

router.put("/bookings/:id([a-f0-9]{24})/payment/:pid([a-f0-9]{24})/cancel", async (req, res) => {
  try {
    const doc = await BanquetBooking.findById(req.params.id);
    const p = doc?.payments.id(req.params.pid);
    if (!p) return bad(res, "Not found", 404);
    if (!staffDateOk(req, p.date)) return bad(res, "Only today's payment can be removed", 403);
    p.cancelled = true;
    p.cancelledBy = who(req);
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: shape(doc.toObject()) });
  } catch (e) {
    fail(res, e);
  }
});

// Final bill (event ke baad, asli plates ke saath). Bill no. ek baar milta hai.
router.post("/bookings/:id([a-f0-9]{24})/bill", async (req, res) => {
  try {
    const doc = await BanquetBooking.findById(req.params.id);
    if (!doc) return bad(res, "Not found", 404);
    if (doc.status === "cancelled") return bad(res, "This booking is cancelled");
    if (doc.status === "billed" && !admin(req)) return bad(res, "Already billed");
    if (!doc.billNo) doc.billNo = await nextBillNo();
    doc.status = "billed";
    doc.billedAt = doc.billedAt || todayIst();
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: shape(doc.toObject()) });
  } catch (e) {
    fail(res, e);
  }
});

// Cancel (sirf owner). Advance wapas karna ho to Office Out → "refund" se.
router.put("/bookings/:id([a-f0-9]{24})/cancel", ownerOnly, async (req, res) => {
  try {
    const doc = await BanquetBooking.findById(req.params.id);
    if (!doc) return bad(res, "Not found", 404);
    doc.status = "cancelled";
    doc.cancelReason = clean(req.body?.reason, 200);
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: shape(doc.toObject()) });
  } catch (e) {
    fail(res, e);
  }
});
router.put("/bookings/:id([a-f0-9]{24})/reopen", ownerOnly, async (req, res) => {
  try {
    const doc = await BanquetBooking.findById(req.params.id);
    if (!doc) return bad(res, "Not found", 404);
    doc.status = "booked";
    doc.updatedBy = who(req);
    await doc.save();
    res.json({ success: true, data: shape(doc.toObject()) });
  } catch (e) {
    fail(res, e);
  }
});

/* ───────── Owner: kitchen planning + reports ───────── */
// GET /kitchen?from&to  → har booking ke liye kaunsa item kitna banana (kg) + andaazit kharcha
router.get("/kitchen", ownerOrReport, async (req, res) => {
  try {
    const from = valid(req.query.from) ? dayjs(req.query.from, F) : dayjs();
    const to = valid(req.query.to) ? dayjs(req.query.to, F) : from.add(7, "day");
    const [list, items] = await Promise.all([
      BanquetBooking.find({ status: { $ne: "cancelled" }, eventCreateDate: { $gte: from.startOf("day").toDate(), $lte: to.endOf("day").toDate() } }).sort({ eventCreateDate: 1 }).lean(),
      BanquetItem.find({}).lean(),
    ]);
    const price = Object.fromEntries(items.map((x) => [String(x._id), x]));
    const out = list.map((b) => {
      const lines = {};
      // Chuna hua menu (choices) — har chune item ke us hisse ke gram; purani booking ke fix items bhi
      const flat = (m) => [...(m.items || []), ...(m.choices || []).flatMap((c) => (c.items || []).map((x) => ({ ...x, grams: c.grams })))];
      (b.menus || []).forEach((m) =>
        flat(m).forEach((x) => {
          const it = price[x.itemId] || {};
          const k = x.itemId || x.name;
          const l = (lines[k] ||= { name: x.name, category: x.category, unit: it.unit || "kg", qty: 0, cost: 0 });
          const q = (n(x.grams) * n(m.plates)) / 1000;
          l.qty += q;
          l.cost += q * n(it.pricePerKg);
        })
      );
      const arr = Object.values(lines).map((l) => ({ ...l, qty: Math.round(l.qty * 100) / 100, cost: Math.round(l.cost) }));
      const t = banquetTotals(b);
      const foodCost = arr.reduce((s, l) => s + l.cost, 0);
      return { _id: b._id, bookingNo: b.bookingNo, eventDate: b.eventDate, slot: b.slot, customer: b.customer?.name, plates: (b.menus || []).reduce((s, m) => s + n(m.plates), 0), menus: (b.menus || []).map((m) => `${m.name} × ${m.plates}`), lines: arr, foodCost, foodSale: t.food, margin: Math.round(t.food - foodCost) };
    });
    res.json({ success: true, data: out });
  } catch (e) {
    fail(res, e);
  }
});

// GET /report?from&to → bookings, kamai (bill), wasooli (mode), baaki
router.get("/report", ownerOrReport, async (req, res) => {
  try {
    const from = valid(req.query.from) ? dayjs(req.query.from, F) : dayjs().startOf("month");
    const to = valid(req.query.to) ? dayjs(req.query.to, F) : dayjs().endOf("month");
    const list = await BanquetBooking.find({ eventCreateDate: { $gte: from.startOf("day").toDate(), $lte: to.endOf("day").toDate() } }).sort({ eventCreateDate: 1 }).lean();
    const rows = list.map(shape);
    const live = rows.filter((r) => r.status !== "cancelled");
    const sum = (arr, f) => arr.reduce((s, x) => s + n(f(x)), 0);
    // Paisa jis din mila (event kabhi bhi ho)
    const paidIn = await BanquetBooking.aggregate([
      { $unwind: "$payments" },
      { $match: { "payments.cancelled": { $ne: true } } },
      { $project: { _id: 0, date: "$payments.date", amount: "$payments.amount", mode: "$payments.mode" } },
    ]);
    const inRange = paidIn.filter((p) => {
      const d = dayjs(p.date, F, true);
      return d.isValid() && !d.isBefore(from, "day") && !d.isAfter(to, "day");
    });
    const byMode = {};
    inRange.forEach((p) => (byMode[p.mode] = (byMode[p.mode] || 0) + n(p.amount)));
    const byPackage = {};
    live.forEach((r) => (r.menus || []).forEach((m) => {
      const x = (byPackage[m.name] ||= { name: m.name, bookings: 0, plates: 0, amount: 0 });
      x.bookings += 1;
      x.plates += n(m.plates);
      x.amount += n(m.plates) * n(m.pricePerPlate);
    }));
    res.json({
      success: true,
      data: {
        rows,
        totals: {
          bookings: live.length,
          cancelled: rows.length - live.length,
          plates: sum(live, (r) => (r.menus || []).reduce((s, m) => s + n(m.plates), 0)),
          billed: sum(live.filter((r) => r.status === "billed"), (r) => r.totals.total),
          booked: sum(live, (r) => r.totals.total),
          collected: sum(inRange, (p) => p.amount),
          due: sum(live, (r) => Math.max(0, r.totals.balance)),
        },
        byMode,
        byPackage: Object.values(byPackage).sort((a, b) => b.amount - a.amount),
      },
    });
  } catch (e) {
    fail(res, e);
  }
});

export default router;
