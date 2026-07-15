/**
 * APPROVED CORPUS LEARNINGS
 *
 * Empirical patterns derived from 14 install-approved photopacks (~1,100 photos)
 * audited from the SolarQuote / Seamless Energy portal projects:
 *   BATCH 1 (7 projects, 237 photos):
 *   - Anthony Dunigan, Charles Helmka, Diana Dooley, Jeffrey Veytruba,
 *     Kelli Garman, Vernon Lovell, latonia glass-jenkins
 *   BATCH 2 (6 projects, 767 photos — strategic sample from 20 activation accounts):
 *   - John Sharp (71 files, 12 storage, Backup Battery), Jose Vera (217 files, largest pack),
 *     GWENDOLYN Maxie (144 files, 24 SC screenshots), Bradshaw Nunnally (127 files, 71 PS),
 *     Monica Castro (188 files, 99 electrical), Jesus Bugarin (20 files, minimal baseline)
 *   + Todd Reynolds (rejected→resubmitted, SolarEdge battery system)
 *
 * These are NOT requirements — they are observed traits common to projects
 * that Palmetto APPROVED. The AI prompt uses these as a positive reference
 * to calibrate confidence/quality scores.
 */

export interface BucketCorpusStats {
  bucket: string;
  approvedRangePerProject: string;
  canonicalLabels: string[];
  approvedTraits: string[];
  redFlags: string[];
}

