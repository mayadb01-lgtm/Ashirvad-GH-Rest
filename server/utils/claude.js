// Shared Claude (Anthropic) client for the AI readers (purchase bills, guest IDs).
// Needs ANTHROPIC_API_KEY in /etc/ashirvad.env; without it every reader answers "not set up" and screens fall back.
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";
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
export async function readStructured({ system, images, text, schema, tag, who }) {
  const ai = getClaude();
  if (!ai) return { status: 503, error: { code: "NO_AI", message: "AI reader is not set up" } };
  const started = Date.now();
  try {
    const msg = await ai.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default", // if the model declines, the API retries on its fallback model
      output_config: { effort: "medium", format: { type: "json_schema", schema } },
      cache_control: { type: "ephemeral" },
      system,
      messages: [{ role: "user", content: [...images, { type: "text", text }] }],
    });
    const u = msg.usage || {};
    console.log(`[${tag}] ${who || "?"} ${images.length} photo(s) ${msg.stop_reason} in=${u.input_tokens} cached=${u.cache_read_input_tokens || 0} out=${u.output_tokens} ${Date.now() - started}ms`);
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
