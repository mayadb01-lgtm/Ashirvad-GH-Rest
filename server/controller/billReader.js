// AI bill reader: purchase bill photo(s) -> vendor, bill no, date, items, extra, total (Claude reads the photo).
// Staff still check every line and press Save - this only fills the form. ⚠️ Writes nothing to the database.
// Needs ANTHROPIC_API_KEY in /etc/ashirvad.env; without it the screen falls back to the free phone reader.
import PurchaseItem from "../model/purchaseItem.js";
import { catalogItems } from "./rasoi.js";
import { readStructured, takeRead, toImage } from "../utils/claude.js";

const DAILY_LIMIT = Number(process.env.BILL_AI_DAILY_LIMIT) || 300; // reads per day for the whole hotel (cost guard)
const UNITS = ["kg", "g", "ltr", "ml", "pcs", "dozen", "packet", "box", "bottle", "tray", "bunch", "bag", "can", "jar"];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["readable", "vendorName", "vendorId", "billNo", "billDate", "items", "extra", "total", "warnings"],
  properties: {
    readable: { type: "string", enum: ["good", "partial", "poor", "not_a_bill"] },
    vendorName: { type: "string", description: "Shop / supplier name as printed or written on the bill, or empty" },
    vendorId: { type: "string", description: "id from the VENDORS list when the bill is clearly from that vendor, else empty" },
    billNo: { type: "string" },
    billDate: { type: "string", description: "DD-MM-YYYY, or empty if not on the bill" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["billText", "key", "name", "qty", "unit", "rate", "amount", "unsure"],
        properties: {
          billText: { type: "string", description: "the line's item name exactly as on the bill" },
          key: { type: "string", description: "key from the CATALOGUE when it is the same item, else empty" },
          name: { type: "string", description: "clean English item name: the catalogue/known name when matched, else the bill name" },
          qty: { type: "number" },
          unit: { type: "string", enum: UNITS },
          rate: { type: "number", description: "price per one unit" },
          amount: { type: "number", description: "line total as written on the bill" },
          unsure: { type: "boolean", description: "true if any number or the name on this line was hard to read" },
        },
      },
    },
    extra: { type: "number", description: "tax + transport + packing + round-off and other charges outside the item lines (discount is negative)" },
    total: { type: "number", description: "grand total payable as written on the bill, 0 if not visible" },
    warnings: { type: "array", items: { type: "string" }, description: "short plain-English notes for the staff checking the bill" },
  },
};

const SYSTEM = `You read purchase bills for Hotel Ashirvad's restaurant and office in Gujarat, India: vegetable, grocery, dairy, meat, gas, cleaning and similar supplier bills. Bills may be printed, handwritten or faded thermal slips, and item names may be in English, Hindi or Gujarati (or a mix). Amounts are in rupees.

Copy the numbers that are on the bill; never invent or "fix" one. Read every item line, in bill order. For each line:
- qty, unit, rate (price per one unit) and amount (line total) as written. If only two of qty / rate / amount are written, work out the third. If a number cannot be read, give your best reading and set unsure = true.
- Convert the unit to one of the allowed units (kilo/kgs -> kg, gram/gm -> g, litre/lt -> ltr, nos/nag/piece -> pcs, pkt -> packet, dz -> dozen).
- Match the item to the CATALOGUE (by English, Hindi, Gujarati or local names) or to the KNOWN ITEMS from earlier bills when it is clearly the same thing; use the catalogue key and that name. Otherwise leave key empty and give a clean English name.
- Leave out lines that are not goods: sub-total, GST/CGST/SGST, round off, transport, packing, discount, previous balance. Put their net effect (charges minus discount) in extra.
- total is the final amount payable written on the bill.

Set vendorId only when the shop name clearly matches one of the VENDORS. In warnings, briefly note anything the staff should check: lines you could not read, a total that does not match the lines, a previous balance included in the total, a second bill in the photo, or a date that is not this year.`;

// Stable text (catalogue + known items + vendors) for the system prompt. Sorted so it stays the same between requests.
async function referenceText(vendors) {
  const cat = catalogItems().map((c) => `${c.key} | ${c.en} | ${c.hi || ""} | ${c.alias || ""} | ${c.unit}`).join("\n");
  const known = (await PurchaseItem.find({ ckey: "" }, { name: 1, unit: 1 }).sort({ uses: -1 }).limit(250).lean())
    .map((m) => `${m.name} (${m.unit})`)
    .sort()
    .join("\n");
  const vend = vendors.map((v) => `${v.id} | ${v.name}${v.category ? ` | ${v.category}` : ""}`).sort().join("\n");
  return `CATALOGUE (key | English | Hindi | local names | unit):\n${cat}\n\nKNOWN ITEMS from earlier bills:\n${known || "(none)"}\n\nVENDORS (id | name | category):\n${vend || "(none)"}`;
}

const r2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const clean = (v, max = 100) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);

// POST /api/v1/purchase/read  { photos: [dataURL, ...], vendors: [{ id, name, category }] }
export async function readBill(req, res) {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ success: false, code: "NO_AI", message: "AI reader is not set up" });
  const images = (Array.isArray(req.body?.photos) ? req.body.photos : []).slice(0, 6).map(toImage).filter(Boolean);
  if (!images.length) return res.status(400).json({ success: false, message: "Add a photo of the bill" });
  if (!takeRead("bill", DAILY_LIMIT)) return res.status(429).json({ success: false, code: "LIMIT", message: "Today's AI reading limit is used up - fill this bill by hand" });
  const vendors = (Array.isArray(req.body?.vendors) ? req.body.vendors : [])
    .slice(0, 500)
    .map((v) => ({ id: clean(v.id, 40), name: clean(v.name), category: clean(v.category, 60) }))
    .filter((v) => v.id && v.name);
  const vendorIds = new Set(vendors.map((v) => v.id));
  const keys = new Set(catalogItems().map((c) => c.key));
  const r = await readStructured({
    system: [{ type: "text", text: SYSTEM }, { type: "text", text: await referenceText(vendors) }],
    images,
    text: images.length > 1 ? `These ${images.length} photos are pages of ONE bill, in order. Read the bill.` : "Read this bill.",
    schema: SCHEMA,
    tag: "bill-ai",
    who: req.user?.name,
  });
  if (r.error) return res.status(r.status).json({ success: false, ...r.error });
  const out = r.data;
  res.json({
    success: true,
    data: {
      readable: out.readable,
      vendorName: clean(out.vendorName),
      vendorId: vendorIds.has(out.vendorId) ? out.vendorId : "",
      billNo: clean(out.billNo, 40),
      billDate: /^\d{2}-\d{2}-\d{4}$/.test(out.billDate) ? out.billDate : "",
      items: (out.items || []).slice(0, 80).map((it) => ({
        billText: clean(it.billText, 80),
        key: keys.has(it.key) ? it.key : "",
        name: clean(it.name || it.billText, 80),
        qty: r2(it.qty),
        unit: UNITS.includes(it.unit) ? it.unit : "pcs",
        rate: r2(it.rate),
        amount: r2(it.amount),
        unsure: !!it.unsure,
      })),
      extra: r2(out.extra),
      total: r2(out.total),
      warnings: (out.warnings || []).slice(0, 8).map((w) => clean(w, 200)).filter(Boolean),
    },
  });
}
