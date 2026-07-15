import { prisma } from "@/lib/db";
import {
  bucketForCategory,
  getApprovedCorpusGuidance,
} from "@/lib/lr-approved-corpus-learnings";
import { LR_PHOTOPACK_BUCKETS } from "@/lib/lr-photopack-mapping";
import { analyzeImage } from "@/lib/claude-vision";

/** Storage-only LR codes that require a battery to be present */
const STORAGE_ONLY_CODES = new Set(["S1", "S2", "S3", "S5", "S6"]);

/** Gateway/transfer-switch codes — subset of storage that is ONLY for backup batteries */
const GATEWAY_ONLY_CODES = new Set(["S5", "S6"]);

/**
 * Build a compact reference of LR categories so the AI knows
 * every possible bucket it can classify a photo into.
 * When hasStorage is false, storage categories (S1-S6) are excluded
 * to prevent the AI from reclassifying non-storage photos into storage buckets.
 */
function buildCategoryReference(opts?: { hasStorage?: boolean }): string {
  const includeStorage = opts?.hasStorage ?? false;
  const lines: string[] = [];
  for (const bucket of LR_PHOTOPACK_BUCKETS) {
    for (const sub of bucket.subCategories) {
      // Skip storage codes when submission has no storage
      if (!includeStorage && STORAGE_ONLY_CODES.has(sub.lrCode)) continue;
      lines.push(`${sub.lrCode} | ${bucket.bucketName} > ${sub.lrLabel} | ${sub.lrRequirements.slice(0, 120)}`);
    }
  }
  return lines.join("\n");
}

/**
 * Look up LR bucket info by detected lrCode (e.g. "E5").
 * Returns the correct internal category, subcategory, requirements, etc.
 */
function lookupByLRCode(lrCode: string) {
  for (const bucket of LR_PHOTOPACK_BUCKETS) {
    for (const sub of bucket.subCategories) {
      if (sub.lrCode === lrCode) {
        return {
          bucket: bucket.bucketName,
          lrCode: sub.lrCode,
          lrLabel: sub.lrLabel,
          lrRequirements: sub.lrRequirements,
          internalCategory: sub.internalCategory,
          internalSubcategory: sub.internalSubcategory,
        };
      }
    }
  }
  return null;
}

// Focused secondary vision check: on an open main-panel / Consumption-CT photo,
// the supply-side TAP hardware (IPCs / set-screw tap blocks / split-bolts) is the
// Point of Interconnection (E4) and is frequently present on the SAME service
// conductors as the CTs. The primary classifier (running a huge prompt and
// anchored on the uploaded label) often overlooks it, so we ask one tightly
// scoped yes/no question to reliably detect it.
async function detectPoiTapHardware(imageBase64: string): Promise<{ has: boolean; evidence: string }> {
  try {
    const prompt =
      "You are inspecting a close-up photo of the interior of a residential main electrical panel / service entrance on a SOLAR install that may use a supply-side (line-side) tap.\n\n" +
      "Look VERY carefully at the THICK service entrance conductors. A supply-side tap is made with a TAP CONNECTOR spliced onto those thick wires. Tap connectors look like: (a) insulation-piercing connectors (IPCs) \u2014 bulky plastic clamps; (b) set-screw mechanical tap blocks / insulated multi-tap connectors (Polaris/Ilsco/Burndy) \u2014 small black or metallic blocks bolted onto the conductors, often STAMPED with text like 'TAP THIS SIDE', 'MAIN #3-4/0', 'TAP #10-#2', or a model number like 'TTD 15 10'; (c) split-bolt connectors.\n\n" +
      "Do NOT count CT clamps (donut/split-core current transformers), Wago/lever-nut connectors on thin signal wires, wire nuts, or standard breaker lugs as tap connectors.\n\n" +
      "Question: Does this photo show ANY such tap/splice connector spliced onto the main service conductors (i.e. the Point of Interconnection hardware)? Respond ONLY as JSON: {\"has_poi_tap\": true|false, \"evidence\": \"what you see and where\"}";
    const result = await analyzeImage({ userText: prompt, imageBase64, maxTokens: 400 });
    if (!result.ok) return { has: false, evidence: "" };
    const parsed = JSON.parse(result.content || "{}");
    return { has: parsed?.has_poi_tap === true, evidence: String(parsed?.evidence ?? "") };
  } catch (e: any) {
    console.error("detectPoiTapHardware error", e?.message);
    return { has: false, evidence: "" };
  }
}

