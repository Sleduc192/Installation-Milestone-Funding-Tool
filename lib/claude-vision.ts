// Vision AI helper — replaces the old Abacus-hosted OpenAI-compatible
// endpoint (`https://subcontractorhub.abacus.ai/v1/chat/completions`) with
// direct calls to Anthropic's Claude API. All the classification prompts
// themselves (in lib/analyze-photo.ts, app/api/analyze/route.ts, and
// lib/detect-array-count.ts) are unchanged — only the transport layer here
// is new.

import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Configurable so the model can be bumped later without touching call sites.
export const VISION_MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

export interface VisionResult {
  ok: boolean;
  content: string; // raw JSON text
  errorText?: string;
}

function splitDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const match = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl ?? "");
  if (match) return { mediaType: match[1], data: match[2] };
  // Already raw base64 with no data: prefix — assume JPEG.
  return { mediaType: "image/jpeg", data: dataUrl };
}

/**
 * Analyze a single image against an optional system prompt + user text.
 * Mirrors the old "system + user(text,image)" OpenAI-style call used
 * throughout the classification code.
 *
 * Claude doesn't have an OpenAI-style `response_format: json_object` toggle,
 * so we prefill the assistant turn with "{" — the model's reply continues
 * straight into JSON instead of prose or markdown fences, and we re-attach
 * the "{" ourselves before returning the text.
 */
export async function analyzeImage(opts: {
  systemPrompt?: string;
  userText: string;
  imageBase64: string; // data: URL
  maxTokens?: number;
}): Promise<VisionResult> {
  const { systemPrompt, userText, imageBase64, maxTokens = 2000 } = opts;
  const { mediaType, data } = splitDataUrl(imageBase64);

  try {
    const msg = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: maxTokens,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image", source: { type: "base64", media_type: mediaType as any, data } },
          ],
        },
        { role: "assistant", content: "{" },
      ],
    });
    const block = msg.content?.[0];
    const text = block && block.type === "text" ? block.text : "";
    return { ok: true, content: "{" + text };
  } catch (e: any) {
    return { ok: false, content: "{}", errorText: e?.message ?? String(e) };
  }
}

/**
 * Analyze a document (PDF, read natively) or a plain image with a single
 * user-turn prompt and no system prompt — used for reading the planset CAD
 * file to count mounting planes/arrays.
 */
export async function analyzeDocumentOrImage(opts: {
  userText: string;
  base64: string; // raw base64, no data: prefix
  mimeType: string;
  isPdf: boolean;
  maxTokens?: number;
}): Promise<VisionResult> {
  const { userText, base64, mimeType, isPdf, maxTokens = 700 } = opts;

  try {
    const fileBlock: any = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: mimeType || "image/png", data: base64 } };

    const msg = await anthropic.messages.create({
      model: VISION_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "user", content: [fileBlock, { type: "text", text: userText }] },
        { role: "assistant", content: "{" },
      ],
    });
    const block = msg.content?.[0];
    const text = block && block.type === "text" ? block.text : "";
    return { ok: true, content: "{" + text };
  } catch (e: any) {
    return { ok: false, content: "{}", errorText: e?.message ?? String(e) };
  }
}
