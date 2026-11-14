// AI guest ID reader: photo(s) of an ID (Aadhaar front/back, passport, driving licence, voter ID, PAN) -> the guest
// register fields. Staff check and save - this only fills the form. ⚠️ Writes nothing to the database.
import GuestRegister from "../model/guestRegister.js";
import { readSmart, takeRead, toImage } from "../utils/claude.js";

const DAILY_LIMIT = Number(process.env.ID_AI_DAILY_LIMIT) || 400; // reads per day for the whole hotel (cost guard)
export const DOC_TYPES = ["Aadhar Card", "Passport", "Driving License", "Voter ID", "PAN Card", "Other"];
export const STATES = [
  "Andaman and Nicobar Islands", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chandigarh", "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jammu and Kashmir",
  "Jharkhand", "Karnataka", "Kerala", "Ladakh", "Lakshadweep", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
  "Mizoram", "Nagaland", "Odisha", "Puducherry", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];
const FIELDS = ["firstName", "middleName", "lastName", "dob", "houseNo", "address", "locality", "city", "district", "state", "zipCode", "country", "documentType", "documentNumber"];

const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["isId", "documentType", "documentNumber", "numberMasked", "firstName", "middleName", "lastName", "dob", "houseNo", "address", "locality", "city", "district", "state", "zipCode", "country", "unsure", "warnings"],
  properties: {
    isId: { type: "boolean", description: "false if the photo is not an identity document" },
    documentType: { type: "string", enum: DOC_TYPES },
    documentNumber: { type: "string", description: "Aadhaar: 12 digits without spaces. Others exactly as printed." },
    numberMasked: { type: "boolean", description: "true if the number is partly hidden (e.g. XXXX XXXX 1234)" },
    firstName: { type: "string" },
    middleName: { type: "string" },
    lastName: { type: "string" },
    dob: { type: "string", description: "YYYY-MM-DD; if only the year is printed use YYYY-01-01; empty if not on the document" },
    houseNo: { type: "string" },
    address: { type: "string", description: "street / building / landmark / village part of the address, without house no, locality, city, district, state, PIN" },
    locality: { type: "string" },
    city: { type: "string" },
    district: { type: "string" },
    state: { type: "string", description: "one of the Indian states/UTs exactly as listed, or empty" },
    zipCode: { type: "string", description: "6-digit PIN" },
    country: { type: "string" },
    unsure: { type: "array", items: { type: "string", enum: FIELDS }, description: "fields that were hard to read" },
    warnings: { type: "array", items: { type: "string" }, description: "short plain-English notes for the receptionist" },
  },
};

const SYSTEM = `You read Indian identity documents for a guest house check-in register (the police "Pathik" form). The photos are of ONE person's document(s): for example the front and back of an Aadhaar card, a passport photo page, a driving licence or a voter ID.

Copy what is printed; never guess or invent. Use the English text when the card is bilingual.
- Name: split into first, middle and last name the usual Indian way ("Rameshbhai Kantilal Patel" -> Rameshbhai / Kantilal / Patel). "S/O", "D/O", "W/O", "C/O" parts are not the guest's name.
- Address (usually on the Aadhaar back): split into house no, address (street/society/landmark/village), locality/area, city or town, district, state and the 6-digit PIN. Drop "S/O ..." / "C/O ..." from the address. State must be one of: ${STATES.join(", ")}.
- Aadhaar number: 12 digits, no spaces. If it is masked (XXXX XXXX 1234), give what is visible and set numberMasked = true.
- Put any field you could not read clearly in unsure.
- warnings: mention a masked Aadhaar, a document that has expired, a photo that is blurred or cut off, or two different people in the photos.
If the photo is not an identity document, set isId = false and leave the fields empty.`;

// Aadhaar check digit (Verhoeff) - catches most misread digits
const VD = [[0,1,2,3,4,5,6,7,8,9],[1,2,3,4,0,6,7,8,9,5],[2,3,4,0,1,7,8,9,5,6],[3,4,0,1,2,8,9,5,6,7],[4,0,1,2,3,9,5,6,7,8],[5,9,8,7,6,0,4,3,2,1],[6,5,9,8,7,1,0,4,3,2],[7,6,5,9,8,2,1,0,4,3],[8,7,6,5,9,3,2,1,0,4],[9,8,7,6,5,4,3,2,1,0]];
const VP = [[0,1,2,3,4,5,6,7,8,9],[1,5,7,6,2,8,3,0,9,4],[5,8,0,3,7,9,6,1,4,2],[8,9,1,6,0,4,3,5,2,7],[9,4,5,3,1,2,6,8,7,0],[4,2,8,6,5,7,3,9,0,1],[2,7,9,3,8,0,6,4,1,5],[7,0,4,6,9,1,3,2,5,8]];
export const aadhaarOk = (num) => {
  const s = String(num || "").replace(/\s/g, "");
  if (!/^[2-9]\d{11}$/.test(s)) return false;
  let c = 0;
  [...s].reverse().forEach((d, i) => (c = VD[c][VP[i % 8][Number(d)]]));
  return c === 0;
};