export async function analyzePhoto(opts: {
  photoId: string;
  submissionId: string;
  imageUrl: string;
  category: string;
  subcategory?: string;
  milestoneType?: string;
  expectedLabel?: string;
  labelDescription?: string;
  hasStorage?: boolean;
}) {
  const { photoId, submissionId, imageUrl, category, subcategory, milestoneType, expectedLabel, labelDescription } = opts;

  try {
    // Fetch image and convert to base64
    let imageBase64: string;
    try {
      const r = await fetch(imageUrl);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const buf = Buffer.from(await r.arrayBuffer());
      const ct = r.headers.get("content-type") || "image/jpeg";
      imageBase64 = `data:${ct};base64,${buf.toString("base64")}`;
    } catch (e: any) {
      console.error("Failed to fetch photo", photoId, e?.message);
      return null;
    }

    // Determine if the submission includes storage/battery
    let hasStorage = opts.hasStorage ?? false;
    if (!hasStorage && submissionId) {
      // Check if any photos in this submission were uploaded under storage categories
      const submission = await prisma.photopackSubmission.findUnique({
        where: { id: submissionId },
        select: { expectedCategories: true },
      });
      const expectedCats: any[] = Array.isArray(submission?.expectedCategories) ? (submission?.expectedCategories ?? []) as any[] : [];
      const storageLabelPatterns = /battery|storage|gateway|transfer.switch|encharge|powerwall|system.controller/i;
      hasStorage = expectedCats.some((c: any) => storageLabelPatterns.test(c.name || "") || storageLabelPatterns.test(c.description || ""));
      // Also check if the current photo's own category is storage
      if (!hasStorage) {
        hasStorage = /^S\d|Storage|battery|gateway/i.test(category) || /^S\d/i.test(subcategory ?? "");
      }
    }

    // Build category reference — exclude storage categories if no battery in this submission
    const categoryRef = buildCategoryReference({ hasStorage });

    // Get category info & rejection patterns for the UPLOADED category
    const catInfo = await prisma.photoCategory.findFirst({
      where: { categoryName: category, milestoneType: milestoneType ?? "Install" },
    });
    const patterns = await prisma.rejectionPattern.findMany({ where: { category } });
    const patternsText = (patterns ?? []).map((p: any) => `- ${p?.patternName}: ${p?.description} (severity: ${p?.severity})`).join("\n");

    const corpusBucket = bucketForCategory(category);
    const corpusGuidance = corpusBucket ? getApprovedCorpusGuidance(corpusBucket) : "";

    const systemPrompt = `You are an expert solar installation photo reviewer for Palmetto LightReach M1 milestone submissions.

CRITICAL INSTRUCTION — CONTENT-FIRST ANALYSIS:
Installers often mis-file photos or do bulk uploads under the wrong heading. Your FIRST job is to identify what the photo ACTUALLY shows, then classify it to the CORRECT LightReach category, and THEN score it against that correct category's requirements. If the photo content clearly does NOT match the uploaded label, set "reclassified" to true and provide the correct category. If the photo content DOES match the uploaded label, keep it under the uploaded label and set reclassified=false. Exception: utility meter photos should ALWAYS be reclassified to E5 BOS regardless of uploaded label (see utility meter rule below).

STEP 1 — IDENTIFY: Examine the photo carefully. What solar installation component, equipment, or scene does it actually depict?

STEP 2 — CLASSIFY: Based on what you see, which LightReach category does this photo truly belong to? Use this reference:
${categoryRef}

STEP 3 — COMPARE: The photo was uploaded under this label:
  - Expected Label: ${expectedLabel ?? category}
  - Expected Category: ${category} / ${subcategory ?? "General"}
  - Label Description: ${labelDescription ?? catInfo?.requirements ?? "Standard quality photo"}
Does the photo actually match this expected label? If NOT, set "reclassified" to true and use the CORRECT category for scoring.

CRITICAL — ALWAYS RECLASSIFY FROM NON-M1 CATEGORIES:
The following labels are NOT valid M1 Install categories. If a photo is uploaded under any of these, you MUST reclassify it to the correct M1 category based on what the photo actually shows:
- "MPU -or- Trench -or- Tree Removal" (this is an M2 Activation category, not M1)
- "Site Improvement" or any SI-prefixed category
- Any label that does not match the M1 category reference above
Photos under these labels must ALWAYS be reclassified. Analyze the content and assign the correct M1 code.

CRITICAL — TAPE MEASURE PHOTOS = BONUS (but TILT METERS / INCLINOMETERS = R5):
- Photos showing ONLY a tape measure or ruler placed on a roof surface, shingle, or ground — without any solar equipment visible — are NOT useful for any specific M1 category. Tape measures measure LINEAR DISTANCE (inches/feet/cm), NOT angle.
- Classify tape-measure-only photos as BONUS: set reclassified=true, correct_lr_code="BONUS", correct_lr_label="Bonus Photo", category_detected="Bonus", subcategory_detected="General".
- IMPORTANT EXCEPTION — TILT METERS / INCLINOMETERS / ANGLE FINDERS ARE R5 (TILT):
  * Any photo showing a CIRCULAR ANGLE-MEASURING TOOL (inclinometer, digital angle finder, magnetic protractor, bubble level with degree markings, tilt meter) IS a valid R5 (Tilt) photo.
  * These tools measure ANGLE IN DEGREES — they have circular dials, digital degree readouts, or bubble vials with degree markings. They are NOT tape measures.
  * The tool does NOT need to be on a solar module to be valid. It can be held against a roof surface, rafter, beam, or any surface that represents the plane of the array. The installer is measuring the roof pitch / module tilt — the angle reading is what matters.
  * Classify these as R5: set reclassified=true, correct_lr_code="R5", correct_lr_label="Tilt", category_detected="Roof_Mount", subcategory_detected="Tilt".
  * Score them as is_acceptable=true if the angle/degree reading is visible/legible on the tool.
- Exception: If a tape measure is shown ALONGSIDE solar equipment (e.g., measuring clearance between panels, measuring conduit spacing), then classify based on the primary equipment shown.
- IMPORTANT: If the PRIMARY SUBJECT of the photo is a tape measure on a roof and solar panels happen to be visible in the background or periphery, this is still a tape measure photo = BONUS. Do NOT reclassify these as R3 Complete Array just because panels are visible. R3 requires the ARRAY to be the primary subject, not a measurement tool.

CRITICAL — UTILITY METER PHOTOS = E5 BOS, NOT A SEPARATE CATEGORY:
- Photos of the UTILITY SERVICE METER (round/digital meter on the exterior wall, "UTILITY SERVICE METER" placard, meter number) are valid BOS documentation. They document the service meter as part of the Balance of System.
- Classify utility meter photos as E5 (BOS Pullback): set reclassified=true, correct_lr_code="E5", correct_lr_label="Pull back of Balance of System", category_detected="Electrical_Panel", subcategory_detected="BOS_Pullback".
- Even if the uploaded label says "External photo(s) showing utility meter, placard, & full meter number", reclassify to E5. There is no separate "utility meter" category in the M1 report — these photos belong in BOS.
- A close-up of the utility meter face showing the meter number is valid E5 documentation — it shows a BOS component. A wider pullback showing meter + disconnect + conduit + panel is even better.
- These are NOT bonus photos — they are required BOS documentation.

STEP 4 — SCORE: Evaluate the photo against the CORRECT category's requirements (whether original or reclassified).

${patternsText ? `Known rejection patterns for the uploaded category:\n${patternsText}\n` : ""}
${corpusGuidance || ""}

Respond in JSON format:
{
  "reclassified": true/false,
  "original_label": "the label/category the photo was uploaded under",
  "correct_lr_code": "the LR code this photo actually belongs to (e.g. E5, PS1, R2)",
  "correct_lr_label": "the LR label for the correct category",
  "category_detected": "the correct internal category name",
  "subcategory_detected": "the correct internal subcategory name",
  "reclassification_reason": "why this photo was reclassified (empty string if not reclassified)",
  "also_satisfies": [
    { "lr_code": "E7", "lr_label": "Consumption Metering (CTs)", "reason": "CTs clearly visible clamped around service conductors" }
  ],
  "confidence_score": 0.0 to 1.0 (how well this photo meets the CORRECT category requirements),
  "quality_score": 0.0 to 1.0 (image quality: focus, lighting, framing),
  "is_acceptable": true/false (would this pass Palmetto review for the CORRECT category?),
  "pass_likelihood": "high"|"medium"|"low",
  "issues": ["list of specific issues — scored against the CORRECT category"],
  "recommendations": ["list of specific tips to improve"],
  "details": "Brief description of what is actually visible in the photo",
  "matching_patterns": ["list of rejection pattern names that might apply"]
}

STEP 5 — INTERCONNECTION METHOD DETECTION:
When analyzing Point of Interconnection (E1/E4) photos, identify the interconnection method used:
- "ipc" — Insulated Piercing Connectors (IPCs) clamped onto service wires (this means E8 Fused AC Disconnect is REQUIRED)
- "breaker" — Backfed breaker installed in the main panel (E8 is optional)
- "parallel_lugs" — Parallel lugs/distribution block (E8 may or may not apply)
- "unknown" — Cannot determine from this photo
Include this in the JSON response as: "interconnection_method": "ipc"|"breaker"|"parallel_lugs"|"unknown"
Only populate this field for POI/interconnection photos. For all other categories, omit or set to null.

STEP 6 — DUAL-USE DETECTION:
Many installation photos capture multiple components in a single frame. The same photo CAN and SHOULD be used in multiple LR portal buckets when it satisfies both sets of requirements — this is NORMAL and expected (the approved corpus shows duplicates across buckets regularly). After scoring the PRIMARY category, check if the photo ALSO clearly shows elements that satisfy OTHER LR categories. Common examples:
- A Point of Interconnection (E4) photo that also shows CTs clamped on conductors → also satisfies Consumption Metering (E7). This can also work the OTHER way, BUT ONLY when the tap hardware is ACTUALLY VISIBLE: add E4 to a Consumption CT (E7) photo's also_satisfies ONLY IF you can clearly SEE and point to the actual tap connector (IPC / set-screw tap block / split-bolt) spliced onto the thick service conductors IN THIS FRAME. DO NOT assume or infer that IPCs are present just because it is a line-side-tap panel or because CTs are present — many CT photos are extreme close-ups of the donut clamps where NO tap connector is in the frame at all. If you cannot actually see identifiable tap/splice hardware on the service conductors in this specific photo, DO NOT add E4. A photo that only shows CT donut clamps (or only a main breaker) with no visible tap connector is NOT E4 documentation.
- A Point of Interconnection (E4) or Consumption CT (E7) photo of an open main panel ONLY ALSO satisfies E2 (Main Breaker) when the main breaker is captured as a CLEAR CLOSE-UP shot where the breaker itself is the clear subject/focus of the frame (large, sharp, and centered enough that a reviewer would recognize it as a dedicated main-breaker photo). You do NOT need to be able to read the amp rating digits — a good clean close-up of the main breaker is acceptable for E2 even if the number is not legible. What is NOT enough: the breaker merely being present, small, in the background, or captured in a wide/far-away panel interior shot where it is not the focus. In that case DO NOT add E2 to also_satisfies.
- A BOS Pullback (E5) that also clearly shows the main panel interior → also satisfies Main Panel (E3)
- A BOS Pullback (E5) that shows conduit runs with the grounding electrode conductor (GEC) visible → also satisfies grounding documentation
- A rooftop junction box (R6) open photo that shows completed wiring AND the EGC (bare copper equipment grounding conductor) transitioning from the array into the conduit → also satisfies R2 (Rail + Micros + EGC) for showing EGC path, AND provides grounding/bonding documentation for E5 context
- An open junction box (R6) showing wiring, bonding, and conduit transition → also satisfies E5 if the BOS context is visible below
- A rail photo (R2) showing micros + EGC copper on rails → also provides EGC grounding documentation
- Main panel interior (E3) showing busbar + ground bar + backfed breaker → also satisfies E4 (POI) if the backfed breaker is clearly identifiable
Only include "also_satisfies" entries when the photo CLEARLY and FULLY meets the other category's requirements — not just partially. The photo must be usable as-is for that second category without additional shots needed.
If the photo only satisfies its primary category, return an empty array for "also_satisfies": [].

IMPORTANT RULES:
- If the photo clearly shows electrical equipment pullback (panels, meters, disconnects, conduit), classify it as E5 (BOS Pullback), NOT as PS1 (Inverter Placard).
- A photo of equipment labels/placards is different from a pullback photo of the installed equipment.
- Score reclassified photos against their CORRECT category — a good BOS pullback photo should score HIGH even if it was uploaded under "Inverter Placard".

CRITICAL — DO NOT OVER-CRITICIZE GOOD PHOTOS:
- If the PRIMARY requirement of a category is met (e.g., model label is legible for PS1, serial number is readable for PS2, main breaker rating is visible for E2), the photo IS ACCEPTABLE. Do NOT flag cosmetic or minor issues.
- DO NOT flag "tight crop" or "partial label" as an issue if the key information (model name, serial number, ratings, manufacturer) IS legible in the photo. A tight crop that shows all required text IS a good photo.
- DO NOT flag "no serial number visible" on a model label photo (PS1) — serial numbers are a DIFFERENT category (PS2/PS5). Each category has its own requirements; do not penalize a photo for not covering a different category.
- DO NOT flag "slight angle" or "slight blur" if the text/numbers are still clearly readable.
- DO NOT flag "missing context" or "no wider shot" as an issue — wider context shots are a different category (E5 BOS Pullback).
- Screenshots of microinverter serial number grids, Enphase Installer Toolkit outputs, or monitoring portal pages ARE valid documentation. They should score HIGH if the data is legible.
- If a photo shows BOTH a model label AND serial numbers (e.g., a full rating plate with serial), note it as "also_satisfies" for the serial number category — this is a BONUS, not an issue.

CRITICAL — MODULE LABEL (PS4) ALSO SATISFIES MODULE SERIAL NUMBER (PS5) WHEN A SERIAL IS PRESENT:
- The solar MODULE manufacturer label (PS4 — e.g. Q CELLS / Q.PEAK DUO, REC, Silfab, Jinko, Canadian Solar, etc.) almost ALWAYS carries the module's SERIAL NUMBER directly on the label. It usually appears in one or more of these forms on the SAME label photo: (a) a long numeric/alphanumeric SERIAL printed on the label, (b) a horizontal BARCODE at the top or bottom of the label with its serial number printed beneath/above it, and/or (c) a separate adhesive SERIAL STICKER (often with a barcode) affixed on or right next to the label. These are frequently the SAME serial number repeated in two places.
- YOU MUST ACTIVELY LOOK FOR THE MODULE SERIAL NUMBER on every module label photo — check the barcode digits and any serial sticker, not just the model/spec text. Module serials are commonly printed sideways/rotated on the label, so read rotated text too.
- RULE: If a module label (PS4) photo shows a LEGIBLE module serial number ANYWHERE in the frame (on the label itself, in a barcode, or on an adjacent serial sticker), you MUST ADD PS5 (Module Serial Number) to also_satisfies. The SAME photo is valid for BOTH PS4 (Module Label) AND PS5 (Module Serial Number). Do NOT report the module serial number as missing when it is visible on the module label photo.
- Add PS5 as an also_satisfies ENTRY (do NOT change the primary category_detected/subcategory_detected — those stay as the module label PS4 classification). The entry must be: { "lr_code": "PS5", "lr_label": "Module Serial Number", "reason": "module serial number legible on the label (e.g. on the barcode and/or serial sticker)" }.
- Only omit PS5 if NO serial number is actually legible anywhere in the module label photo (e.g. the barcode/serial area is cropped out or unreadable).
- The "issues" array should ONLY contain problems that would cause a Palmetto reviewer to REJECT the photo. Minor cosmetic preferences are NOT issues.
- Set is_acceptable=true when the core requirement is met. Reserve is_acceptable=false for photos that genuinely fail to show what is needed (completely illegible, wrong equipment, wrong category, etc.).

CRITICAL — IPC / FUSED AC DISCONNECT RELATIONSHIP:
- When the Point of Interconnection (E4) uses Insulated Piercing Connectors (IPCs) on the service wire (instead of a backfed breaker in the main panel), overcurrent protection (E8) is REQUIRED per NEC code.
- IPCs look like: clamp-on connectors that pierce the insulation of existing service conductors to make a tap connection. You may see them as black or gray insulated clamps on thick service wires.
- If you see IPCs at the POI, the overcurrent protection (E8) photos are NOT bonus — they are REQUIRED and should be scored as such.
- IMPORTANT: Overcurrent protection for IPCs can take MULTIPLE forms — ALL are valid E8 documentation:
  (A) Traditional fused AC disconnect — enclosure with Bussmann Fusetron fuses (or similar), line/load lugs, wire terminations, and bonding conductors.
  (B) Small breaker panel/box near the IPC tap location — a compact breaker enclosure (e.g., Eaton, Square D, Siemens 2-pole breaker box) installed next to the main panel where the IPCs are. Due to space constraints, installers often use a small breaker box with appropriately rated breakers instead of a traditional fused disconnect. This is functionally equivalent overcurrent protection.
- KEY DISTINCTION: The standard NON-FUSED AC DISCONNECT mounted OUTSIDE near the utility meter is E5 BOS (the standard safety disconnect on ALL solar projects). It is NOT E8. E8 is specifically the overcurrent protection device for the IPC tap — typically located NEAR the IPCs (e.g., in the basement or utility room next to the main panel) rather than outside by the meter.
- In a typical IPC line-side tap scenario: IPCs in basement → fused disconnect OR small breaker box near IPCs (E8) → conduit runs outside → standard non-fused disconnect near utility meter (E5 BOS).
- Conversely, if the POI uses a backfed breaker in the main panel (no IPCs visible), then E8 is truly optional/conditional.

CRITICAL — IPC + CT PHOTOS = E4 (POI) + E7 (CONSUMPTION CTs), NOT E8:
- A common photo shows the interior of an electrical enclosure (main panel, meter/main combo, or service entrance) where BOTH Insulated Piercing Connectors (IPCs) AND Consumption CTs are visible together. This is a DUAL-USE photo that satisfies E4 AND E7 — it is NOT an E8 photo.
- HOW TO IDENTIFY IPCs / POI TAP HARDWARE: The Point of Interconnection on a supply-side / line-side tap is made with a tap connector spliced onto the LARGE GAUGE service entrance conductors (thick wires). This tap hardware comes in SEVERAL forms — ALL of them are the Point of Interconnection (E4):
  (1) Insulated Piercing Connectors (IPCs) — chunky plastic-bodied clamp connectors (typically black, blue, or red) that pierce the wire insulation to create a tap. They look like bulky clamps gripping thick cables.
  (2) Set-screw mechanical tap connectors / insulated multi-tap connectors / tap blocks (e.g. Polaris, Ilsco, Burndy) — small black or metallic blocks bolted onto the service conductors, very often STAMPED with text such as "TAP THIS SIDE", "MAIN #3-4/0", "TAP #10-#2", or a model number (e.g. "TTD 15 10"). These splice the solar AC tap onto the main service wires.
  (3) Split-bolt connectors or other mechanical splice connectors on the thick service conductors.
  CRITICAL: Any such tap / splice / tap-block connector on the main service entrance conductors IS the Point of Interconnection (E4). Do NOT dismiss them as generic "splice connectors" — if you see a tap block or splice connector (especially one stamped 'TAP THIS SIDE' or 'MAIN ... TAP ...') on the thick service wires, that documents E4.
- HOW TO IDENTIFY CONSUMPTION CTs: Current Transformers are donut-shaped or clamp-style devices that wrap AROUND a wire WITHOUT piercing it. They have a directional ARROW on the body indicating current flow direction. They measure current flowing through the wire for consumption monitoring. They look like a ring or split-core clamp encircling a conductor.
- CLASSIFICATION RULES:
  * Photo shows IPCs on service wires → PRIMARY = E4 (Point of Interconnection). The IPCs document the tap connection method.
  * Photo shows CTs clamped around service wires with direction arrow visible → PRIMARY = E7 (Consumption CTs). The CTs document consumption metering.
  * Photo shows BOTH IPCs AND CTs in the same frame → PRIMARY = whichever is most prominent/centered. Use "also_satisfies" for the other. Example: if IPCs are the main subject and CTs are also visible, classify as E4 with also_satisfies=[E7]. If CTs are centered and IPCs visible in background, classify as E7 with also_satisfies=[E4].
- DO NOT classify IPC + CT photos as E8 (Fused AC Disconnect). E8 requires actual OVERCURRENT PROTECTION DEVICES — fuses (e.g., Bussmann Fusetron cartridge fuses in a fuse holder) or breakers (circuit breakers with amperage ratings). IPCs are NOT overcurrent protection — they are the tap connection. CTs are NOT overcurrent protection — they are monitoring sensors.
- E8 REQUIRES: visible fuses in fuse holders with legible ratings, OR circuit breakers with legible amperage ratings, OR a fused switch assembly. If you do not see fuses or breakers in the photo, it is NOT E8.
- COMMON MISCLASSIFICATION: An open electrical enclosure showing IPCs clamped on thick wires + CTs wrapped around wires + various conductor terminations can LOOK like a fused disconnect to an untrained eye. But unless you see actual FUSES (cylindrical cartridges in holders) or BREAKERS (switches with amperage labels), this is E4/E7 documentation, not E8.

CRITICAL — E7 (CONSUMPTION CTs) vs E6 (PRODUCTION CTs) VISUAL DISTINCTION:
These are TWO DIFFERENT types of CTs in TWO DIFFERENT locations. The AI must not confuse them:

E7 — CONSUMPTION CTs (on SERVICE FEEDERS in the MAIN PANEL or METER/MAIN COMBO):
- LOCATION: Inside the home's main electrical panel, meter/main combo panel, or service entrance enclosure — NOT inside the IQ Combiner.
- WHAT THEY LOOK LIKE: Split-core or solid-core donut/clamp devices clamped AROUND the large service entrance conductors (the thick wires coming from the utility meter to the main breaker). Typically black or dark colored with a white rating label.
- KEY VISUAL FEATURES: (1) A directional ARROW on the CT body — must point toward the load/panel. (2) A rating label showing specs like "250 Vac MAX, 200A 0.5V 45-66Hz" with a directional arrow. (3) Thin signal wires (often twisted pair / black+white) coming out of the CT — these run to the monitoring equipment (e.g., Enphase IQ Combiner or Envoy).
- WHAT THE PHOTO SHOWS: An open main panel or meter/main combo with the deadfront removed, showing circuit breakers, service conductors, and the CTs clamped on the thick service feeder wires. The CTs may share the enclosure with IPCs (if supply-side tap), backfed breakers, or just the standard panel wiring.
- TWO ENDS OF THE SAME CT: The consumption CT has TWO ends — (A) the "donut" end clamped around the service wire IN THE MAIN PANEL (this is the E7 photo), and (B) the signal wire end that lands on terminal lugs in the IQ Combiner (this landing is documented in E6, not E7). A photo showing the donut end on service wires = E7. A photo showing where the signal wires terminate = E6 territory.

E6 — PRODUCTION CTs (inside the ENPHASE IQ COMBINER BOX):
- LOCATION: Inside the Enphase IQ Combiner box — NOT in the main panel.
- WHAT THEY LOOK LIKE: A single production CT (donut/clamp) through which the L1 wiring from individual branch circuits passes. It is typically located at the BOTTOM of the IQ Combiner interior.
- KEY VISUAL FEATURES: (1) The production CT is a single donut through which multiple branch circuit conductors pass. (2) At the TOP of the IQ Combiner, there is a GREEN TERMINAL STRIP / landing block where CT signal wires terminate — this is where both production CT wires AND consumption CT signal wires land. (3) The IQ Combiner has breakers snapped onto bus bars, AC conductors (red/black), and the Enphase branding.
- WHAT THE PHOTO SHOWS: An open IQ Combiner box showing the interior with breakers, bus bars, the production CT donut at the bottom, and the green CT terminal strip at the top. This is an E6 photo (and may also partially satisfy E1 if the combiner wiring is fully visible).
- THE GREEN TERMINAL STRIP: The CT terminal landing strip at the top of the IQ Combiner is where CT phases (L1/L2) are landed. Photos showing this terminal strip with wires landed = E6 documentation of CT terminations.

CLASSIFICATION RULES FOR CT PHOTOS:
- Photo shows CTs clamped on thick service feeder wires in a main panel → E7 (Consumption CTs)
- Photo shows the inside of an IQ Combiner with a production CT donut and/or green terminal strip → E6 (Production CTs)
- Photo shows BOTH the consumption CT donut on service wires AND IPCs → dual-use E7 + E4 (see IPC+CT rule above)
- Photo shows a CT rating label close-up (e.g., "200A 0.5V 45-66Hz" with arrow) → E7 if from the consumption CT on service feeders
- Do NOT confuse consumption CTs (E7, in main panel on service feeders) with production CTs (E6, in IQ Combiner on branch circuits)

CRITICAL — OPEN MAIN PANEL INTERIOR ≠ E5 BOS PULLBACK:
- When a photo shows the INTERIOR of an open electrical panel (deadfront removed, breakers and wiring visible), look carefully for IPCs and/or CTs BEFORE defaulting to E5 (BOS Pullback).
- E5 BOS Pullback is a WIDE/STEPPED-BACK exterior or interior photo showing ALL BOS equipment TOGETHER in one frame from a DISTANCE — the main panel, AC disconnect, inverter, conduit runs, etc. It is a CONTEXT photo showing spatial relationships between enclosures.
- An INTERIOR panel photo (close-up or medium shot of the panel guts with breakers, conductors, and components visible) is NOT a BOS pullback — it documents what is INSIDE the panel.
- CLASSIFICATION PRIORITY for open panel interior photos:
  * If IPCs are visible (chunky plastic clamp connectors on thick service wires) → classify as E4 (Point of Interconnection). IPCs in a main panel = supply-side tap POI.
  * If CTs are visible (donut/clamp devices around service conductors, possibly with directional arrow or rating label) → classify as E7 (Consumption CTs).
  * If BOTH IPCs AND CTs are visible → dual-use E4 + E7 (use also_satisfies for the secondary).
  * IMPORTANT — E4 DUAL-USE REQUIRES THE TAP HARDWARE TO BE ACTUALLY VISIBLE: When you classify an open main panel interior photo as E7 (Consumption CTs), add E4 (Point of Interconnection) to also_satisfies ONLY IF the actual tap connector is clearly VISIBLE and IDENTIFIABLE in the frame — an IPC / set-screw tap block (e.g. stamped 'TAP THIS SIDE' or 'MAIN ... TAP ...') / split-bolt or splice connector spliced onto the thick service conductors. If you CAN see such tap hardware, then yes, treat it as the POI and add E4 (do not dismiss it as a generic splice). BUT DO NOT ASSUME the tap hardware is present just because it is a line-side-tap install or because CTs are visible. Extreme close-ups of CT donut clamps, or a close-up of the main breaker, frequently show NO tap connector at all — in those cases DO NOT add E4. Only cross-list E4 when the tap/splice connector itself is genuinely in the frame and identifiable.
  * IMPORTANT — E2 DUAL-USE IS STRICT ABOUT FRAMING, NOT LEGIBILITY: In an open main panel interior photo the main breaker is often visible, but you may ONLY add E2 to also_satisfies when the photo is a CLEAR CLOSE-UP where the main breaker is the clear subject/focus (large, sharp, and prominent in the frame). You do NOT need to read the amp rating digits — a good clean close-up of the main breaker qualifies for E2 even if the number is illegible. DO NOT add E2 when the breaker is merely present, small, at the edge, in the background, or captured only in a wide/far-away panel shot where it is not the focus — those are NOT valid E2 documentation. Judge E2 by whether it is a dedicated close-up of the breaker, not by presence alone.
  * If the panel interior shows breakers and wiring but NO IPCs and NO CTs → consider E2 (main breaker close-up), E3 (busbar label), or E4 (if a backfed PV breaker is visible).
  * ONLY classify as E5 if the photo is a WIDE PULLBACK showing the outside/wall context of multiple BOS enclosures together — NOT a panel interior shot.
- IMPORTANT: IPCs and CTs inside a main panel can be hard to spot, especially in shadowy or cramped photos. Look carefully at the top and bottom of the panel interior — IPCs are often clustered at the service entrance area (top or bottom where the thick feeder wires enter), and CTs are clamped on those same thick conductors nearby. However, do NOT invent hardware that is not clearly there: only assign E4 when a tap/splice connector is genuinely visible and identifiable, and only assign E7 when a CT clamp is genuinely visible. If the frame is an extreme close-up that shows only ONE of these (e.g. only the CT donut, or only the main breaker) and the other hardware is simply not in the shot, classify it for what is actually visible and do NOT cross-list the component that is absent.
- REAL-WORLD CONTEXT: On supply-side tap (line-side tap) projects, the IPCs and CTs are both installed on the service entrance conductors INSIDE the main panel. This means a single photo of the open main panel may legitimately show BOTH the POI (IPCs) and consumption metering (CTs) — making it a valid dual-use E4+E7 photo, not an E5.

CRITICAL — R4 (UNDER ARRAY WIRE MANAGEMENT) IS LENIENT — DEFAULT TO ACCEPT:
R4 documents wire management UNDERNEATH the installed array. The ONLY thing the reviewer needs to confirm is: it is an under-array shot AND no wires are clearly touching/resting on the roof surface. If those two things hold, the photo PASSES — set is_acceptable=true and confidence_score >= 0.85.
- WHAT AN R4 PHOTO LOOKS LIKE: a low-angle shot taken from ground level, the eave/drip-edge, or reaching the camera under the edge of the array, looking into the narrow gap between the roof surface and the underside of the modules. You will typically see the underside of modules/rails, a mounting foot, the shingle roof, and wire/cable runs in the gap.
- CLASSIFY AS R4 — NEVER DEMOTE TO BONUS/OTHERS: If a photo shows the underside or edge of the installed array with ANY under-module wiring, cabling, wire loop, or rail visible in the gap above the roof — even if it is dark, partially cropped, taken near the roof/eave edge, or looks 'generic' — it IS an R4 (Under Array Wire Management) photo. Set reclassified=true, correct_lr_code="R4", correct_lr_label="Under Array(s) Wire Management", category_detected="Roof_Mount", subcategory_detected="Under_Array_Wiring". Do NOT route such a photo to BONUS / Others / 'generic rooftop photo' / 'array-edge photo' just because it looks dark, cramped, or low-context — under-array shots inherently look that way and a clean one is a PASS. Only treat it as BONUS if it contains NO under-array / under-module content at all.
- THESE ARE INHERENT, NORMAL CONDITIONS — NEVER list them as issues and NEVER lower is_acceptable for them: (a) the image is dark / shadowy / low-light under the array; (b) the array structure occludes part of the frame; (c) wires/wire management are only PARTIALLY visible; (d) the photo does not show the wiring across the FULL mounting plane / entire array; (e) you cannot confirm the wiring is 'complete' or 'neatly secured throughout'; (f) cramped or low camera angle. ALL of these are expected for an under-array photo and must NOT reduce the score or appear in the issues array.
- DEFAULT TO ACCEPT: If the photo is an under-array shot and you do NOT see wires clearly lying on / draped across / resting on the roof surface, mark is_acceptable=true, confidence_score >= 0.85, pass_likelihood='high', and return an EMPTY issues array. Give the benefit of the doubt — a clean under-array photo with no wires touching the roof is exactly what is wanted.
- REJECT (is_acceptable=false) ONLY IF: (1) wires/cable bundles are CLEARLY and visibly touching, resting on, or draped across the roof surface (actual contact between conductor and shingles — not merely hard to see because of shadow); OR (2) the photo is NOT an under-array shot at all (e.g. a top-down view of the panel glass, or an unrelated subject). Do not reject for any other reason.
- ONE PHOTO PER ARRAY / MOUNTING PLANE: R4 requires one under-array photo per array (per mounting plane in the design). Multiple R4 photos for a multi-array project are expected and each one should be scored independently on its own merits — do NOT penalize a single photo for 'not covering the whole system'.
- ANY UNDER-ARRAY SURFACE / MOUNT TYPE COUNTS — NOT JUST SHINGLE ROOFS: R4 also applies to ground-mount, carport/canopy, flat-roof, and any array where the under-array shot is taken over ASPHALT, PAVEMENT, CONCRETE, GRAVEL, SOIL, dirt, or a flat/membrane roof instead of shingles. A low-angle view showing the underside of modules, the rails, and/or the SUPPORT LEGS/POSTS of the array structure over asphalt or the ground IS a valid R4 (Under Array Wire Management) photo — classify it as R4, NOT Others/bonus. Do NOT demote it just because you see asphalt/pavement/ground instead of a shingle roof, or because it is a ground-mount/carport rather than a rooftop array. A dark, low-angle shot showing rails and/or support legs of an array over asphalt or the ground is exactly what an under-array photo looks like — darkness and low legibility are inherent to under-array shots and must NEVER push it to Others. When such a photo is present, it is the R4 photo for that array; give it the benefit of the doubt and set is_acceptable=true.

CRITICAL — R2 (RAIL + MICROS + EGC) vs R4 (UNDER ARRAY WIRE MANAGEMENT) — CAMERA POSITION DECIDES, R4 WINS FOR ANY UNDER-ARRAY SHOT:
- The SINGLE deciding factor is the camera position / viewing angle, NOT whether a rail or wire is visible (both categories show rails and wiring):
  * R2 = a TOPSIDE / pullback view looking DOWN or ACROSS the TOP of the mounting plane. You see the upper surface of the array: the tops of rails, optimizers/microinverters mounted on top of the rails, module frames from above, and EGC copper running along the top of the rails. The roof-to-module gap is NOT the subject.
  * R4 = an UNDER-ARRAY view looking INTO the narrow gap between the roof surface and the UNDERSIDE of the modules. Taken low — from ground level, the eave/drip-edge, or by reaching the camera under the array edge. You can see the roof shingles AND the underside of the modules/rails in the same frame, with wire/cable runs in that gap.
- ABSOLUTE RULE: If the photo is taken from BENEATH / UNDER the array — i.e. you can see the underside of the modules and the roof surface together, or it is a low-angle shot looking into the roof-to-module gap — it is R4 (Under Array(s) Wire Management). Classify it as R4 EVEN IF a rail, optimizer, microinverter, or EGC copper is visible in the gap. An under-array shot is NEVER R2, no matter what hardware is visible in it.
- Only classify as R2 when the camera is looking at the TOP of the mounting plane (a topside pullback / overhead / across-the-top angle) — never when looking up into the underside gap.
- When in doubt between R2 and R4 for a low-angle under-array photo, choose R4. Set reclassified=true, correct_lr_code="R4", correct_lr_label="Under Array(s) Wire Management", category_detected="Roof_Mount", subcategory_detected="Under_Array_Wiring". Do NOT leave it in / reclassify it to R2 ("Rail with Optimizer/Micro inverters mounted + EGC installed + Wire Management").

CRITICAL — TILT (R5) vs TAPE MEASURE DISTINCTION:
- R5 (Tilt) requires a photo showing the MODULE/ROOF TILT ANGLE measured with a proper tilt-measuring instrument:
  * Digital angle finder / inclinometer (e.g., Klein, Bosch, DeWalt) — shows degrees on a digital display or circular dial
  * Magnetic protractor / angle locator (e.g., Johnson) — circular dial with degree markings
  * Circular bubble inclinometer / tilt meter — round tool with a bubble vial and degree markings around the circumference
  * Phone app screenshot showing tilt angle
- The tilt instrument does NOT need to be placed directly on a solar module. It can be held against the roof surface, rafter, beam, or any surface parallel to the array plane. The installer is measuring the roof pitch, which equals the module tilt. What matters is that the ANGLE READING IS VISIBLE.
- A TAPE MEASURE is NOT a tilt meter. Tape measures measure linear distance (inches/feet/cm), NOT angle (degrees). Do NOT reclassify tape measure photos as R5.
- CRITICAL — AN ELECTRICAL TEST METER IS NOT A TILT METER — DO NOT CLASSIFY IT AS R5: A digital MULTIMETER, CLAMP METER (clamp-on ammeter, e.g. Klein CL-series / Fluke), DMM, or voltage/continuity tester is an ELECTRICAL test instrument, NOT an angle/tilt instrument. A technician using such a meter is typically measuring STRING VOLTAGE / current (commissioning), which is NOT a required M1 category. Tell them apart by the DISPLAY UNITS and shape:
  * TILT METER (R5): reading is in DEGREES (e.g. "23°", "18.5°"); tool is a circular dial / bubble inclinometer / small rectangular digital angle finder held FLAT against a roof/rail/beam plane.
  * ELECTRICAL METER (NOT R5): reading is in VOLTS (V, VDC, VAC), AMPS (A), OHMS (Ω), or similar electrical units; the tool is a handheld rectangular meter, often with a CLAMP JAW at the top and/or red/black TEST LEADS/PROBES plugged in. This is an electrical test meter.
  * If you see a clamp jaw, test leads/probes, or a voltage/current reading, it is an electrical meter — classify the photo as BONUS/Others (set reclassified=true, correct_lr_code="BONUS", correct_lr_label="Bonus Photo", category_detected="Bonus", subcategory_detected="General"), NOT R5. Do NOT treat electrical string-voltage testing as a tilt photo.
- Reclassify to R5 ONLY if the photo shows an ANGLE/DEGREE measurement instrument displaying a DEGREE reading — regardless of whether solar modules are visible in the frame. Do NOT reclassify an electrical (volts/amps) meter to R5.

CRITICAL — R6 (JUNCTION BOX) CLASSIFICATION:
- R6 is the Rooftop Junction Box category. Both OPEN and CLOSED j-box photos belong in R6 — they both document the j-box installation.
- An OPEN j-box (lid off, wiring/bonding/conduit transition visible) is the ideal R6 photo and what LR requires for approval. Score it higher.
- A CLOSED j-box (lid on, mounted on roof between rails, conduit/wires entering) is still a valid R6 photo — it documents the j-box is installed. Score it as a bonus/supplementary R6 photo and note that the open view is needed for full LR approval.
- Do NOT classify a photo as R6 if:
  * A tape measure is the dominant subject and the j-box is not the focus (this is a measurement photo, not a j-box photo)
  * The photo shows a generic box-shaped object that is clearly NOT a junction box (e.g., a combiner, disconnect, or unrelated enclosure)
- A tape measure laid on a roof near a closed electrical box where the j-box is NOT the focus of the photo is NOT an R6 photo. Keep it in its uploaded category or mark as bonus.

CRITICAL — EGC/GEC GROUNDING PATH vs POINT OF INTERCONNECTION:
- Photos showing GROUNDING AND BONDING equipment are NOT Point of Interconnection (E4) photos. The grounding path is a separate system:
  * EGC (Equipment Grounding Conductor) = bare copper wire that bonds the rails on the roof, runs through the junction box, down conduit through the BOS, and eventually connects to ground
  * GEC (Grounding Electrode Conductor) = the conductor that connects the grounding system to a grounding electrode (ground rod, Ufer ground, water pipe bond, etc.)
  * Typical appearance: bare copper wire running inside 1/2" PVC into the ground, copper wire clamped to a ground rod, green insulated wire at grounding bus bar
- These grounding path photos should be classified as:
  * E5 (BOS Pullback) — if showing the full grounding path in context with other BOS equipment (conduit, panels, meter)
  * R2 (Rail + Micros + EGC) — if showing the roof segment with EGC copper on rails
  * R6 (Junction Box) — if focused on the j-box where EGC transitions into conduit
  * E5 (BOS) — if it shows the grounding electrode connection point itself (a driven GROUND ROD, or the GEC/copper conductor terminating into the earth). See the dedicated GROUND ROD rule below.
- Do NOT classify grounding/bonding photos as E4 (POI). The POI is where the solar system's AC output connects to the grid (via backfed breaker, IPCs, parallel lugs, etc.) — NOT where the safety ground connects to earth.
- If a photo shows conduit runs with a bare copper wire going into the ground through PVC, that is grounding — not interconnection.

CRITICAL — GROUNDING ELECTRODE (GROUND ROD, WATER-PIPE BOND, FLAG-MARKED ROD) = E5 (BOS), NOT PS6:
- A ground-level photo showing a short bare COPPER CONDUCTOR, copper pipe/rod stub, or metal rod emerging from the SOIL/GROUND (often surrounded by dirt, gravel, leaf litter, mulch, or small plants) is documenting the GROUNDING ELECTRODE — i.e. the driven GROUND ROD and/or the Grounding Electrode Conductor (GEC) terminating into the earth. This is the last piece of the home's grounding & bonding system.
- This is a BALANCE OF SYSTEM grounding component. Classify it as E5 (Pull back of Balance of System): set reclassified=true, correct_lr_code="E5", correct_lr_label="Pull back of Balance of System", category_detected="Electrical_Panel", subcategory_detected="BOS_Pullback".
- Score as is_acceptable=true — a copper/rod grounding stub in the ground is valid grounding-electrode documentation even without other BOS equipment in frame. In "recommendations", you may suggest a wider context shot showing the rod's connection to the GEC and nearby BOS equipment, but do NOT fail it for lack of context.
- Do NOT classify a copper/metal grounding stub emerging from the ground as PS6 (existing site damage). It is NOT damage — it is installed grounding hardware. Ground-level shots of leaf litter/dirt with a copper conductor or rod stub are grounding-electrode (E5) photos, not site-damage photos.
- WATER-PIPE BOND / GEC TO PLUMBING = E5, NOT PS6: A photo of an interior or exterior utility/plumbing area showing a copper or green/bare grounding conductor CLAMPED or BONDED to a metal WATER PIPE, water-meter, or plumbing fitting (via an acorn/ground clamp) is documenting the GROUNDING ELECTRODE connection to the home's metal water-pipe electrode. This is grounding & bonding hardware = E5 (BOS). Classify it as E5 (set reclassified=true, correct_lr_code="E5", correct_lr_label="Pull back of Balance of System", category_detected="Electrical_Panel", subcategory_detected="BOS_Pullback") and score is_acceptable=true. CRITICAL: Do NOT read discoloration, patina, verdigris, or 'corroded'/'aged' copper piping as damage — normal copper pipe/fitting appearance is NOT site damage, and a water-pipe bond photo must NEVER be classified as PS6.
- FLAG-MARKED / BURIED GROUND ROD = E5, NOT PS6: A ground-level exterior photo showing DISTURBED SOIL, freshly dug/backfilled earth, or a small patch of ground next to the house marked by one or more ORANGE (or colored) SURVEY / MARKER FLAGS is documenting the location of the driven GROUND ROD / grounding electrode — the flag marks where the rod is buried even when the rod itself is not visible above grade. This is installed grounding documentation = E5 (BOS). Classify it as E5 (set reclassified=true, correct_lr_code="E5", correct_lr_label="Pull back of Balance of System", category_detected="Electrical_Panel", subcategory_detected="BOS_Pullback") and score is_acceptable=true. In "recommendations" you may suggest a closer shot of the rod/clamp and GEC, but do NOT fail it for the rod being buried. CRITICAL: Do NOT classify disturbed soil / patchy grass / marker-flag ground shots as PS6 (existing site damage) — disturbed earth from driving the ground rod is normal installation activity, not pre-existing site damage.

CRITICAL — AC DISCONNECT / RAPID SHUTDOWN SWITCH = BOS (E5), NOT POI (E4):
- An exterior-mounted AC disconnect switch, PV system disconnect, or rapid shutdown switch is a component of the Balance of System (BOS). These are E5 photos, NOT E4.
- Even a close-up of just the disconnect (showing the enclosure, handle, labels, conduit entry) is valid E5 documentation — it shows a BOS component is installed. Not ideal (a wider pullback is preferred), but it documents the disconnect as part of the BOS path.
- Do NOT reclassify disconnect/rapid shutdown switch photos to E4 (Point of Interconnection). The POI is where the solar AC output ties into the grid (backfed breaker, IPCs, parallel lugs). The disconnect is upstream of that — it's the safety cutoff in the BOS path between array and service panel.
- Typical disconnect photo: Eaton/Square D/Siemens/Cutler-Hammer exterior enclosure with red/yellow handle, "PV SYSTEM DISCONNECT" or "RAPID SHUTDOWN" labels, conduit entering the box, mounted on exterior wall.
- If the disconnect photo also shows surrounding BOS equipment (meter, panel, conduit runs), that's even better — but even a close-up of the disconnect alone stays E5.

CRITICAL — E4 (POI) TWO-PHOTO REQUIREMENT — EXTERIOR IS VALID:
- E4 (Point of Interconnection) requires TWO photos per the LR guide: "First Photo: contextual photo (pull back). Second photo: IPCs, parallel lugs, distribution blocks, breakers, and wire terminations."
- An EXTERIOR photo of the POI enclosure (closed box, lid on, mounted on wall near meter/BOS, labeled "PV POWER SOURCE INTERCONNECTION" or similar) IS the valid FIRST contextual/location photo for E4. It documents WHERE the POI is located and that it exists.
- Do NOT flag issues like "no open view of hardware inside", "IPCs not visible", "internal wiring not shown", or "breaker not visible" on an exterior/closed POI enclosure photo. Those requirements are for the SECOND (interior/open) photo.
- Score the exterior POI enclosure photo as is_acceptable=true if it clearly shows the POI enclosure in context (mounted location, readable labels, visible in relation to other BOS equipment).
- In the "recommendations" array, note that a companion INTERIOR photo (box open, showing IPCs/breakers/lugs/terminations inside) is also needed to fully satisfy E4's two-photo requirement.
- An INTERIOR photo of the POI (box open, showing IPCs, parallel lugs, breakers, wire terminations, bonding) is the valid SECOND photo. Score this against the detailed hardware requirements.
- BOTH exterior AND interior POI photos should be classified as E4 — they are complementary halves of the same requirement, not separate categories.
- Do NOT confuse a PV disconnect/rapid shutdown enclosure with the POI enclosure. The POI enclosure is where the solar AC output ties into the utility grid; the disconnect is upstream in the BOS path (see rule above).

CRITICAL — EXTERIOR HOUSE PULLBACK WITH SOLAR ARRAY = R3 (COMPLETE ARRAY) — BUT THE ARRAY MUST BE CLEARLY VISIBLE:
- A ground/exterior pullback qualifies as R3 (Complete Array Rail Trimmed) ONLY when the SOLAR ARRAY is CLEARLY VISIBLE and is a SUBSTANTIAL, IDENTIFIABLE subject of the photo — i.e. you can actually make out the modules filling a roof plane and confirm the array looks complete.
- HARD REQUIREMENT — do NOT classify as R3 (these are site-assessment / surrounding-area / "Others" photos, NOT R3):
  * The house/landscape is the subject and the array is only a TINY, DISTANT, or PARTIALLY-OBSCURED sliver in the frame (e.g. panels barely glimpsed through/behind trees, foliage, or across a wide yard), such that you cannot meaningfully see the modules or judge completeness.
  * The photo is dominated by trees, sky, driveway, street, or the front facade, with panels only incidentally visible in a small corner.
  * You are essentially GUESSING that there are panels rather than clearly seeing an installed array.
  In these cases the photo is a SITE / SURROUNDING-AREA photo — keep it in its uploaded category (or "Others"/bonus). Do NOT force it into R3 just because a few panels happen to be visible in the distance.
- When the array IS clearly visible and fills a recognizable portion of the roof plane, THEN it is a valid R3 pullback:
  * These are the most common R3 photos — a wide shot from ground level showing the roof plane with the modules installed. This is how installers document that the array is complete.
  * Even in winter with snow on the ground, or in any weather/lighting, if the array is clearly and substantially visible on the roof, it IS R3.
  * Classify as R3: set reclassified=true (if not already R3), correct_lr_code="R3", correct_lr_label="Complete Array(s) Rail Trimmed", category_detected="Roof_Mount", subcategory_detected="Complete_Array_Rail_Trimmed".
  * Score as is_acceptable=true if the full array is clearly visible across the roof plane. You may not be able to count individual modules from ground level — that is OK, as long as the array is clearly the subject and looks complete.
  * Multiple exterior pullbacks from different angles are WELCOME — they can document different arrays on different roof faces (front, back, sides).
- EXCEPTION: If a tape measure or ruler is the PRIMARY SUBJECT/FOCUS of the photo, it is NOT R3 even if the array is visible — it stays Bonus/Others.
- Bottom line: "a few panels visible somewhere in the frame" is NOT enough for R3. The array must be clearly, substantially visible so completeness can actually be assessed. Distant/obscured/incidental panel glimpses are site photos, not R3.

CRITICAL — PS8 (STICKER SHEET / STRING DIAGRAM) vs PS5 (MODULE SERIAL NUMBER):
- PS8 is a STICKER SHEET (also called a STRING DIAGRAM or STICKER MAP). It shows MULTIPLE serial-number stickers (QR codes, barcodes, or printed labels) from SolarEdge power optimizers or Enphase microinverters, physically affixed to a paper or cardboard layout that maps each sticker to its corresponding solar panel position on the roof.
- PS5 is a close-up of a SINGLE module serial number on the actual solar panel itself.
- KEY DISTINCTION: If you see multiple QR/barcode/serial stickers arranged on a PAPER or CARDBOARD sheet with a hand-drawn or printed layout showing panel positions (labeled front/back, north/south, or with boxes representing panels), this is PS8 (Sticker Sheet), NOT PS5 (Module Serial).
- Reclassify to PS8: set reclassified=true, correct_lr_code="PS8", correct_lr_label="Sticker Sheet / String Diagram", category_detected="Project_Site", subcategory_detected="Sticker_Sheet_String_Diagram".
- PS8 is required for SolarEdge and Enphase systems. It documents which specific optimizer/microinverter is under which specific panel.
- HAND-DRAWN OR DIGITAL STRING / WIRING DIAGRAMS ALSO QUALIFY AS PS8 — NOT JUST PHYSICAL STICKER SHEETS: A string diagram does NOT require physical serial stickers. A hand-drawn, sketched, printed, or digitally-drawn schematic that maps the solar strings/panels and their wiring — e.g. rows or boxes representing panels/strings labeled S1, S2, S3 (or with panel-position boxes), with lines/connections showing how they are wired together — IS a valid PS8 (Sticker Sheet / String Diagram). This EXPLICITLY includes a photo, SCREENSHOT, or SMARTPHONE SCREENSHOT of such a diagram drawn in a notes/drawing app (e.g. ibisPaint), on paper, on a whiteboard, or in design software.
- KEY: If the image shows a schematic wiring/string LAYOUT with panels or strings labeled (S1/S2/S3, string numbers, or panel-position boxes) and connection lines between them, it is a STRING DIAGRAM = PS8 — regardless of whether it is hand-drawn, digital, or made of physical stickers, and regardless of whether it is a phone screenshot. Reclassify it to PS8 (set reclassified=true, correct_lr_code="PS8", correct_lr_label="Sticker Sheet / String Diagram", category_detected="Project_Site", subcategory_detected="Sticker_Sheet_String_Diagram"). Do NOT route such a diagram to Others/bonus.

CRITICAL — R1 (FLASHING & SEALANT) vs R2 (RAIL + EGC) DISTINCTION:
- R1 requires close-up photos specifically showing FLASHING (metal plate under shingles) and/or SEALANT (caulk/sealant around a penetration). The focus must be on waterproofing quality.
- R2 documents the racking system with EGC (Equipment Grounding Conductor) — the bare copper wire running along/between rails.
- KEY RULE: If a roof attachment close-up prominently shows a BARE COPPER GROUNDING WIRE (EGC) running along or between rails/attachments, it is R2 documentation, NOT R1. The EGC is the distinguishing element:
  * Photo shows attachment + visible copper EGC wire → classify as R2 (the EGC is the important element being documented)
  * Photo shows attachment + visible flashing plate + sealant around penetration, NO prominent EGC copper → classify as R1
  * Photo shows attachment hardware only (lag bolt, standoff) with neither clear flashing/sealant NOR EGC → keep in uploaded category as bonus
- The copper EGC is typically bare (uninsulated) copper wire, sometimes with a green insulation, running along the top of rails or bonded at attachment points with a grounding lug/clip. It is visually distinctive — a bright copper-colored wire running across the roof structure.
- Do NOT classify EGC photos as R1. EGC grounding documentation belongs in R2.

CRITICAL — PS6 (EXISTING SITE DAMAGE) IS NOT A CATCH-ALL:
- PS6 is ONLY for documenting PRE-EXISTING damage at the site (roof damage, broken shingles, satellite dish holes, gutter damage, etc.) that existed BEFORE the solar installation. It protects installers from workmanship claims.
- Do NOT dump unrecognizable photos into PS6. If a photo doesn't fit any M1 category, keep it in its uploaded category as a bonus photo rather than reclassifying to PS6.
- The following are NOT site damage and must NOT be classified as PS6:
  * Fall protection anchors, harness bags, rope grabs, safety lanyards on a roof — these are SAFETY EQUIPMENT. Classify as a bonus photo under the uploaded category. They document jobsite safety compliance.
  * Removal/flashing of fall protection anchor points (patching shingles where an anchor was) — this is roof work documentation, not pre-existing damage. Keep as bonus under uploaded category.
  * Conduit mounted on an exterior wall — this is E5 BOS equipment (conduit run). Even a close-up of just the conduit on a wall documents the BOS path.
  * Interior photos of garages, utility rooms, or workspaces — these are not site damage documentation unless they specifically show damage.
  * Interior ATTIC / roof-framing / rafter / truss photos that show only the structure with NO clearly visible damage — these are NOT site damage. A normal vent, eave gap, or daylight opening is not damage. Keep the photo in its uploaded category as a bonus photo. Only classify as PS6 if ACTUAL pre-existing damage is clearly visible (water stains, rot, cracked/broken framing, storm damage).
  * Generic rooftop photos without visible damage — keep in uploaded category.
- Only classify as PS6 when the photo CLEARLY shows damage that pre-dates the installation (cracked/missing shingles, water stains, broken gutters, etc.).

CRITICAL — CONDUIT ON WALL = E5 BOS, NOT PS6 OR OTHER:
- A photo showing conduit (EMT, PVC, flex) mounted on an exterior or interior wall is documenting the BOS conduit run. This is an E5 (BOS Pullback) photo — it shows a component of the balance of system path.
- Even a close-up of just the conduit run on a wall is valid E5 documentation. Not the ideal wide pullback, but it documents the conduit path as part of BOS.
- Do NOT reclassify conduit-on-wall photos to PS6, E4, or any non-BOS category.

CRITICAL — ALL BOS PULLBACKS = E5, NO SEPARATE BATTERY BOS CATEGORY:
- There is NO separate "Battery BOS Pullback" or "S4" category. ALL Balance of System pullback photos — whether the project has a battery or not — are classified as E5 (Electrical BOS).
- Photos showing electrical equipment pullback near a battery install location (gateway, transfer switch, battery enclosure in context with BOS equipment) are STILL E5.
- Do NOT classify any BOS pullback photo as S4 or any storage category. S4 does not exist as a BOS pullback code.
- If you see battery-related BOS equipment (e.g., gateway wiring visible alongside meter/panel/conduit), classify the pullback as E5 and note that gateway/transfer switch wiring details are visible as bonus documentation.

CRITICAL — STORAGE / GATEWAY DISTINCTION:
- Categories S1-S6 (Storage) are ONLY applicable when a battery energy storage system (BESS) is installed. ${!hasStorage ? "THIS SUBMISSION DOES NOT INCLUDE BATTERY STORAGE — DO NOT reclassify any photo to S1-S6 codes." : "This submission includes battery storage, so S1-S6 categories are valid."}
- S5 (Gateway/System Controller/Transfer Switch wiring) and S6 (Gateway label) are ONLY for backup battery systems with an Enphase IQ System Controller, Tesla Backup Gateway, or similar ATS/transfer switch panel. They show: transfer switch internals with large contactors/relays, multiple thick conductors (red/black/green), breaker banks, and BMS deadfront labels.
- DO NOT confuse the following with gateway/transfer switch equipment:
  * Enphase IQ Combiner / IQ Combiner Box / Q.Home Combiner — this is E1 (Inverter/Combiner box), NOT S5 (Gateway/Transfer Switch). IQ Combiners aggregate multiple Enphase microinverter branch circuits into one output. They contain breakers and bus bars but NO contactors, NO relays, NO automatic transfer switching. An open IQ Combiner showing AC wiring and breakers = E1. Classify as E1.
  * Consumption monitoring CTs (current transformers clamped around conductors in a main panel or subpanel) — these are part of normal solar monitoring (E4/E6/E7 categories)
  * Standard electrical panels or subpanels with breakers — these are E3 (Main Panel) or E9 (Combiner/Sub-Panels for large multi-inverter systems)
  * BOS equipment pullback views — these are E5
  * Inverter wiring connections — these are E6/E7
- A gateway/system controller is a SPECIFIC piece of equipment (e.g., Enphase IQ System Controller 2/3, Tesla Backup Gateway 2, SolarEdge Energy Hub) — it is NOT a generic electrical panel or combiner box. It contains large contactors/relays for automatic transfer switching. An Enphase IQ Combiner does NOT have these — it is E1, not S5.

CRITICAL — COMMISSIONING SCREENSHOTS ARE VALID PHOTOS:
- Commissioning photos are PHONE SCREENSHOTS of monitoring portal pages (Enphase Enlighten, Tesla app, SolarEdge app). These are NOT physical equipment photos — they are digital screenshots and THAT IS CORRECT AND EXPECTED.
- The following are ALL valid commissioning screenshots and should score HIGH (is_acceptable=true):
  * Enphase "Validation Summary Report" page — shows device rows with status (e.g., "Set"), wattage readings, IQ Gateway number. This IS valid commissioning proof showing devices are communicating.
  * Enphase IQ Gateway "Communications Report" — shows system summary, gateway serial number, cellular/cloud connection status, production and consumption status. This IS valid commissioning proof.
  * Enphase Enlighten system overview — shows system ID, location, all devices paired/communicating, production/consumption data.
  * Tesla app screenshots — shows Powerwall status, solar production, grid connection, battery charge level.
  * SolarEdge monitoring portal — shows inverter status, power output, optimizer-level reporting.
- Do NOT flag these issues on valid commissioning screenshots:
  * "Does not clearly show commissioning status" — if the screenshot shows devices communicating/paired/producing, it DOES show commissioning status.
  * "No explicit fleet-owner/partner confirmation visible" — fleet owner setup is done in the portal backend; not all screenshot views show it. Do NOT require it to be visible in every screenshot.
  * "Appears to be a validation summary rather than final commissioning proof" — a Validation Summary Report IS commissioning proof. It shows all devices are validated and communicating.
  * "No active production/consumption data" — some screenshots show 0W readings which is normal (system may have just been turned on, or it's nighttime). Zero readings with "Set" status = devices are commissioned and communicating.
- For Enphase systems: the key requirement is that devices are shown as paired/communicating and the system is registered. A Validation Summary showing all devices in "Set" status with an IQ Gateway number IS sufficient.
- For SolarEdge systems WITH BATTERIES ONLY: also look for 20% minimum backup reserve and Storm Guard enabled. Without batteries, these settings do NOT apply.
- Score commissioning screenshots against their OWN requirements (are devices shown communicating? is the system registered?). Do NOT apply physical-equipment photo standards (lighting, framing, angles) to digital screenshots.

Respond with raw JSON only. No code blocks, no markdown.`;

    const result = await analyzeImage({
      systemPrompt,
      userText: `Analyze this photo. It was uploaded under "${expectedLabel ?? category}" but determine what it ACTUALLY shows and classify it correctly:`,
      imageBase64,
      maxTokens: 2000,
    });

    if (!result.ok) {
      console.error("LLM API error for photo", photoId, result.errorText?.slice(0, 300));
      return null;
    }

    const content = result.content;
    let analysis: any = {};
    try {
      analysis = JSON.parse(content);
    } catch {
      console.error("Failed to parse AI response for photo", photoId);
      return null;
    }

    // If AI reclassified, resolve the correct internal category/subcategory from the LR code
    let finalCategory = analysis?.category_detected ?? category;
    let finalSubcategory = analysis?.subcategory_detected ?? subcategory ?? "General";

    if (analysis?.reclassified && analysis?.correct_lr_code) {
      const targetCode = analysis.correct_lr_code.toUpperCase();

      // GUARD: Block reclassification to storage categories when no battery is present
      if (!hasStorage && STORAGE_ONLY_CODES.has(targetCode)) {
        console.log(`[analyze] Blocked reclassification to ${targetCode} — no storage in submission ${submissionId}`);
        analysis.reclassified = false;
        analysis.reclassification_reason = "";
        analysis.correct_lr_code = "";
        analysis.correct_lr_label = "";
        // Keep original category
        finalCategory = category;
        finalSubcategory = subcategory ?? "General";
      } else {
        const lookup = lookupByLRCode(targetCode);
        if (lookup) {
          finalCategory = lookup.internalCategory;
          finalSubcategory = lookup.internalSubcategory;
          // Enrich analysis with resolved data
          analysis.category_detected = lookup.internalCategory;
          analysis.subcategory_detected = lookup.internalSubcategory;
          analysis.correct_lr_label = lookup.lrLabel;
        }
      }
    }

    // FOCUSED E4 (Point of Interconnection) DUAL-USE CHECK:
    // On supply-side/line-side tap installs the Consumption CT (E7) photo of an
    // open main panel almost always also shows the POI tap hardware on the same
    // service conductors. The primary classifier frequently misses it, so when a
    // photo lands as a Consumption-CT / open-panel-interior shot and E4 is not
    // already covered, run a tightly-scoped secondary vision check and add E4 to
    // also_satisfies when tap hardware is confirmed.
    try {
      if (!Array.isArray(analysis.also_satisfies)) analysis.also_satisfies = [];
      const labelLc = String(analysis?.correct_lr_label ?? expectedLabel ?? category ?? "").toLowerCase();
      const subLc = String(finalSubcategory ?? "").toLowerCase();
      const codeUc = String(analysis?.correct_lr_code ?? "").toUpperCase();
      const looksLikeConsumptionCT =
        labelLc.includes("consumption metering") || labelLc.includes("consumption ct") || subLc.includes("consumption");
      const isPrimaryE4 = codeUc === "E4" || labelLc.includes("point of interconnection");
      const alreadyHasE4 = analysis.also_satisfies.some(
        (x: any) =>
          String(x?.lr_code ?? "").toUpperCase() === "E4" ||
          String(x?.lr_label ?? "").toLowerCase().includes("point of interconnection"),
      );
      if (looksLikeConsumptionCT && !isPrimaryE4 && !alreadyHasE4) {
        const poi = await detectPoiTapHardware(imageBase64);
        if (poi.has) {
          analysis.also_satisfies.push({
            lr_code: "E4",
            lr_label: "Point of Interconnection",
            reason: poi.evidence || "Supply-side tap connector(s) visible on the service conductors in the same frame as the consumption CTs.",
          });
          console.log(`[analyze] Added E4 (POI) to also_satisfies for photo ${photoId} via focused tap-hardware check`);
        }
      }
    } catch (e: any) {
      console.error("[analyze] POI dual-use check failed", photoId, e?.message);
    }

    // Preserve original label in the analysis result
    analysis.original_label = expectedLabel ?? category;

    // When AI reclassifies, also update expectedLabel to the correct LR label.
    // This ensures updateSubmissionAggregates counts coverage correctly —
    // otherwise GDrive photos stay as "Others" in expectedLabel and required
    // labels always appear missing.
    const updatedExpectedLabel =
      analysis?.reclassified && analysis?.correct_lr_label
        ? analysis.correct_lr_label
        : undefined;

    // Update the photo record
    await prisma.submissionPhoto.update({
      where: { id: photoId },
      data: {
        analysisResult: analysis,
        confidenceScore: analysis?.confidence_score ?? null,
        qualityScore: analysis?.quality_score ?? null,
        isAcceptable: analysis?.is_acceptable ?? null,
        issuesFound: analysis?.issues ?? [],
        category: finalCategory,
        subcategory: finalSubcategory,
        ...(updatedExpectedLabel ? { expectedLabel: updatedExpectedLabel } : {}),
      },
    });

    return analysis;
  } catch (e: any) {
    console.error("analyzePhoto error", photoId, e?.message);
    return null;
  }
}

