/**
 * LightReach / Palmetto M1 Install Photo Documentation
 * Photopack Bucket Mapping Configuration
 *
 * Source: Palmetto Installer Guide — "Solar Energy Plan: Install (M1) Photo Documentation"
 * URL: help.palmetto.finance/en/articles/8306274-solar-energy-plan-install-m1-photo-documentation
 *
 * The LightReach portal organizes Install Package photos into 5 main buckets:
 *   1. Project Site
 *   2. Roof
 *   3. Electrical
 *   4. Storage (if applicable)
 *   5. System Commissioning
 *
 * Each bucket contains numbered sub-categories (PS1-PS8, R1-R6, E1-E9, S1-S6, SC1, etc.)
 * This file maps our internal PhotoCategory codes to the LR portal bucket structure.
 */

export interface LRBucketSubCategory {
  /** LR's official sub-category code (e.g., "PS1", "R2", "E4") */
  lrCode: string;
  /** LR's official label for this sub-category */
  lrLabel: string;
  /** Detailed requirements from the Palmetto installer guide */
  lrRequirements: string;
  /** Our internal category name (from PhotoCategory table) */
  internalCategory: string;
  /** Our internal subcategory name */
  internalSubcategory: string;
  /** Whether this sub-category is always required or conditional */
  isConditional: boolean;
  /** Condition description if conditional */
  condition?: string;
}

export interface LRBucket {
  /** Portal bucket name as displayed in the LR Install Package UI */
  bucketName: string;
  /** Portal bucket description */
  description: string;
  /** Ordered sub-categories within this bucket */
  subCategories: LRBucketSubCategory[];
}

/**
 * Complete LR Install Package photopack structure
 * Maps every LR portal sub-category to our internal PhotoCategory system
 */
