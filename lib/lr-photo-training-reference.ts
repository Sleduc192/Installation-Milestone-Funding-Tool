/**
 * LightReach M1 Install Photo Training Reference
 * ================================================
 * Compiled from deep dive into approved Install Packages across:
 *   - Seamless Energy LLC (sleduc@seamlessenergy.com): Vernon Lovell, John Dumas
 *   - Solar Quote Inc. (sleduc@solarquote.com): David Becker, Jesus Bugarin
 *
 * This file documents what GOOD (approved) photos look like for each
 * LR portal header/bucket, based on real approved projects.
 *
 * Used by AI analysis to understand what passes LR review.
 */

export interface PhotoTrainingExample {
  /** LR portal code (PS1, R2, E4, etc.) */
  lrCode: string;
  /** What a good photo looks like */
  goodPhotoDescription: string;
  /** Common filename patterns from real approved projects */
  typicalFilenames: string[];
  /** Key visual elements the AI should look for */
  keyVisualElements: string[];
  /** Common mistakes that still get approved (edge cases) */
  approvedEdgeCases?: string[];
  /** Real-world observations from approved projects */
  fieldNotes: string[];
}

export const PHOTO_TRAINING_EXAMPLES: PhotoTrainingExample[] = [
  // ═══════════════════════════════════════════════════════════
  // PROJECT SITE (PS1-PS7)
  // ═══════════════════════════════════════════════════════════
  {
    lrCode: "PS1",
    goodPhotoDescription: "Close-up of the inverter/microinverter/optimizer label showing the model name and serial number clearly. Often held in a gloved hand before installation. Label must be straight-on, well-lit, and fully legible.",
    typicalFilenames: ["micro.jpg", "inverter label.jpg", "optimizer label.jpg", "IQ8HC.jpg"],
    keyVisualElements: [
      "Model number clearly readable (e.g., 'Enphase IQ8HC-72-M-DOM-US')",
      "Serial number visible",
      "Manufacturer logo (Enphase, SolarEdge, etc.)",
      "UL/certification marks",
      "Rating plate information (voltage, current, frequency)",
    ],
    fieldNotes: [
      "Vernon Lovell: Enphase micro held in gloved hand, serial 532602047652, IQ model label visible",
      "Often photographed before mounting on rail — easier to get clean shot",
      "Phone camera with flash works fine as long as no glare on label",
    ],
  },
  {
    lrCode: "PS2",
    goodPhotoDescription: "Close-up of the IQ Combiner box label or SolarEdge inverter+DC safety switch serial labels. Must show make, model, serial number, electrical ratings, and certifications clearly.",
    typicalFilenames: ["combiner label.jpg", "IQ combiner serial.jpg", "inverter serial.jpg"],
    keyVisualElements: [
      "Full model designation (e.g., 'Enphase IQ Combiner 5 X-IQ-AM1-240-5-HDK')",
      "Serial number (legible barcode or text)",
      "Electrical ratings (voltage, frequency, max breaker amps)",
      "Wire connection specifications",
      "PV CT and CTRL wiring sections visible",
      "UL/NOM certification marks",
    ],
    fieldNotes: [
      "Vernon Lovell: IQ Combiner 5 label — 120/240V, 60Hz, DG Breakers 80A MAX",
      "Serial number must be fully legible — partial serial = rejection",
      "Label photo typically taken after box is mounted but before cover is closed",
    ],
  },
  {
    lrCode: "PS4",
    goodPhotoDescription: "Close-up of the solar panel manufacturer label/placard showing model, wattage, electrical specs, and certifications. Typically on the back of the module.",
    typicalFilenames: ["module placard.jpg", "module label.jpg", "panel label.jpg"],
    keyVisualElements: [
      "Manufacturer name and logo (QCells, REC, Jinko, etc.)",
      "Model number (e.g., 'Q.PEAK DUO BLK ML-G10.C+ 410')",
      "Nominal power (Watts)",
      "Full specs table (Isc, Voc, Imp, Vmp, etc.)",
      "Barcode with serial number",
      "Certification marks (CE, UL, etc.)",
    ],
    fieldNotes: [
      "Vernon Lovell: QCells Q.PEAK DUO BLK ML-G10.C+ 410W — full specs table, barcode serial 20112602550360046",
      "David Becker: QCells Q.TRON BLK M-G2 module",
      "Label typically on the back/underside of the panel — photograph BEFORE mounting",
    ],
  },
  {
    lrCode: "PS5",
    goodPhotoDescription: "Single serial number photo from one installed module — for O&M and recall tracking.",
    typicalFilenames: ["module serial.jpg", "serial number.jpg"],
    keyVisualElements: [
      "Single panel serial number clearly legible",
      "Barcode or QR code visible",
      "Module manufacturer identifiable",
    ],
    fieldNotes: [
      "Often combined with PS4 (same label has both model and serial)",
      "Only need ONE serial from the entire array",
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ROOF / MOUNTING SYSTEM (R1-R6)
  // ═══════════════════════════════════════════════════════════
  {
    lrCode: "R1",
    goodPhotoDescription: "Close-up showing roof attachments with flashing properly installed (or sealant properly applied for flashingless systems). Must show the attachment hardware, any flashing or sealant, and the roof surface.",
    typicalFilenames: ["Close up photo of Flashing & Sealant.jpg", "close up attachments.jpg", "flashing.jpg", "sealant.jpg"],
    keyVisualElements: [
      "Attachment foot/mount clearly visible on roof surface",
      "Flashing (if applicable) properly seated under shingles",
      "Sealant application visible around/on the attachment",
      "Lag bolt or structural fastener visible",
      "Roof material (shingles, tile, etc.) identifiable for context",
    ],
    approvedEdgeCases: [
      "David Becker: Mounting foot shown on asphalt shingles WITHOUT visible sealant — still approved (flashingless system)",
    ],
    fieldNotes: [
      "Vernon Lovell: Close up showing flashing under shingles with sealant around edges",
      "David Becker: Simple L-foot attachment without flashing on comp shingle roof",
      "Both approaches approved — key is showing the attachment method clearly",
    ],
  },
  {
    lrCode: "R2",
    goodPhotoDescription: "Pullback shot of a mounting plane showing rail with optimizers or microinverters mounted, Equipment Grounding Conductor (EGC) path visible, and wire management completed. Wires secured with UV-resistant clips/ties.",
    typicalFilenames: [
      "rail with micros + EGC + wire management.jpg",
      "rail with optis + egc + wire management.jpg",
      "rail with micros + EGC + wire management-1.jpg",
      "rail with optis + egc + wire management (1).jpg",
    ],
    keyVisualElements: [
      "Rails visible across the roof plane",
      "Microinverters or optimizers mounted on rails (identifiable as small boxes)",
      "Bare copper EGC running along/between the racking — the grounding copper route on the roof",
      "Wire management with permanent, outdoor-rated, UV-resistant clips or cable ties",
      "Wires secured on rail or directly to modules, accessible for service",
      "No loose/hanging wires",
      "Multiple photos for multi-plane arrays (one per mounting plane minimum)",
    ],
    fieldNotes: [
      "Vernon Lovell: Enphase micros on rail with green EGC copper wire visible, zip ties for wire management",
      "David Becker: Optimizers (optis) on rail — 4 separate photos for different sections",
      "One photo per mounting plane minimum — multi-plane arrays need multiple photos",
      "Filename convention often includes 'micros' for Enphase, 'optis' for SolarEdge/Tigo",
      "LR PORTAL REQUIREMENT: 'Equipment Grounding Conductor (EGC) Path: Include the route of grounding copper between the rails on the roof for each array installed' — the bare copper EGC running along/between the racking IS a required element of R2, not a separate grounding photo",
      "A photo showing copper on the racking with all racking components (rails, micros/optis, wire management) is a GREAT R2 photo — this stays in R2 as the correct primary bucket while also documenting the EGC grounding path",
      "Wires must be secured with permanent, outdoor rated & UV-resistant clips or cable ties, installed on rail or directly to modules — wire management should be accessible for service",
    ],
  },
  {
    lrCode: "R3",
    goodPhotoDescription: "Full completed array photo with all modules visible and rail ends trimmed. For tall/low-pitch homes, photo taken FROM the roof. One photo per array.",
    typicalFilenames: ["array (16panels).jpg", "array (13panels).jpg", "complete array.jpg"],
    keyVisualElements: [
      "ALL modules in the array visible and countable",
      "Rail ends trimmed (no exposed rail extending past last module)",
      "Array appears complete and professionally installed",
      "Good enough angle to verify panel count matches design",
    ],
    fieldNotes: [
      "Vernon Lovell: 16-panel array shot from roof level — all modules visible",
      "David Becker: 13-panel array — taken from elevated position showing full layout",
      "Filename often includes panel count — useful for verification",
      "Sunset/golden hour photos acceptable as long as panels are visible",
    ],
  },
  {
    lrCode: "R4",
    goodPhotoDescription: "Under-array wire management photo showing wires NOT touching the roof surface, secured and elevated above the plane. One photo per array.",
    typicalFilenames: ["Under Array.jpg", "under array.jpg", "under array (1).jpg"],
    keyVisualElements: [
      "View underneath the installed panels",
      "Wire bundles visible and elevated off roof surface",
      "Wire clips/management hardware visible",
      "No conductors dragging on shingles/roof material",
      "Clean, organized routing",
    ],
    fieldNotes: [
      "Vernon Lovell: Under-array shot showing secured wire bundles above roof surface",
      "David Becker: Two under-array photos for two separate array planes",
      "Photo typically taken by reaching camera under edge of array",
    ],
  },
  {
    lrCode: "R5",
    goodPhotoDescription: "Tilt angle measurement taken ON the module surface (not the roof) using a digital angle finder (e.g., Klein inclinometer), magnetic protractor/angle locator (e.g., Johnson), or phone app screenshot showing the angle with context of the array being measured. One photo per unique roof pitch. NOTE: A tape measure is NOT a tilt meter — tape measures show linear distance (inches/feet), not angle (degrees). Photos with tape measures do NOT qualify as R5 Tilt.",
    typicalFilenames: ["tilt.jpg", "tilt 1.jpg", "tilt 2.jpg"],
    keyVisualElements: [
      "Digital angle finder / inclinometer showing degrees (e.g., Klein digital level reading '26.1°')",
      "Magnetic protractor / angle locator on module surface (e.g., Johnson angle locator)",
      "Phone app screenshot showing tilt angle WITH array context visible",
      "Measurement device resting ON the module surface",
      "Angle reading clearly legible in degrees",
      "Context showing which array/roof plane is being measured",
    ],
    fieldNotes: [
      "Vernon Lovell: Phone level app showing tilt angle on module surface",
      "David Becker: Two tilt photos — 'tilt 1.jpg' and 'tilt 2.jpg' for two different pitches",
      "Multiple tilt photos needed when arrays span different roof pitches",
      "Phone app screenshots with inclinometer are the most common format",
    ],
  },
  {
    lrCode: "R6",
    goodPhotoDescription: "Open junction box on the roof showing completed wiring and bonding. Conductors terminated, conduit transition visible. Max 2 inches of exposed conductors outside the array.",
    typicalFilenames: ["junction box.jpg", "j-box.jpg", "rooftop junction box.jpg"],
    keyVisualElements: [
      "Junction box lid open showing interior",
      "Completed wire terminations visible",
      "Bonding (green/bare copper) wire connected",
      "Conduit transition from j-box visible",
      "No excessive exposed conductors outside array footprint",
    ],
    fieldNotes: [
      "Vernon Lovell: Open J-box with terminated conductors and conduit transition",
      "David Becker: Similar junction box photo with wiring visible",
      "J-box should NOT have more than 2 inches of exposed conductors outside array",
      "DUAL-USE: An open j-box photo showing completed wiring + bonding + the EGC (bare copper equipment grounding conductor) transitioning from array into conduit ALSO satisfies R2 (shows EGC path on rooftop) and can provide grounding/bonding documentation for E5 context",
      "The EGC visible inside the j-box IS the rooftop segment of the grounding path — same photo legitimately serves R6, R2, and E5 when all elements are visible",
      "OPEN vs CLOSED J-BOX: Both belong in R6. An OPEN j-box (lid off, wiring visible) is the ideal LR-required photo — score it higher. A CLOSED j-box (lid on, mounted on roof, conduit entering) is still valid R6 — it documents the j-box is installed. Mark it as bonus/supplementary and note the open view is needed for full approval.",
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // ELECTRICAL (E1-E9)
  // ═══════════════════════════════════════════════════════════
  {
    lrCode: "E1",
    goodPhotoDescription: "Interior of the inverter or Enphase IQ Combiner box showing complete AC wiring, breakers from branch circuits, and terminations. Dead-front removed.",
    typicalFilenames: ["Combiner box showing AC wiring.jpg", "E1 combiner.jpg", "SE open inverter.jpg"],
    keyVisualElements: [
      "Combiner box/inverter interior with cover/dead-front removed",
      "Branch circuit breakers visible and labeled",
      "AC wiring (red, blue/black, white neutral, green ground) terminated",
      "Wire gauge identifiable",
      "Clean, organized wiring layout",
    ],
    fieldNotes: [
      "Vernon Lovell (Enphase): IQ Combiner 5 interior — breakers, color-coded AC wiring (red, blue, green, white)",
      "David Becker (SolarEdge): 'SE open inverter.jpg' — SolarEdge inverter interior",
      "For Enphase: show breakers from each branch circuit inside IQ Combiner",
      "For SolarEdge: show open inverter with AC connection terminals",
    ],
  },
  {
    lrCode: "E2",
    goodPhotoDescription: "Close-up of the main breaker showing its amp rating clearly. The breaker handle should be visible and the rating number legible.",
    typicalFilenames: ["main breaker & busbar rating.jpg", "main breaker.jpg", "E2 main breaker.jpg"],
    keyVisualElements: [
      "Main breaker handle/switch visible",
      "Amp rating clearly readable (e.g., '150', '200')",
      "'MAIN' label visible if present",
      "ON/OFF position identifiable",
    ],
    fieldNotes: [
      "Vernon Lovell: 150A main breaker in ON position with 'MAIN' label visible",
      "Rating number is THE critical element — must be legible",
      "Auto-fail if main breaker is <100A (LR requirement)",
    ],
  },
  {
    lrCode: "E3",
    goodPhotoDescription: "Panel label/sticker showing the busbar rating, manufacturer, model number, and wire specifications. Usually a sticker inside the panel door or on the panel itself.",
    typicalFilenames: ["main panel busbar rating.jpg", "panel label.jpg", "busbar.jpg"],
    keyVisualElements: [
      "Panel manufacturer name (Square D, Siemens, GE, Eaton, Westinghouse, etc.)",
      "Catalog/model number",
      "Busbar ampere rating",
      "Wire type specifications",
      "Series designation",
    ],
    fieldNotes: [
      "Vernon Lovell: Square D QO 30MW150 Series E8 — 'LOAD CENTER' label with wire specs",
      "John Dumas: Westinghouse B/0 2020CT panel label",
      "Different manufacturers have different label formats — all accepted as long as ratings are legible",
    ],
  },
  {
    lrCode: "E4",
    goodPhotoDescription: "Two photos needed: (1) Contextual pullback showing where the solar interconnects to the electrical panel, (2) Close-up of the actual connection method — backfed breaker, IPCs, parallel lugs, or distribution block with wire terminations visible.",
    typicalFilenames: ["Point of interconnection 2.jpg", "POI.jpg", "backfed breaker.jpg", "interconnection.jpg"],
    keyVisualElements: [
      "Backfed breaker clearly identified in panel",
      "Wire terminations at the connection point",
      "Breaker position (should be at opposite end from main per NEC 705.12(B))",
      "Color-coded conductors (hot, neutral, ground)",
      "If Hoffman/load-side tap: downstream sub-panel with OCPD rating visible",
    ],
    fieldNotes: [
      "Vernon Lovell: Interior panel shot showing backfed breaker with colored conductors (blue, red, yellow, white, green)",
      "John Dumas: Panel interior with POI breaker and wiring with timestamp overlay",
      "NEC 705.12(B): Backfed breaker must be at opposite end from main breaker",
    ],
  },
  {
    lrCode: "E5",
    goodPhotoDescription: "Wide pullback photo showing the complete Balance of System equipment installed — utility meter, main panel, inverter/combiner, AC disconnect, conduit runs, grounding electrode conductor (GEC), and labeling. Should show the full context of BOS area. Also includes EGC/GEC grounding path photos showing where the equipment grounding conductor connects to the grounding electrode (ground rod, Ufer, water pipe bond).",
    typicalFilenames: ["Pullback photo 1.jpg", "pullback photo.jpg", "BOS pullback.jpg", "E5 BOS.jpg", "grounding.jpg", "ground rod.jpg", "EGC connection.jpg"],
    keyVisualElements: [
      "Utility meter visible",
      "Main panel visible",
      "Inverter or IQ Combiner box visible",
      "AC disconnect (if applicable) visible",
      "Conduit routing between components",
      "Emergency disconnect label/signage",
      "Overall professional appearance",
      "EGC/GEC grounding path: bare copper wire running from conduit into ground (often through 1/2\" PVC)",
      "Ground rod connection: bare copper clamped to a driven copper rod",
      "Grounding electrode conductor visible along exterior wall or in conduit",
      "Grounding bus bar connections in panel",
    ],
    fieldNotes: [
      "Vernon Lovell: Wide shot showing meter, main panel, AC disconnect, conduit runs, 'EMERGENCY DISCONNECTION / SOLAR SOURCE' label",
      "John Dumas: Two BOS pullback photos — one showing full equipment run along house siding",
      "David Becker: Pullback showing full BOS equipment stack",
      "This is often the 'money shot' — shows everything in context",
      "EGC/GEC grounding photos: bare copper wire that attaches to the rails (rail bonding) → through junction box on roof → down conduit through BOS → into ground via PVC to grounding electrode. Shows the EGC connection to GEC for system grounding and bonding. Great supplementary photo even if not an explicit LR requirement.",
      "IMPORTANT: Grounding path photos are NOT Point of Interconnection (E4) — the POI is where AC power connects to the grid, the grounding electrode is where safety ground connects to earth. These are completely different systems.",
      "AC DISCONNECT / RAPID SHUTDOWN SWITCH: A close-up of an exterior-mounted disconnect (Eaton, Square D, Siemens, etc.) with PV SYSTEM DISCONNECT or RAPID SHUTDOWN labels is a valid E5 BOS photo — it documents the disconnect as an installed BOS component. Not the ideal wide pullback, but it belongs in E5, NOT in E4 (POI).",
      "CONDUIT ON WALL: A photo showing conduit (EMT, PVC, flex) mounted on an exterior or interior wall is documenting the BOS conduit run — this is valid E5 documentation. Not the ideal wide pullback, but it shows the conduit path as a BOS component. Do NOT reclassify to PS6 or other non-BOS categories.",
    ],
  },
  {
    lrCode: "E6",
    goodPhotoDescription: "Production Meter or Production CTs photo. For Enphase: production CT showing L1 wiring from branch circuits through the CT in the IQ Combiner. CT terminations with correct phases in correct terminals. SolarEdge inverters with built-in RGM may auto-pass.",
    typicalFilenames: ["CT.jpg", "CTs.jpg", "production CT.jpg", "production meter.jpg"],
    keyVisualElements: [
      "CT clamp visible on correct conductors",
      "CT orientation/direction identifiable",
      "For Enphase: L1 wiring from branch circuits through single production CT",
      "CT terminal lugs with correct phases",
      "For SolarEdge: Built-in RGM (may not need separate CT photo)",
    ],
    fieldNotes: [
      "Vernon Lovell: CTs clamped around conductors inside panel, ON/OFF breakers visible",
      "SolarEdge systems with built-in revenue grade metering may auto-pass this requirement",
    ],
  },
  {
    lrCode: "E7",
    goodPhotoDescription: "Consumption CTs on service feeders showing CT location and direction. All projects require consumption monitoring.",
    typicalFilenames: ["CT.jpg", "CTs.jpg", "consumption CTs.jpg"],
    keyVisualElements: [
      "CTs on service feeder conductors",
      "Direction/orientation of CTs identifiable",
      "If CTs cannot be installed, photo showing context of why",
    ],
    fieldNotes: [
      "Often combined in same photo as E6 (production CTs) in the panel",
      "Vernon Lovell: Single CT photo covers both production and consumption",
    ],
  },
  {
    lrCode: "E8",
    goodPhotoDescription: "Interior of fused AC disconnect showing completed wiring, terminations, bonding, and clearly legible fuse ratings. REQUIRED when the POI uses IPCs (insulated piercing connectors) on the service wire — the fused disconnect provides NEC-required overcurrent protection. NOT bonus when IPCs are used; it is mandatory. If the POI uses a backfed breaker in the main panel (no IPCs), then E8 is optional.",
    typicalFilenames: ["Close up photo of fused AC disconnect.jpg", "close up fused AC disco.jpg", "Fused AC Disconnects.jpg"],
    keyVisualElements: [
      "Fuse manufacturer and model visible (e.g., Bussmann FUSETRON)",
      "Fuse rating clearly legible (e.g., 'FRN-R-40, 250Vac')",
      "Line/load lug terminations visible",
      "Wire terminations visible and properly torqued",
      "Bonding (green ground wire) connected",
      "Disconnect enclosure open showing interior",
      "Red/black/white/green conductors properly terminated",
    ],
    fieldNotes: [
      "Vernon Lovell: Two photos — close-up of Bussmann FUSETRON FRN-R-40 250Vac fuses, plus wider shot of full disconnect interior",
      "David Becker: 'close up fused AC disco.jpg' — single close-up",
      "CRITICAL: When POI uses IPCs, the fused disconnect is NOT optional — it is the NEC-required overcurrent protection device",
      "The IPC → fused disconnect pairing is the alternative to a backfed breaker in the main panel",
      "Both close-up AND wider context shots commonly submitted together",
    ],
  },
  {
    lrCode: "E9",
    goodPhotoDescription: "For large systems with multiple inverters/combiners: each sub panel shown fully wired with legible breaker ratings and bus rating label.",
    typicalFilenames: ["combiner sub panel.jpg", "sub panel.jpg"],
    keyVisualElements: [
      "Sub panel interior with all breakers visible",
      "Breaker ratings legible",
      "Bus rating label/sticker visible",
      "Complete wiring visible",
    ],
    fieldNotes: [
      "Not commonly needed — only for large systems",
      "Most residential installs in the training data did NOT have E9 photos",
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // STORAGE (S1-S6) — Battery systems only
  // ═══════════════════════════════════════════════════════════
  {
    lrCode: "S1",
    goodPhotoDescription: "Close-up of battery manufacturer label showing make, model, serial number, and electrical ratings. For multi-battery installs, each unit needs its own label photo with a hand-written number marker.",
    typicalFilenames: ["battery label.jpg", "powerwall label.jpg", "IQ battery label.jpg", "IMG_3410.jpg"],
    keyVisualElements: [
      "Battery manufacturer and model clearly readable (e.g. 'SolarEdge BAT-10K1P')",
      "Part Number legible (e.g. 'UBAT-10K1PS0B-03')",
      "Serial number legible (e.g. 'SY3025-0630A5B58-20')",
      "Electrical ratings (voltage, capacity — e.g. '9.7kWh')",
      "QR code or barcode if present",
      "Hand-written unit number marker visible ('1', '2', '3') for multi-battery systems",
    ],
    fieldNotes: [
      "Todd Reynolds (SolarQuote): 3× SolarEdge BAT-10K1P batteries — each had individual label photo with marker '1', '2', '3'",
      "Label fills 60%+ of frame, shot straight-on with good lighting",
      "Battery bottom also contains FCC compliance label and QR code — include if P/N not on front label",
    ],
  },
  {
    lrCode: "S2",
    goodPhotoDescription: "Internal battery wiring showing DC connections, ground wire terminations, and comms wiring. Battery cover/access panel MUST be removed.",
    typicalFilenames: ["battery wiring.jpg", "battery interior.jpg", "IMG_3410.jpg"],
    keyVisualElements: [
      "Battery front cover or access panel removed — internal terminals visible",
      "MC4 connectors for DC strings (Bat+/Bat-) with 'Do not disconnect under load' warnings",
      "Green ground wire terminating at grounding lug block",
      "Yellow-green comms/drain wire properly routed",
      "DC conductor colors correct: red (+), black (−)",
      "Inter-battery daisy-chain wiring for multi-battery stacks",
    ],
    fieldNotes: [
      "Todd Reynolds REJECTED initially for 'Wiring of battery, gateway, controller, or transfer switch'",
      "Root cause: some wiring shots had battery covers still on — need FULL internal view",
      "Show MC4 connector type and 'STOP' warnings clearly — Palmetto wants to verify proper connectors used",
      "For stacked batteries: show the DC daisy-chain connections between units",
    ],
  },
  {
    lrCode: "S3",
    goodPhotoDescription: "Full system overview showing inverter, battery stack, and conduit routing in a single wide-angle shot.",
    typicalFilenames: ["system overview.jpg", "battery stack.jpg", "inverter and batteries.jpg"],
    keyVisualElements: [
      "SolarEdge inverter visible on wall (or Enphase equivalent)",
      "All battery units visible in wall-mount bracket/rack",
      "Conduit runs from inverter to batteries clearly traceable",
      "'CAUTION SOLAR CIRCUIT' label on conduit visible",
      "Full installation context — location, mounting surface, clearances",
    ],
    fieldNotes: [
      "Todd Reynolds: SolarEdge USE11400H inverter top, 3× BAT-10K1P in wall-mount bracket below",
      "Multiple angles helpful — front (covers on) + side (covers off showing internals)",
      "Conduit entry from inverter to top of battery stack clearly visible",
    ],
  },
  {
    lrCode: "S5",
    goodPhotoDescription: "Gateway/System Controller/Transfer Switch interior with dead-front removed showing all wiring, breaker ratings, and terminations.",
    typicalFilenames: ["gateway wiring.jpg", "BUG interior.jpg", "transfer switch.jpg"],
    keyVisualElements: [
      "Dead-front/cover removed",
      "All landed conductors visible",
      "Neutral bar and ground bar visible",
      "Breaker terminations and ratings legible",
      "Comms wiring if applicable",
    ],
    fieldNotes: [
      "Tesla BUG2: show line/load lugs, neutrals, ground bar, contactor",
      "Enphase IQ System Controller: show all breaker terminations and comms",
      "Todd Reynolds (SolarEdge): Arbitrage battery — no separate gateway, but inverter has integrated disconnect",
    ],
  },

  // ═══════════════════════════════════════════════════════════
  // SYSTEM COMMISSIONING (SC1-SC3)
  // ═══════════════════════════════════════════════════════════
  {
    lrCode: "SC1",
    goodPhotoDescription: "Tesla app commissioning screenshots showing LightReach added as partner, inverter & CTs enabled, networking connected to Cellular, and operations settings.",
    typicalFilenames: ["tesla commissioning.png", "tesla app.png"],
    keyVisualElements: [
      "'LightReach' or 'Palmetto' visible as partner",
      "Inverter enabled",
      "CTs enabled",
      "Cellular networking connected",
      "Panel current limit and PCS settings page",
    ],
    fieldNotes: [
      "No Tesla projects found in reviewed data",
    ],
  },
  {
    lrCode: "SC2",
    goodPhotoDescription: "Enphase Enlighten monitoring portal screenshot showing: (1) system registered under Palmetto Solar, LLC (LightReach) as fleet owner, (2) System ID visible, (3) all devices communicating. Also Enphase Installer Toolkit screenshots showing cellular connectivity with all green checkmarks.",
    typicalFilenames: ["monitoring access request.png", "lovell monitoring access.png", "becker access.png", "Screenshot_*.jpg"],
    keyVisualElements: [
      "'Palmetto Solar, LLC (LightReach)' or 'PV System Maintainer' designation",
      "System ID visible",
      "System Location with correct address",
      "All connectivity checks green (cellular modem, SIM, network, internet, DNS, monitoring)",
      "'S_OK' status indicators",
      "Cellular carrier identified (T-Mobile, etc.)",
    ],
    approvedEdgeCases: [
      "Vernon Lovell: Monitoring access REQUEST screenshot (pending approval) — still accepted",
      "John Dumas: 14 commissioning screenshots — includes error states during commissioning process that were resolved",
    ],
    fieldNotes: [
      "Vernon Lovell: Enphase Enlighten showing 'Palmetto Solar, LLC (LightReach) | PV System Maintainer'",
      "John Dumas: Extensive Enphase Installer Toolkit screenshots — SN 7515D1E8-43, Connected (S_OK), T-Mobile cellular, ALL green checkmarks for modem/SIM/network/internet/DNS/monitoring",
      "John Dumas also showed error recovery: Emergency RSD triggered → then resolved to S_OK",
      "Multiple screenshots showing the full commissioning journey are common and accepted",
    ],
  },
  {
    lrCode: "SC3",
    goodPhotoDescription: "SolarEdge mySolarEdge app commissioning screenshots showing: (1) Wi-Fi connection to inverter, (2) Inverter Energy + Production Meter, (3) Communication status, (4) Summary with P_OK optimizer count, (5) Commissioning Wizard Summary all green, (6) monitoring access granted to Palmetto Solar. For battery: also Backup Reserve ≥20% and Storm Guard ON.",
    typicalFilenames: ["becker access.png", "solaredge monitoring.png", "SE commissioning.png", "Reynolds Commissioning.pdf"],
    keyVisualElements: [
      "mySolarEdge app: 'Connected to Inverter Wi-Fi' screen with SN and Wi-Fi SSID (e.g. SEDG-75157880-82)",
      "Inverter Energy: Today/Month/Year production visible (confirms system producing)",
      "Production Meter SN visible with Modbus ID and Status: OK",
      "Communication: Ethernet/RS485-1/RS485-2/Wi-Fi/Home Network statuses",
      "Summary: 'P_OK: X of X Optimizers Communicating' — ALL must match (e.g. P_OK: 42 of 42)",
      "Status: Production, Power Limit visible (e.g. 11.4 kW), Switch: On",
      "DC Voltage, Isolation (kOhm), Temp, AFCI status, Sense Connect: Enabled",
      "Commissioning Wizard Summary: all steps completed with green ✓ checkmarks",
      "Inverter Part Number (e.g. USE11400H-USSKBEZ8) and Model (e.g. SE11400H-US) in wizard",
      "Grid profile (e.g. US/Rule21 240V)",
      "SolarEdge monitoring portal: 'Palmetto Solar' in Associated Accounts with 'View/Edit' access",
      "If battery: Backup Reserve ≥20% and Storm Guard toggle ON",
    ],
    approvedEdgeCases: [
      "Todd Reynolds submitted 8 mySolarEdge screenshots covering the complete commissioning flow — thorough coverage accepted",
      "Commissioning Wizard shown TWICE (pages 7 & 8) at slightly different times with slightly different power readings — redundancy accepted",
    ],
    fieldNotes: [
      "David Becker: SolarEdge monitoring portal — Site 'Becker1606', Site Access > Associated Accounts showing 'Palmetto Solar' with View/Edit access granted 03/17/2025",
      "Todd Reynolds: SolarEdge mySolarEdge app — SN 75157880-82, 44 panels, P_OK: 42 of 42 optimizers, USE11400H-USSKBEZ8 inverter, US/Rule21 240V grid",
      "Todd Reynolds: 8 screenshots covering Wi-Fi connect → Energy → Meters → Comms → Summary → DC/Isolation → Commissioning Wizard Summary (×2)",
      "SolarEdge uses both mySolarEdge app (installer commissioning) AND monitoring portal (site sharing to Palmetto)",
      "Different from Enphase: SolarEdge needs BOTH app commissioning screenshots AND portal access sharing",
    ],
  },
];

// ═══════════════════════════════════════════════════════════
// CROSS-PROJECT OBSERVATIONS
// ═══════════════════════════════════════════════════════════
export const CROSS_PROJECT_OBSERVATIONS = {
  fileFormats: [
    "JPEG (.jpg/.jpeg) — most common, from phone cameras",
    "PNG (.png) — common for screenshots (commissioning, monitoring)",
    "HEIC (.heic) — iPhone format, seen in John Dumas project",
    "Gallery screenshots — Android phones: 'Screenshot_YYYYMMDD_HHMMSS_Gallery.jpg'",
  ],
  namingPatterns: [
    "Descriptive names: 'main breaker & busbar rating.jpg', 'combiner label.jpg'",
    "Camera defaults: 'IMG_1164.JPG', 'IMG_1163.JPG'",
    "Android screenshots: 'Screenshot_20260317_194932_Gallery.jpg'",
    "Panel count in name: 'array (13panels).jpg', 'array (16panels).jpg'",
    "Component + attribute: 'rail with optis + egc + wire management.jpg'",
    "Sequential numbering: 'tilt 1.jpg', 'tilt 2.jpg'",
  ],
  photoCounts: {
    projectSite: "2-4 photos typical (labels, serial, module placard)",
    roof: "7-15 photos typical (depends on array count and complexity)",
    electrical: "8-19 photos (more photos = more thorough = better approval odds)",
    storage: "0 for solar-only, 6-12 for battery systems",
    commissioning: "1-14 screenshots (Enphase tends to have more than SolarEdge)",
  },
  commonRejectionRecovery: [
    "John Dumas: Roof 'Does not meet LR requirements' → Resolved after resubmission",
    "John Dumas: 'Array tilt is over 5 degrees off from model' → Resolved",
    "John Dumas: 'Duplicate Serial Number' → NOT resolved (still has flag)",
    "David Becker: 'Consumption CT location is incorrect' → NOT resolved (1 flag)",
  ],
  equipmentVariety: {
    panels: ["QCells Q.PEAK DUO BLK ML-G10.C+", "QCells Q.TRON BLK M-G2"],
    invertersMicros: ["Enphase IQ8HC-72-M-DOM-US", "Enphase IQ8PLUS-72-2-US", "SolarEdge (model varies)"],
    combiners: ["Enphase IQ Combiner 5 (X-IQ-AM1-240-5-HDK)"],
    panels_electrical: ["Square D QO 30MW150", "Westinghouse B/0 2020CT"],
    disconnects: ["Bussmann FUSETRON FRN-R-40"],
  },
  projectLocations: [
    "Vernon Lovell — Seamless Energy (QCells + Enphase IQ8HC, 16 panels, 6.56kW)",
    "John Dumas — Seamless Energy (multiple commissioning screenshots, extensive documentation)",
    "David Becker — Solar Quote (Ann Arbor MI, QCells + SolarEdge, 13 panels)",
    "Jesus Bugarin — Solar Quote (Los Angeles CA, QCells Q.TRON + Enphase IQ8PLUS, 12 panels, 5.1kW)",
    "Todd Reynolds — Solar Quote (Murrieta CA, QCells Q.PEAK 410 + SolarEdge USE11400H + 3× BAT-10K1P, 44 panels, Arbitrage Battery — REJECTED then resubmitted)",
  ],
};