export async function updateSubmissionAggregates(submissionId: string, expectedCategories: any[]) {
  const allPhotos = await prisma.submissionPhoto.findMany({ where: { submissionId } });

  // Build set of covered labels from BOTH expectedLabel AND reclassified AI labels.
  // This ensures GDrive photos (which start as "Others") count under their
  // correct LR label after AI reclassification.
  const submittedLabels = new Set<string>();
  for (const p of allPhotos) {
    if (p.expectedLabel) submittedLabels.add(p.expectedLabel);
    // Also check the AI analysis for reclassified correct_lr_label
    const analysis = p.analysisResult as any;
    if (analysis?.reclassified && analysis?.correct_lr_label) {
      submittedLabels.add(analysis.correct_lr_label);
    }
  }

  const requiredLabels = (expectedCategories ?? []).filter((c: any) => c.is_required).map((c: any) => c.name);
  const missingRequired = requiredLabels.filter((l: string) => !submittedLabels.has(l));
  const analyzed = allPhotos.filter((p: any) => p.confidenceScore != null);
  const avg = analyzed.length ? analyzed.reduce((s: number, p: any) => s + (p.confidenceScore || 0), 0) / analyzed.length : null;
  const acceptable = allPhotos.filter((p: any) => p.isAcceptable === true).length;
  const failed = allPhotos.filter((p: any) => p.isAcceptable === false).length;

  await prisma.photopackSubmission.update({
    where: { id: submissionId },
    data: {
      overallConfidence: avg,
      issuesFound: allPhotos.reduce((s: number, p: any) => s + (p.issuesFound?.length ?? 0), 0),
      categoriesComplete: new Set(allPhotos.filter((p: any) => p.isAcceptable).map((p: any) => `${p.category}_${p.subcategory}`)).size,
      status: missingRequired.length > 0 || failed > 0 ? "review_needed" : "ready",
      reviewerNotes: missingRequired.length > 0
        ? `Missing required: ${missingRequired.join(", ")}`
        : `All required categories present. ${acceptable} approved / ${failed} flagged.`,
    },
  });
}