export const APPROVED_CORPUS_BY_BUCKET: BucketCorpusStats[] = [
  {
    bucket: "Project Site",
    approvedRangePerProject: "3–71 photos (avg 5–8 for standard, up to 71 for over-documented projects like Bradshaw Nunnally)",
    canonicalLabels: [
      "Combiner Label (X-IQ-AM1-240-5 / IQ Combiner, or Enphase IQ Combiner 5)",
      "Microinverter / Micro Label (Enphase IQ8 serial sticker, e.g. QS Plus 7.8 S32524000475)",
      "Module Label / Module Placard (QCells Q.PEAK, Q.TRON, G11R BLK serial)",
      "IQ Combiner installed view",
      "Front of Home with address number (Photo_Front_of_Home_include_address_number)",
      "Back Side / Left Side / Right Side of Home exterior",
      "Utility Meter (Photo_Utility_Meter — close-up of meter face with readable numbers)",
      "Circuit Map Drawing (hand-drawn or printed circuit map for multi-array systems)",
      "Attic Access Location (for roof-mount conduit penetration verification)",
    ],
    approvedTraits: [
      "Each label fills 60%+ of frame; serial/model text is fully legible without zooming",
      "Photo taken straight-on, no glare washing out the printed text",
      "One clear photo per label type (not a wide shot with multiple labels)",
      "Module label is the placard sticker on the panel back or rating plate — not the box",
      "Home exterior shots include address number visible in frame (Jose Vera pattern)",
      "Utility meter close-up shows readable kWh and meter number",
      "Large systems (30+ panels) often include a hand-drawn circuit map photo",
    ],
    redFlags: [
      "Label is angled, blurry, or sun-bleached",
      "Photo is of the carton/packaging instead of the installed component",
      "Wide shot where label text cannot be read",
      "Home exterior photo doesn't include address number",
    ],
  },
  {
    bucket: "Roof",
    approvedRangePerProject: "7–112 photos (scales with array count; Jose Vera had 112 for a large multi-array system)",
    canonicalLabels: [
      "Array (NN panels) — one photo per array, panel count in caption/filename (e.g. 'array 12panels.png')",
      "Close-up Attachments / Flashing / Sealant (Close_up_of_mount_showing_sealant)",
      "Rail with Micros (+ EGC + wire management) (Pre-panel_photos_showing_wire_managementmicros)",
      "Under Array (showing complete wire management and pull-back)",
      "Tilt for EVERY single array (Tilt_for_EVERY_single_array — multiple angles per array)",
      "Roof Junction Box / Roof pipe / attic pipe (Roof_pipe_attic_pipe)",
      "Sticker Map — sticker labels on rails showing module serial mapping (Sticker_map)",
      "Panel nameplate with home address in one photo (Panel_name_plate_with_home_address_in_one_photo)",
      "Cantilever measurement between mount and end of CUT rail",
      "Measurement between rails (Measurement_between_rails)",
      "Photos Inside Attic multiple photos (attic penetration verification)",
    ],
    approvedTraits: [
      "Full array visible with all panels countable in a single frame",
      "Close-ups of attachments show flashing AND sealant in same shot",
      "Rail photos show the micro AND the EGC bonding clip AND clean wire management",
      "Under-array shots demonstrate no drooping wire; conduits properly secured",
      "Tilt photos are taken from the side/edge so the angle relative to roof plane is visible",
      "Sticker maps show sequential module serial labels placed on rails (Jose Vera had 8 sticker map photos)",
      "Panel nameplate photo includes the home address visible in the same frame as the panel label",
      "Large systems (20+ panels) include cantilever + rail measurement photos to prove structural compliance",
      "Attic photos (interior) verify proper penetration sealing and conduit routing through roof",
    ],
    redFlags: [
      "Partial array — panels cut off at edge of frame",
      "Attachment close-up missing either flashing or sealant",
      "Wires hanging loose under array, not in wire management clips",
      "Tilt shot taken from front so angle cannot be assessed",
      "Sticker map labels are partially peeled or illegible",
      "Missing cantilever measurement for systems with cut rails",
    ],
  },
  {
    bucket: "Electrical",
    approvedRangePerProject: "6–99 photos (avg 15–25; Monica Castro had 99 for a thorough commercial-scale pack)",
    canonicalLabels: [
      "Open Combiner Box (dead-front off, all AC wiring visible) (combiner box.png)",
      "Main Breaker (close-up of main breaker with amp rating visible) (Main_Service_Panel_Main_Breaker_Size)",
      "Main Panel Busbar Rating (separate shot if MSP differs from combiner)",
      "Main Service Panel Location — multiple exterior shots (Photo_Main_Service_Panel_Location)",
      "Main Service Panel with Cover Removed — dead-front off (Photo_Main_Service_Panel_with_Cover_Removed, up to 19 photos)",
      "Main Service Panel Labels (Photo_Main_Service_Panel_Labels_all — all breaker labels legible)",
      "Main Service Panel Breaker Sizes (Photo_Main_Service_Panel_Breaker_Sizes_all)",
      "Fused AC Disconnect (Bussmann/Cooper 30A/50A fuse rating visible) (non fused AC disco / fused AC disco)",
      "Point of Interconnection (POI) — breaker, location in panel",
      "Pullback (Balance of System / AC pullback showing conduit runs)",
      "CTs (Consumption CTs clamped on service entrance conductors, correct orientation)",
      "Utility Meter (Photo_Utility_Meter — often duplicated in PS bucket)",
      "Expected Inverter Location (Expected_Inverter_Location)",
      "Conduit Run (Photo_Conduit_Run — conduit routing from roof to panel)",
      "Junction Box Location (Photo_Junction_Box_Location)",
      "Attic Access / Inside Attic photos (wiring routing through attic, up to 35 photos for thorough packs)",
    ],
    approvedTraits: [
      "Combiner shot has dead-front fully removed; every breaker visible and labeled",
      "Busbar rating is photographed with adequate lighting — stamp clearly readable",
      "Fused AC disco shows BOTH the fuse rating label AND the wiring terminations",
      "CT shot clearly shows arrow orientation pointing toward the grid (or load per spec)",
      "Pullback shot includes enough context to trace conduit from disco to panel",
      "MSP dead-front removed showing internal bus, breakers, and wiring — multiple angles common (Jose Vera had 19 cover-removed shots)",
      "MSP labels are readable — all breaker labels/schedules captured",
      "Clamp meter readings shown on wires for verification (John Sharp pattern)",
      "Non-fused AC disconnect: wiring terminations visible through open cover",
    ],
    redFlags: [
      "Combiner box still has dead-front on — breakers/bus not visible",
      "Busbar rating stamped area is dark, glared, or out of focus",
      "CTs photographed without showing orientation arrow",
      "POI photo only shows the panel exterior, not the breaker inside",
      "MSP cover not removed — internal bus/breakers not visible",
      "Attic photos too dark to see conduit routing",
    ],
  },
  {
    bucket: "System Commissioning",
    approvedRangePerProject: "1–24 screenshots (GWENDOLYN Maxie had 24; many are roof/equipment photos mis-categorized in SC bucket)",
    canonicalLabels: [
      "Enphase Enlighten: Fleet Owner access screenshot with system name + ID",
      "Enphase Enlighten: Monitoring access request / granted confirmation",
      "Enphase Enlighten: Setup Builder screen showing system configuration tiles",
      "Palmetto Commissioning Report — filled-out form/PDF with system details",
      "SolarEdge mySolarEdge app: Connected to Inverter Wi-Fi (SN + Wi-Fi SSID)",
      "SolarEdge: Inverter Energy (Today/Month/Year) + Production Meter SN",
      "SolarEdge: Communication status (Ethernet, RS485-1 Modbus, RS485-2 SE Follower, Wi-Fi)",
      "SolarEdge: Summary (P_OK: X of Y Optimizers Communicating, Power, Voltage, Frequency, Status: Production)",
      "SolarEdge: Commissioning Wizard Summary (all steps green ✓, Inverter P/N + Model + Power, Grid profile)",
      "SolarEdge: DC Voltage, Isolation, Temp, AFCI, Sense Connect",
      "SolarEdge mySolarEdge: Backup Reserve set to 20% (storage projects)",
      "SolarEdge: Storm Guard enabled (storage projects)",
      "Tesla app commissioning screenshot (Powerwall projects)",
    ],
    approvedTraits: [
      "Screenshot includes system identifier (Site ID, system name, or address) visible on screen",
      "Date/time stamp on the device is recent (matches install date)",
      "Fleet Owner role is explicitly shown for Enphase",
      "Multiple commissioning screens captured (overview + permissions + production)",
      "SolarEdge: 'P_OK: X of X Optimizers Communicating' visible — proves all modules reporting",
      "SolarEdge: Commissioning Wizard Summary shows all steps completed with green checkmarks",
      "SolarEdge: Inverter SN visible in top nav bar of mySolarEdge app on every screenshot",
      "WARNING: SC bucket frequently contains MIS-CATEGORIZED photos (roof/flashing/equipment shots put in SC by installers). Gwendolyn Maxie had 24 'SC' photos but most were roof/attachment close-ups. Accept these gracefully — they don't invalidate the pack.",
    ],
    redFlags: [
      "Generic dashboard screenshot with no system ID visible",
      "Wrong account showing (homeowner-only access vs Fleet Owner)",
      "Cropped screenshot hiding the address/system name banner",
      "SolarEdge: Commissioning Wizard not finished (steps still pending)",
      "SolarEdge: P_OK shows fewer optimizers than expected (e.g. P_OK: 38 of 42)",
    ],
  },
  {
    bucket: "Storage",
    approvedRangePerProject: "1–12 photos (John Sharp had 12 approved storage photos; many projects have just 1 screenshot; 14 of 20 activation accounts had storage files)",
    canonicalLabels: [
      "Battery serial label — one per battery unit, marker number on unit (e.g. '1', '2', '3')",
      "Internal battery wiring — DC connections (MC4 Bat+/Bat-), green ground to lug block, comms wire",
      "Battery disconnect / transfer switch panel — closed with labels visible",
      "Battery disconnect internals — open cover showing breakers, DC cables (red/black), wiring",
      "Battery bottom — FCC label, terminal block, QR code, MC4 connectors with 'Do not disconnect under load' warnings",
      "Inter-battery DC daisy-chain — showing red+/black−/green ground across stacked units",
      "System overview — inverter + batteries + conduit routing in single shot (Photo_Electrical_Component_Overview)",
      "Inverter-to-battery conduit — close-up of conduit entry, 'CAUTION SOLAR CIRCUIT' label",
      "Clamp meter readings on battery cables — verification shots (John Sharp pattern)",
      "Battery CT connection detail — current transformer on battery cables",
      "Gateway / System Controller / Transfer Switch interior wiring (if applicable)",
      "Gateway label (if applicable)",
      "Backup loads sub-panel (if applicable)",
    ],
    approvedTraits: [
      "Each battery has its own dedicated serial label photo — label fills 60%+ of frame, P/N and SN legible",
      "Battery number marker visible in photo (hand-written '1', '2', '3' etc.) to correlate with serial",
      "Wiring photos show MC4 connector type clearly ('STOP / Do not disconnect under load')",
      "Ground wires terminate at a visible grounding lug block",
      "Comms/drain wire (yellow-green) is visible and routed cleanly",
      "System overview photo shows full installation: inverter location, battery stack, conduit path",
      "Cover removed for wiring shots — internal terminals, breakers, and bus visible",
      "Battery disconnect panel shown both CLOSED (labels/warnings visible) and OPEN (internal wiring)",
      "Clamp meter shown reading current on battery cables for verification (John Sharp had multiple clamp meter shots)",
      "WARNING: Many approved projects have ONLY 1 storage file (often a single commissioning screenshot or PDF). This is common for arbitrage-only battery systems.",
    ],
    redFlags: [
      "Battery covers still on — internal wiring not visible (THIS was the rejection trigger on Todd Reynolds)",
      "Serial label photo too dark, angled, or partially obscured",
      "Missing per-battery serial photos (e.g. only 1 label shot for 3 batteries)",
      "No system overview shot showing conduit routing between inverter and batteries",
      "Wiring shot doesn't show grounding lug or ground wire termination",
      "CT photo missing or CT orientation arrow not visible",
      "File mislabeled as wrong bucket (e.g. roof junction box photo filed under Storage)",
    ],
  },
];