export const LR_PHOTOPACK_BUCKETS: LRBucket[] = [
  // ═══════════════════════════════════════════════════════════════
  // SECTION B: PROJECT SITE
  // ═══════════════════════════════════════════════════════════════
  {
    bucketName: "Project Site",
    description: "Front of house pullback & front of house with clearly visible house number.",
    subCategories: [
      {
        lrCode: "PS1",
        lrLabel: "Inverter(s) -or- Micro inverters -or- Optimizers",
        lrRequirements: "Photo of clearly legible model for inverter/micro inverter/AC module/optimizer used on site. Applicable if monitoring portal access is not provided to LR at M1.",
        internalCategory: "Project_Site",
        internalSubcategory: "Inverter_Micro_Optimizer",
        isConditional: true,
        condition: "Required if monitoring portal access is not provided to LR at M1",
      },
      {
        lrCode: "PS2",
        lrLabel: "Q.Home / IQ Combiner label serial",
        lrRequirements: "Clearly legible serial numbers for inverter & DC safety switch (SolarEdge/other) or Enphase IQ combiner box. Mandatory for incentive states. If more than 4 branch circuits & dedicated sub panel, upload Enphase envoy serial #.",
        internalCategory: "Project_Site",
        internalSubcategory: "Combiner_Label_Serial",
        isConditional: true,
        condition: "Required if monitoring portal access not provided OR mandatory for incentive states",
      },
      {
        lrCode: "PS3",
        lrLabel: "MCI location & picture",
        lrRequirements: "For Tesla inverters: MCI location on a string map & picture of the MCI installed.",
        internalCategory: "Project_Site",
        internalSubcategory: "MCI_Location",
        isConditional: true,
        condition: "Tesla inverter systems only",
      },
      {
        lrCode: "PS4",
        lrLabel: "Module Label",
        lrRequirements: "Picture of the manufacturer label on the module.",
        internalCategory: "Project_Site",
        internalSubcategory: "Module_Label",
        isConditional: false,
      },
      {
        lrCode: "PS5",
        lrLabel: "Module Serial Number",
        lrRequirements: "Single serial number picture from one of the modules being installed onsite (for O&M/recall purposes).",
        internalCategory: "Project_Site",
        internalSubcategory: "Module_Serial",
        isConditional: false,
      },
      {
        lrCode: "PS8",
        lrLabel: "Sticker Sheet / String Diagram",
        lrRequirements: "A photo of the sticker sheet (string diagram) showing manufacturer serial-number stickers from SolarEdge power optimizers or Enphase microinverters arranged on a paper or cardboard layout that maps each sticker to its corresponding panel position on the roof. This documents which optimizer or microinverter is installed under each specific panel.",
        internalCategory: "Project_Site",
        internalSubcategory: "Sticker_Sheet_String_Diagram",
        isConditional: true,
        condition: "Required for SolarEdge and Enphase systems only",
      },
      {
        lrCode: "PS6",
        lrLabel: "Existing site damage (if applicable)",
        lrRequirements: "Pre-existing damage documentation (roof damage, satellite dishes, gutters, etc.) — helps protect installers from workmanship claims.",
        internalCategory: "Project_Site",
        internalSubcategory: "Existing_Damage",
        isConditional: true,
        condition: "Only if pre-existing damage is present at the site",
      },
      {
        lrCode: "PS7",
        lrLabel: "Invoice and Bill of Materials",
        lrRequirements: "Bulk invoices must show: Project Name/Address, Component SKUs, Parts matching portal inputs. Date of receipt within ~3 months.",
        internalCategory: "Project_Site",
        internalSubcategory: "Invoice_BOM",
        isConditional: true,
        condition: "Only if invoice or bill of materials documentation is available",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION C: ROOF / MOUNTING SYSTEM
  // ═══════════════════════════════════════════════════════════════
  {
    bucketName: "Roof",
    description: "Document all module attachment areas, horizon, structural upgrades, flashing, sealant, optimizer/microinverter mounts...",
    subCategories: [
      {
        lrCode: "R1",
        lrLabel: "Close up of attachments - Flashing & Sealant",
        lrRequirements: "Racking Systems w/ Flashing: photos showing properly installed flashing to manufacturer specs + sealant. Without Flashing: photos highlighting properly applied sealant within or around the attachment. Must adhere to manufacturer guidelines.",
        internalCategory: "Roof_Mount",
        internalSubcategory: "Flashing_Sealant",
        isConditional: false,
      },
      {
        lrCode: "R2",
        lrLabel: "Rail with Optimizer/Micro inverters mounted + EGC installed + Wire Management",
        lrRequirements: "Pullback of each mounting plane showing attachments, rail, optimizers/micros installed with completed wire management. Wires secured with permanent, outdoor rated & UV-resistant clips/ties. EGC path: include route of grounding copper between rails for each array.",
        internalCategory: "Roof_Mount",
        internalSubcategory: "Rail_Micros_EGC",
        isConditional: false,
      },
      {
        lrCode: "R3",
        lrLabel: "Complete Array(s) w/ Rail Trimmed",
        lrRequirements: "All modules must be visible. Low pitch/tall homes: photos from the roof. Rail must be trimmed. 1 Photo for each array.",
        internalCategory: "Roof_Mount",
        internalSubcategory: "Complete_Array",
        isConditional: false,
      },
      {
        lrCode: "R4",
        lrLabel: "Under Array(s) Wire Management",
        lrRequirements: "Wire management for each array after panels laid down. Wires should not touch the roof surface. Wire and bundles should be secured and above the surface. 1 Photo for each array.",
        internalCategory: "Roof_Mount",
        internalSubcategory: "Under_Array_Wiring",
        isConditional: false,
      },
      {
        lrCode: "R5",
        lrLabel: "Tilt",
        lrRequirements: "Photo measurements of tilt should be clearly legible, taken on the module itself (not roof surface). Phone app screenshots acceptable only if showing context of array being measured. 1 Photo per unique roof pitch.",
        internalCategory: "Roof_Mount",
        internalSubcategory: "Tilt",
        isConditional: false,
      },
      {
        lrCode: "R6",
        lrLabel: "Rooftop Junction Box",
        lrRequirements: "Photo of open junction box with completed wiring and bonding. Include closeup of conductor terminated, or transition through conduit. J box should not have more than 2 inches of exposed conductors outside of the array.",
        internalCategory: "Roof_Mount",
        internalSubcategory: "Junction_Box",
        isConditional: false,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // ADDITIONAL MOUNTING SYSTEMS (if applicable)
  // ═══════════════════════════════════════════════════════════════
  // NOTE: These go into the "Roof" bucket in the LR portal but are
  // conditional based on mount type
  // AMS1 - Ground Mount (no longer eligible from 1/1/26 per FEOC)
  // AMS2 - Ballasted System

  // ═══════════════════════════════════════════════════════════════
  // SECTION D: ELECTRICAL
  // ═══════════════════════════════════════════════════════════════
  {
    bucketName: "Electrical",
    description: "Inverter, IQ Combiner Box, Combiner Panel, Sub Panel, AC Disconnect (OCPD), Conduit Run, Grounding Electrode...",
    subCategories: [
      {
        lrCode: "E1",
        lrLabel: "Inverter(s) -or- Enphase IQ / Q.Home Combiner box",
        lrRequirements: "If Enphase or QCells: photo of open combiner box showing complete AC wiring inside, including breakers from the branch circuits.",
        internalCategory: "Electrical_Panel",
        internalSubcategory: "Inverter_Combiner",
        isConditional: false,
      },
      {
        lrCode: "E2",
        lrLabel: "Main Breaker",
        lrRequirements: "Close up of the main breaker with rating clearly visible. The main breaker is the large switch at the top or bottom of the panel, often labeled MAIN.",
        internalCategory: "Electrical_Panel",
        internalSubcategory: "Main_Breaker",
        isConditional: false,
      },
      {
        lrCode: "E3",
        lrLabel: "Main Panel Busbar rating",
        lrRequirements: "Panel label/sticker with rating clearly visible.",
        internalCategory: "Electrical_Panel",
        internalSubcategory: "Main_Panel_Breaker",
        isConditional: false,
      },
      {
        lrCode: "E4",
        lrLabel: "Point of Interconnection",
        lrRequirements: "First Photo: contextual photo (pull back). Second photo: insulated piercing connectors (IPCS), parallel lugs, distribution blocks, breakers, and wire terminations. If using Hoffman or load side taps, picture of downstream sub panel with OCPD rating clearly visible is required.",
        internalCategory: "Electrical_Panel",
        internalSubcategory: "POI_Backfed_Breaker",
        isConditional: false,
      },
      {
        lrCode: "E5",
        lrLabel: "Pull back of Balance of System",
        lrRequirements: "Photo(s) showing the complete BOS equipment installed. Ideal photos are pullback photos showing full context of the BOS area.",
        internalCategory: "Electrical_Panel",
        internalSubcategory: "BOS_Pullback",
        isConditional: false,
      },
      {
        lrCode: "E6",
        lrLabel: "Production Meter -or- CTs",
        lrRequirements: "Photo of Production Meter or Production CTs. Inverters must be equipped with internal revenue grade metering (RGM). Production CTs: if Enphase/QCells, production CT should show visible L1 wiring from branch circuits through single production CT in IQ combiner box. CT terminations visible with correct phases in correct terminals.",
        internalCategory: "Electrical_Panel",
        internalSubcategory: "Production_Meter_CTs",
        isConditional: false,
      },
      {
        lrCode: "E7",
        lrLabel: "Consumption Metering (CTs)",
        lrRequirements: "Consumption Meter: All projects require consumption monitoring equipment installed to manufacturer specs. CTs on service feeders with direction of CTs visible. If CTs physically unable to be installed, include photo context.",
        internalCategory: "Electrical_Panel",
        internalSubcategory: "Consumption_CTs",
        isConditional: false,
      },
      {
        lrCode: "E8",
        lrLabel: "Fused AC Disconnects (If applicable)",
        lrRequirements: "REQUIRED when the Point of Interconnection (POI) uses Insulated Piercing Connectors (IPCs) on the service wire instead of a backfed breaker in the main panel. The fused AC disconnect provides the required overcurrent protection per NEC code. Show completed wiring, including terminations, bonding, and clearly legible fuse ratings (e.g., Bussmann Fusetron fuses).",
        internalCategory: "Electrical_Panel",
        internalSubcategory: "Fused_AC_Disconnect",
        isConditional: true,
        condition: "Required when POI uses IPCs (insulated piercing connectors) instead of a breaker — provides NEC-required overcurrent protection",
      },
      {
        lrCode: "E9",
        lrLabel: "Combiner Sub Panels (If applicable)",
        lrRequirements: "For large systems requiring multiple inverters, IQ Combiner boxes, or large sub panels for branch circuits: each sub panel should be shown fully wired, with legible closeups of breaker ratings, and the panel's bus rating label.",
        internalCategory: "Electrical_Panel",
        internalSubcategory: "Combiner_Sub_Panels",
        isConditional: true,
        condition: "Only for large systems with multiple inverters/combiners/sub panels",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION E: STORAGE
  // ═══════════════════════════════════════════════════════════════
  {
    bucketName: "Storage",
    description: "CT locations and direction, complete wiring and terminals, transfer switch panels, subpanels related to critical load backups...",
    subCategories: [
      // --- Standard Storage (All battery types) ---
      // NOTE: LR portal groups storage photos by PHOTO TYPE (label, comms, CT, pullback, gateway)
      // Our internal model groups by BATTERY TYPE (S1_Arbitrage, S2_Backup, S3_Integrated, S4_Commissioning, S5_Gateway_Wiring, S6_Gateway_Label)
      // The mapping below uses the primary internal subcategory, but photos from S1/S2/S3 all contribute to these LR buckets
      {
        lrCode: "S1",
        lrLabel: "Battery Label",
        lrRequirements: "Picture of the manufacturer label. Required if monitoring portal access is not granted at M1.",
        internalCategory: "Storage",
        internalSubcategory: "S1_Arbitrage_Battery",
        isConditional: true,
        condition: "Required if battery is installed and monitoring portal access not granted at M1. Battery label photos from S1/S2/S3 all map here.",
      },
      {
        lrCode: "S2",
        lrLabel: "Comms cable & Drain Wire",
        lrRequirements: "Battery comms cable terminations and installation per manufacturer specs. Photos must clearly show both cable ends terminated (in every component), ensuring the drain wire is landed on one end only.",
        internalCategory: "Storage",
        internalSubcategory: "S1_Arbitrage_Battery",
        isConditional: true,
        condition: "Required if battery is installed. Comms/drain wire photos from S1/S2/S3 all map here.",
      },
      {
        lrCode: "S3",
        lrLabel: "Battery CT",
        lrRequirements: "Photo should show the CT location and direction. All battery installs require battery CT equipment installed to manufacturer specifications.",
        internalCategory: "Storage",
        internalSubcategory: "S1_Arbitrage_Battery",
        isConditional: true,
        condition: "Required if battery is installed. Battery CT photos from S1/S3 map here.",
      },
      // NOTE: S4 "Pull back of Balance of System" (battery) has been REMOVED.
      // All BOS pullback photos — with or without battery — are classified as E5 (Electrical BOS).
      // Battery pullback photos are NOT a separate category; they fall under E5 like all other BOS pullbacks.
      // --- Additional for Back up batteries ---
      {
        lrCode: "S5",
        lrLabel: "Gateway -or- System Controller -or- Transfer Switch wiring",
        lrRequirements: "Transfer switch panels (Gateway) with all internal wiring and breaker ratings clearly legible.",
        internalCategory: "Storage",
        internalSubcategory: "S5_Gateway_Transfer_Switch_Wiring",
        isConditional: true,
        condition: "Required if backup battery is installed",
      },
      {
        lrCode: "S6",
        lrLabel: "Gateway -or- System Controller -or- Transfer Switch label",
        lrRequirements: "Picture of the manufacturer label. Photo should show make & model of ATS installed on site. Required if monitoring portal access is not granted at M1.",
        internalCategory: "Storage",
        internalSubcategory: "S6_Gateway_Transfer_Switch_Label",
        isConditional: true,
        condition: "Required if backup battery is installed and monitoring portal access not granted at M1",
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // SECTION F: SYSTEM COMMISSIONING
  // ═══════════════════════════════════════════════════════════════
  {
    bucketName: "System Commissioning",
    description: "Screenshots of the product commissioning applications should be shown fully paired with active communication...",
    subCategories: [
      {
        lrCode: "SC1",
        lrLabel: "Commissioning (Tesla)",
        lrRequirements: "System fully operational with all devices paired, active communication, reporting production and consumption data including cellular connection. Tesla screenshots should show 'LightReach' added as partner, inverter & CTs enabled, networking connected to Cellular. Include operations settings page for panel current limit & PCS settings.",
        internalCategory: "System_Commissioning",
        internalSubcategory: "Commissioning_Tesla",
        isConditional: true,
        condition: "Tesla inverter/battery systems only",
      },
      {
        lrCode: "SC2",
        lrLabel: "Commissioning (Enphase)",
        lrRequirements: "System fully commissioned in Enphase Enlighten. Palmetto/LightReach must be fleet owner. Screenshots showing system ID, location, all devices communicating.",
        internalCategory: "System_Commissioning",
        internalSubcategory: "Commissioning_Enphase",
        isConditional: true,
        condition: "Enphase inverter systems only",
      },
      {
        lrCode: "SC3",
        lrLabel: "Commissioning (SolarEdge)",
        lrRequirements: "Screenshots should show system monitoring active, inverter communicating, and optimizer-level reporting. For systems WITH BATTERIES ONLY: also show 20% minimum backup reserve and Storm Guard enabled.",
        internalCategory: "System_Commissioning",
        internalSubcategory: "Commissioning_SolarEdge",
        isConditional: true,
        condition: "SolarEdge inverter systems only (battery settings apply only when battery is installed)",
      },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// SITE IMPROVEMENT / ADDERS (Section G) — M2 Activation
// Not part of M1 Install Package, but tracked for reference
// ═══════════════════════════════════════════════════════════════
export const LR_SITE_IMPROVEMENT_CATEGORIES = [
  {
    lrCode: "SI1",
    lrLabel: "MPU -or- Trench -or- Tree Removal",
    lrRequirements: "Photos provided at Activation (M2) submission.",
    milestone: "Activation",
  },
  {
    lrCode: "SI2",
    lrLabel: "Specific Incentive Required Photos (All incentive states)",
    lrRequirements: "IQ Combiner label serial is mandatory photo (irrespective of monitoring). Clearly legible serial numbers for inverter (SolarEdge/other) or Enphase IQ combiner box.",
    milestone: "Activation",
  },
];

// ═══════════════════════════════════════════════════════════════
// HELPER: Map our internal subcategory to LR portal bucket + code
// ═══════════════════════════════════════════════════════════════

export interface LRMappingResult {
  bucket: string;
  lrCode: string;
  lrLabel: string;
  lrRequirements: string;
  isConditional: boolean;
  condition?: string;
}

/**
 * Given our internal category + subcategory, returns the LR portal bucket info.
 * Returns null if no mapping found.
 */
export function mapToLRBucket(
  internalCategory: string,
  internalSubcategory: string
): LRMappingResult | null {
  for (const bucket of LR_PHOTOPACK_BUCKETS) {
    for (const sub of bucket.subCategories) {
      if (
        sub.internalCategory === internalCategory &&
        sub.internalSubcategory === internalSubcategory
      ) {
        return {
          bucket: bucket.bucketName,
          lrCode: sub.lrCode,
          lrLabel: sub.lrLabel,
          lrRequirements: sub.lrRequirements,
          isConditional: sub.isConditional,
          condition: sub.condition,
        };
      }
    }
  }
  return null;
}

/**
 * Given an LR code (e.g., "PS1", "E4", "S3"), returns full mapping info.
 */
export function getByLRCode(lrCode: string): (LRMappingResult & { internalCategory: string; internalSubcategory: string }) | null {
  for (const bucket of LR_PHOTOPACK_BUCKETS) {
    for (const sub of bucket.subCategories) {
      if (sub.lrCode === lrCode) {
        return {
          bucket: bucket.bucketName,
          lrCode: sub.lrCode,
          lrLabel: sub.lrLabel,
          lrRequirements: sub.lrRequirements,
          isConditional: sub.isConditional,
          condition: sub.condition,
          internalCategory: sub.internalCategory,
          internalSubcategory: sub.internalSubcategory,
        };
      }
    }
  }
  return null;
}

/**
 * Returns all sub-categories for a given LR bucket name.
 */
export function getSubCategoriesForBucket(bucketName: string): LRBucketSubCategory[] {
  const bucket = LR_PHOTOPACK_BUCKETS.find((b) => b.bucketName === bucketName);
  return bucket ? bucket.subCategories : [];
}

/**
 * Returns a flat list of all LR codes with their internal mappings.
 * Useful for building dropdowns or classification outputs.
 */
export function getAllLRMappings(): Array<{
  bucket: string;
  lrCode: string;
  lrLabel: string;
  internalCategory: string;
  internalSubcategory: string;
  isConditional: boolean;
}> {
  const mappings: Array<{
    bucket: string;
    lrCode: string;
    lrLabel: string;
    internalCategory: string;
    internalSubcategory: string;
    isConditional: boolean;
  }> = [];

  for (const bucket of LR_PHOTOPACK_BUCKETS) {
    for (const sub of bucket.subCategories) {
      mappings.push({
        bucket: bucket.bucketName,
        lrCode: sub.lrCode,
        lrLabel: sub.lrLabel,
        internalCategory: sub.internalCategory,
        internalSubcategory: sub.internalSubcategory,
        isConditional: sub.isConditional,
      });
    }
  }

  return mappings;
}
