// Shared Claude (Anthropic) client for the AI readers (purchase bills, guest IDs).
// Needs ANTHROPIC_API_KEY in /etc/ashirvad.env; without it every reader answers "not set up" and screens fall back.
import Anthropic from "@anthropic-ai/sdk";

// quick (cheap) reads first; a doubtful result is read again by the best model automatically
export const MODELS = { quick: "claude-haiku-5-5", best: "claude-opus-5-5" };
export { Anthropic };

let client = null;
export const getClaude = () => {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ timeout: 120_000, maxRetries: 2 });
  return client;
};

// Reads per day (IST) per reader, kept in memory: a cost guard, resets at midnight and on restart.
const used = {};
const today = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
export const takeRead = (name, limit) => {
  const u = (used[name] ||= { day: "", n: 0 });
  if (u.day !== today()) Object.assign(u, { day: today(), n: 0 });
  if (u.n >= limit) return false;
  u.n += 1;
  return true;
};

// image data URL -> Claude image block (null if not an image)
export const toImage = (url) => {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(String(url || ""));
  return m ? { type: "image", source: { type: "base64", media_type: m[1], data: m[2] } } : null;
};

// One structured read: images + text -> parsed JSON (or { error, status } for the route to send)
export async function readStructured({ system, images, text, schema, tag, who, best = false }) {
  const ai = getClaude();
  if (!ai) return { status: 503, error: { code: "NO_AI", message: "AI reader is not set up" } };
  const started = Date.now();
  const params = {
    model: best ? MODELS.best : MODELS.quick,
    max_tokens: 16000,
    output_config: { effort: "medium", format: { type: "json_schema", schema } },
    cache_control: { type: "ephemeral" },
    system,
    messages: [{ role: "user", content: [...images, { type: "text", text }] }],
  };
  try {
    // best model: if it declines, the API retries on its fallback model. (The quick model has no server-side
    // fallback; a quick decline is handed to the best model by readSmart instead.)
    const msg = best
      ? await ai.beta.messages.create({ ...params, betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" })
      : await ai.messages.create(params);
    const u = msg.usage || {};
    console.log(`[${tag}] ${best ? "best" : "quick"} ${who || "?"} ${images.length} photo(s) ${msg.stop_reason} in=${u.input_tokens} cached=${u.cache_read_input_tokens || 0} out=${u.output_tokens} ${Date.now() - started}ms`);
    if (msg.stop_reason === "refusal") return { status: 422, error: { message: "The AI could not read this photo - fill it by hand" } };
    if (msg.stop_reason === "max_tokens") return { status: 422, error: { message: "Too much to read in one go - fill the rest by hand" } };
    const out = msg.content.filter((b) => b.type === "text").map((b) => b.text).join("");
    try {
      return { data: JSON.parse(out) };
    } catch {
      return { status: 502, error: { message: "The AI reply could not be read - try again" } };
    }
  } catch (e) {
    console.error(`[${tag}] failed:`, e?.status || "", e?.message);
    if (e instanceof Anthropic.AuthenticationError) return { status: 503, error: { code: "NO_AI", message: "AI reader key is not valid" } };
    if (e instanceof Anthropic.RateLimitError) return { status: 503, error: { message: "AI reader is busy - try again in a minute" } };
    if (e instanceof Anthropic.APIConnectionError) return { status: 503, error: { message: "Could not reach the AI reader - check internet and try again" } };
    if (e instanceof Anthropic.APIError) return { status: 502, error: { message: "AI reader error - try again or fill by hand" } };
    return { status: 500, error: { message: "Could not read it - fill by hand" } };
  }
}

// Quick read first; read again with the best model when the caller's check says the result is doubtful (or the quick
// model declined / failed to give a usable answer). best=true goes straight to the best model ("Read again (best)").
// -> { data, model: "quick" | "best", escalated, reasons } or { status, error }
export async function readSmart({ best = false, needsBest, limitName, limit, ...args }) {
  if (best) {
    const r = await readStructured({ ...args, best: true });
    return r.error ? r : { ...r, model: "best", escalated: false, reasons: [] };
  }
  const q = await readStructured({ ...args, best: false });
  if (q.error && (q.error.code === "NO_AI" || q.status === 503)) return q;
  const reasons = q.error ? ["the quick read failed"] : needsBest(q.data);
  if (!reasons.length) return { ...q, model: "quick", escalated: false, reasons: [] };
  if (!takeRead(limitName, limit)) return q.error ? q : { ...q, model: "quick", escalated: false, reasons };
  const b = await readStructured({ ...args, best: true });
  if (b.error) return q.error ? b : { ...q, model: "quick", escalated: false, reasons };
  return { ...b, model: "best", escalated: true, reasons };
}