/**
 * Overall observations across all approved projects.
 */
export const APPROVED_CORPUS_GLOBAL = {
  totalProjects: 14,
  totalPhotos: 1100,
  avgPhotosPerProject: 79,
  activationAccountAudit: {
    totalActivationAccounts: 20,
    totalFilesAcross20: 1598,
    accountsWithStorage: "14 of 20 (70% have at least 1 storage file)",
    sizeRange: "20 files (Jesus Bugarin) to 217 files (Jose Vera)",
    allApprovedStatuses: true,
  },
  distribution: {
    projectSite: "~12% of photos (avg 5–8 per project; Bradshaw Nunnally was outlier with 71)",
    roof: "~38% of photos (avg 15–30 per project, up to 112 for large multi-array systems) — the largest bucket",
    electrical: "~30% of photos (avg 15–25 per project, up to 99 for thorough packs like Monica Castro)",
    storage: "~5% of photos (0 for solar-only, 1 for most battery projects, up to 12 for John Sharp)",
    systemCommissioning: "~5% of photos (avg 1–3 per project; Gwendolyn Maxie had 24 but most were mis-categorized roof photos)",
  },
  approvalSignals: [
    "THOROUGHNESS BEATS BREVITY: Projects with 30+ photos approved at higher rate than minimum sets",
    "EXTREME RANGE IS FINE: 20 photos (Bugarin) AND 217 photos (Vera) BOTH approved — Palmetto accepts any level of documentation",
    "REDUNDANT ANGLES: Multiple shots of the same item (e.g. 'tilt 1' + 'tilt 2') from different angles",
    "DESCRIPTIVE FILENAMES: 'main breaker & busbar rating.jpg' > 'IMG_1234.jpg' (helps reviewers). Jose Vera used automated naming like 'Photo_Main_Service_Panel_with_Cover_Removed-87.jpg'",
    "DEDICATED PER-LABEL SHOTS: One photo = one label/component, not combined wide shots",
    "LEGIBILITY FIRST: Every serial number, fuse rating, busbar stamp readable without enlargement",
    "PDF BUNDLES: Some installers submit all photos compiled into a single PDF per bucket (e.g. Reynolds Electrical.pdf, 'Additional Install Photos.pdf' — Jesus Bugarin had same PDF in 3 buckets) — accepted by Palmetto portal",
    "DUPLICATE FILES ACROSS BUCKETS: Same photo often appears in multiple buckets (e.g. a meter photo in both PS and Electrical). This is NORMAL and APPROVED.",
    "BATTERY PROJECTS: Each battery unit needs its OWN serial label photo; mark units with hand-written numbers",
    "SOLAREDGE COMMISSIONING: Capture 6-8 screenshots from mySolarEdge app (Wi-Fi connect, Energy, Comms, Summary with P_OK optimizer count, Commissioning Wizard Summary)",
    "MIS-CATEGORIZATION IS COMMON AND ACCEPTED: Gwendolyn Maxie had 24 'SC' photos that were mostly roof close-ups. Palmetto reviewers handle this gracefully.",
    "CLAMP METER VERIFICATION: John Sharp included clamp meter reading shots on battery cables and disconnects — shows professional verification",
    "ATTIC PHOTOS: Large systems often include 10-35 interior attic photos showing conduit routing, penetration sealing — not required but highly thorough",
  ],
  equipmentSeenInApprovedSet: {
    modules: [
      "QCells Q.PEAK DUO BLK ML-G10.C+ 410",
      "QCells Q.TRON BLK M-G2",
      "QCells G11R BLK 91-G3.1H 430 (Jesus Bugarin — LA, CA)",
    ],
    micros: [
      "Enphase IQ8HC-72-M-DOM-US",
      "Enphase IQ8PLUS-72-2-US",
      "QS Plus 7.8 (Bradshaw Nunnally — serial S32524000475)",
    ],
    inverters: ["SolarEdge USE11400H-USSKBEZ8 (SE11400H-US)"],
    optimizers: ["SolarEdge power optimizers (P_OK: 42 of 42 in Todd Reynolds)"],
    combiners: ["Enphase IQ Combiner 5 (X-IQ-AM1-240-5-HDK)"],
    batteries: ["SolarEdge BAT-10K1P (UBAT-10K1PS0B-03, 9.7kWh each)"],
    panels: ["Square D SC3042M200PF (200A Mains, 225A Bus)"],
    disconnects: ["Bussmann FUSETRON FRN-R-30/40/50"],
    monitoring: ["Enphase Enlighten (Fleet Owner)", "SolarEdge mySolarEdge app"],
  },
  geographicCoverage: {
    states: ["MI (Fowlerville, Ann Arbor, Grand Haven, Otsego, Pontiac, Mason, Grand Ledge)", 
             "MA (Randolph, Fitchburg, Adams, Weymouth, Amesbury)", 
             "IL (Matteson, Oak Park, Belleville, Chicago)", 
             "CA (Los Angeles, Murrieta)", 
             "CT (Stamford)"],
    note: "All approved across diverse climates and jurisdictions — pattern is universal",
  },
  rejectionLessons: {
    toddReynolds: {
      system: "SolarEdge USE11400H + 3× BAT-10K1P (29.1kWh), 44× QCells Q.PEAK 410, Murrieta CA",
      firstSubmission: "REJECTED — 'Wiring of battery, gateway, controller, or transfer switch' + 'Inverter Combiner Wiring'",
      likelyCause: "Battery covers still on in some wiring shots; insufficient detail of internal connections",
      resubmission: "Added IMG_3410 (inverter combiner sub-panel) and IMG_2597 (electrical pullback); storage resubmission was mislabeled (roof junction box photo filed as storage)",
      lesson: "Palmetto requires battery covers REMOVED showing internal DC terminals, bus, and breaker. Per-unit serial + number-marker photos critical for multi-battery installs.",
    },
  },
};

