// AI bill reader: purchase bill photo(s) -> vendor, bill no, date, items, extra, total (Claude reads the photo).
// Staff still check every line and press Save - this only fills the form. ⚠️ Writes nothing to the database.
// Needs ANTHROPIC_API_KEY in /etc/ashirvad.env; without it the screen falls back to the free phone reader.
import Anthropic from "@anthropic-ai/sdk";
import PurchaseItem from "../model/purchaseItem.js";
import { catalogItems } from "./rasoi.js";

const MODEL = "claude-opus-5-5";
const DAILY_LIMIT = Number(process.env.BILL_AI_DAILY_LIMIT) || 300; // reads per day for the whole hotel (cost guard)
const UNITS = ["kg", "g", "ltr", "ml", "pcs", "dozen", "packet", "box", "bottle", "tray", "bunch", "bag", "can", "jar"];

let client = null;
const getClient = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  return client;
};

// reads today (IST), kept in memory: resets at midnight and on restart - enough for a cost guard
const used = { day: "", n: 0 };
const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const takeOne = () => {
  if (used.day !== today()) Object.assign(used, { day: today(), n: 0 });
  if (used.n >= DAILY_LIMIT) return false;
  used.n += 1;
  return true;
};

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

// image data URL -> Claude image block
const toImage = (url) => {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(url || ""));
  return m ? { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } } : null;
};

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
  const ai = getClient();
  if (!ai) return res.status(503).json({ success: false, code: "NO_AI", message: "AI reader is not set up" });
  const images = (Array.isArray(req.body?.photos) ? req.body.photos : []).slice(0, 6).map(toImage).filter(Boolean);
  if (!images.length) return res.status(400).json({ success: false, message: "Add a photo of the bill" });
  if (!takeOne()) return res.status(429).json({ success: false, code: "LIMIT", message: "Today's AI reading limit is used up - fill this bill by hand" });
  const vendors = (Array.isArray(req.body?.vendors) ? req.body.vendors : [])
    .slice(0, 500)
    .map((v) => ({ id: clean(v.id, 40), name: clean(v.name), category: clean(v.category, 60) }))
    .filter((v) => v.id && v.name);
  const vendorIds = new Set(vendors.map((v) => v.id));
  const keys = new Set(catalogItems().map((c) => c.key));
  const started = Date.now();
  try {
    const msg = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // if the model declines, the API retries on its fallback model
      output_config: { effort: "medium", format: { type: "json_schema", schema: SCHEMA } },
      cache_control: { type: "ephemeral" },
      system: [{ type: "text", text: SYSTEM }, { type: "text", text: await referenceText(vendors) }],
      messages: [
        {
          role: "user",
          content: [
            ...images,
            { type: "text", text: images.length > 1 ? `These ${images.length} photos are pages of ONE bill, in order. Read the bill.` : "Read this bill." },
          ],
        },
      ],
    });
    const u = msg.usage || {};
    console.log(`[bill-ai] ${req.user?.name || "?"} ${images.length} photo(s) ${msg.stop_reason} in=${u.input_tokens} cached=${u.cache_read_input_tokens || 0} out=${u.output_tokens} ${Date.now() - started}ms`);
    if (msg.stop_reason === "refusal") return res.status(422).json({ success: false, message: "The AI could not read this photo - fill the bill by hand" });
    if (msg.stop_reason === "max_tokens") return res.status(422).json({ success: false, message: "The bill is too long for one read - fill the rest by hand" });
    const text = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    let out;
    try {
      out = JSON.parse(text);
    } catch {
      return res.status(502).json({ success: false, message: "The AI reply could not be read - try again" });
    }
    const data = {
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
    };
    res.json({ success: true, data });
  } catch (e) {
    console.error("[bill-ai] failed:", e?.status || "", e?.message);
    if (e instanceof Anthropic.AuthenticationError) return res.status(503).json({ success: false, code: "NO_AI", message: "AI reader key is not valid" });
    if (e instanceof Anthropic.RateLimitError) return res.status(503).json({ success: false, message: "AI reader is busy - try again in a minute" });
    if (e instanceof Anthropic.APIConnectionError) return res.status(503).json({ success: false, message: "Could not reach the AI reader - check internet and try again" });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ success: false, message: "AI reader error - try again or fill by hand" });
    res.status(500).json({ success: false, message: "Could not read the bill - fill it by hand" });
  }
}