// Is the quick read doubtful? -> reasons (empty = trust it). Then the best model reads the same photos again.
const idDoubts = (o) => {
  if (!o?.isId) return [];
  const why = [];
  if ((o.unsure || []).length) why.push("some fields hard to read");
  if (!String(o.firstName || "").trim()) why.push("no name read");
  if (!String(o.documentNumber || "").trim()) why.push("no document number read");
  const digits = String(o.documentNumber || "").replace(/\D/g, "");
  if (o.documentType === "Aadhar Card" && !o.numberMasked && !aadhaarOk(digits)) why.push("Aadhaar check digit failed");
  return why;
};

const clean = (v, max = 200) => String(v ?? "").replace(/[\r\n\t]+/g, " ").trim().slice(0, max);
const docKey = (t, n) => `${String(t || "").toLowerCase()}|${String(n || "").replace(/[\s-]/g, "").toUpperCase()}`;

// POST /api/v1/guest-register/read-id  { photos: [dataURL, ...], date, period, roomNo }
export async function readId(req, res) {
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ success: false, code: "NO_AI", message: "AI reader is not set up" });
  const images = (Array.isArray(req.body?.photos) ? req.body.photos : []).slice(0, 4).map(toImage).filter(Boolean);
  if (!images.length) return res.status(400).json({ success: false, message: "Add a photo of the ID" });
  if (!takeRead("id", DAILY_LIMIT)) return res.status(429).json({ success: false, code: "LIMIT", message: "Today's AI reading limit is used up - fill it by hand" });
  const r = await readSmart({
    best: req.body?.best === true, // "Read again (best)"
    needsBest: idDoubts,
    limitName: "id",
    limit: DAILY_LIMIT,
    system: [{ type: "text", text: SYSTEM }],
    images,
    text: images.length > 1 ? `These ${images.length} photos are the same person's document (e.g. front and back). Read it.` : "Read this identity document.",
    schema: SCHEMA,
    tag: "id-ai",
    who: req.user?.name,
  });
  if (r.error) return res.status(r.status).json({ success: false, ...r.error });
  const o = r.data;
  const data = {
    isId: !!o.isId,
    documentType: DOC_TYPES.includes(o.documentType) ? o.documentType : "Other",
    documentNumber: clean(o.documentNumber, 50),
    numberMasked: !!o.numberMasked,
    firstName: clean(o.firstName, 60),
    middleName: clean(o.middleName, 60),
    lastName: clean(o.lastName, 60),
    dob: /^\d{4}-\d{2}-\d{2}$/.test(o.dob) ? o.dob : "",
    houseNo: clean(o.houseNo, 100),
    address: clean(o.address, 500),
    locality: clean(o.locality, 100),
    city: clean(o.city, 100),
    district: clean(o.district, 100),
    state: STATES.includes(o.state) ? o.state : "",
    zipCode: /^\d{6}$/.test(o.zipCode) ? o.zipCode : "",
    country: clean(o.country, 60) || "India",
    unsure: (o.unsure || []).filter((f) => FIELDS.includes(f)),
    warnings: (o.warnings || []).slice(0, 6).map((w) => clean(w, 200)).filter(Boolean),
    model: r.model, // "quick" | "best"
    escalated: r.escalated,
  };
  if (data.documentType === "Aadhar Card") {
    data.documentNumber = data.documentNumber.replace(/\D/g, "").slice(0, 12) || data.documentNumber;
    if (!data.numberMasked && data.documentNumber && !aadhaarOk(data.documentNumber)) {
      data.unsure = [...new Set([...data.unsure, "documentNumber"])];
      data.warnings.unshift("This Aadhaar number fails the check digit - one digit is probably misread. Compare it with the card.");
    }
  }
  // same document already registered in another room today?
  try {
    const date = clean(req.body?.date, 10), period = clean(req.body?.period, 20), roomNo = Number(req.body?.roomNo) || 0;
    if (date && data.documentNumber) {
      const k = docKey(data.documentType, data.documentNumber);
      const regs = await GuestRegister.find({ date }, { roomNo: 1, period: 1, documentType: 1, documentNumber: 1, otherGuests: 1 }).lean();
      const hit = regs.find((g) => !(g.roomNo === roomNo && g.period === period) && [g, ...(g.otherGuests || [])].some((x) => docKey(x.documentType, x.documentNumber) === k));
      if (hit) data.warnings.unshift(`This document is already registered today in room ${hit.roomNo} (${hit.period}).`);
    }
  } catch {
    /* duplicate check is only a hint */
  }
  res.json({ success: true, data });
}