/**
 * Returns a short, prompt-ready summary for a given bucket — designed to be
 * injected into the AI vision system prompt to calibrate it against approved work.
 */
export function getApprovedCorpusGuidance(bucket: string): string {
  const normalized = bucket.toLowerCase();
  const match = APPROVED_CORPUS_BY_BUCKET.find(
    (b) =>
      b.bucket.toLowerCase() === normalized ||
      normalized.includes(b.bucket.toLowerCase().split(" ")[0])
  );
  if (!match) return "";
  return [
    `APPROVED-CORPUS REFERENCE for ${match.bucket} (derived from 14 approved photopacks, ~1,100 photos audited):`,
    `- Typical approved count per project: ${match.approvedRangePerProject}`,
    `- Canonical labels seen in approved work:`,
    ...match.canonicalLabels.map((l) => `    • ${l}`),
    `- Traits common to APPROVED photos:`,
    ...match.approvedTraits.map((t) => `    ✓ ${t}`),
    `- Red flags seen on REJECTED photos:`,
    ...match.redFlags.map((r) => `    ✗ ${r}`),
  ].join("\n");
}

/**
 * Maps a category name (e.g. 'R1_Attachments', 'E3_POI') to its parent bucket
 * for guidance lookup.
 */
export function bucketForCategory(category: string): string {
  const c = category.toUpperCase();
  if (c.startsWith("PS")) return "Project Site";
  if (c.startsWith("R")) return "Roof";
  if (c.startsWith("E")) return "Electrical";
  if (c.startsWith("S") && !c.startsWith("SC")) return "Storage";
  if (c.startsWith("SC")) return "System Commissioning";
  return "";
}
