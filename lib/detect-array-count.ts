// Detects the number of solar arrays / mounting planes from a LightReach
// planset (CAD design) PDF pulled from SubcontractorHub. On the final CAD
// design, each roof array is notated as a "mounting plane" (often on the site
// plan / array layout page, and summarized in a module/array table). We read
// the planset with the LLM and extract that count so R4 (Under Array Wire
// Management) can require ONE under-array photo per array.

import { analyzeDocumentOrImage } from "@/lib/claude-vision";

export interface ArrayCountResult {
  count: number | null;
  source: string; // short human-readable note on how it was determined
}

/**
 * Reads a planset PDF (public URL) and returns the number of distinct roof
 * arrays / mounting planes in the design. Returns { count: null } if it
 * cannot be determined reliably.
 */
export async function detectArrayCountFromPlanset(plansetUrl: string): Promise<ArrayCountResult> {
  if (!plansetUrl) return { count: null, source: "" };
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log("[array-count] ANTHROPIC_API_KEY not set — skipping detection");
    return { count: null, source: "" };
  }

  try {
    // 1. Download the planset file.
    const r = await fetch(plansetUrl, { cache: "no-store" });
    if (!r.ok) {
      console.log(`[array-count] planset fetch failed: HTTP ${r.status}`);
      return { count: null, source: "" };
    }
    const buf = Buffer.from(await r.arrayBuffer());
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    const isPdf = ct.includes("pdf") || plansetUrl.toLowerCase().includes(".pdf");
    const base64 = buf.toString("base64");

    // Guard against absurdly large payloads (base64 of >20MB PDF).
    if (base64.length > 28_000_000) {
      console.log("[array-count] planset too large to analyze");
      return { count: null, source: "" };
    }

    const prompt =
      "You are reading a residential solar PLANSET / CAD design document.\n\n" +
      "On these designs, every distinct roof plane that has solar modules on it is called a MOUNTING PLANE (also referred to as an array, roof segment, roof face, or sub-array). Different mounting planes usually have a different azimuth (compass orientation) and/or tilt, and are listed separately in the module/array layout table or the site plan.\n\n" +
      "Your task: determine how many SEPARATE MOUNTING PLANES (arrays) of solar modules are in this design.\n\n" +
      "How to count reliably:\n" +
      "- Look for an array / module layout table that lists each roof plane with its azimuth, tilt, and module quantity. Count the number of distinct roof-plane rows (each row = one mounting plane).\n" +
      "- Also look at the roof/site plan drawing showing the modules laid out on the roof. Count the number of separate groups of panels on distinct roof faces.\n" +
      "- Do NOT count the total number of modules/panels. Count the number of distinct roof planes/arrays the modules are grouped into.\n" +
      "- If the whole system sits on a single roof face, the answer is 1.\n\n" +
      "Respond ONLY as raw JSON (no markdown, no code block) with this exact schema:\n" +
      '{"mounting_planes": <integer or null>, "confidence": "high"|"medium"|"low", "evidence": "where in the document you found this (e.g. array table, site plan) and the azimuth/tilt values per plane if visible"}\n' +
      "Set mounting_planes to null only if the document genuinely does not show the array layout.";

    const result = await analyzeDocumentOrImage({
      userText: prompt,
      base64,
      mimeType: ct || "image/png",
      isPdf,
      maxTokens: 700,
    });

    if (!result.ok) {
      console.log(`[array-count] LLM error: ${result.errorText?.slice(0, 200)}`);
      return { count: null, source: "" };
    }

    const parsed = JSON.parse(result.content || "{}");
    const raw = parsed?.mounting_planes;
    const n = typeof raw === "number" ? Math.round(raw) : parseInt(String(raw ?? ""), 10);
    if (!Number.isFinite(n) || n < 1 || n > 40) {
      console.log("[array-count] no reliable count from planset", raw);
      return { count: null, source: "" };
    }
    const conf = String(parsed?.confidence ?? "").toLowerCase();
    const evidence = String(parsed?.evidence ?? "").slice(0, 300);
    console.log(`[array-count] detected ${n} mounting plane(s) (confidence=${conf}) — ${evidence}`);
    return { count: n, source: `Detected from planset CAD (${conf || "n/a"} confidence): ${evidence}` };
  } catch (e: any) {
    console.log("[array-count] detection error:", e?.message);
    return { count: null, source: "" };
  }
}
