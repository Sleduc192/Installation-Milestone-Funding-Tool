"use client";

import { useState, useEffect, useMemo } from "react";
import { useWorkspaceUser } from "@/hooks/use-workspace-user";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Camera, CheckCircle2, AlertCircle, AlertTriangle,
  FileStack, Shield, Zap, BarChart3, Download, ExternalLink,
  ClipboardList, Eye, ChevronDown, ChevronRight, Loader2, XCircle,
  ImageIcon, Info, RefreshCw, Layers, Search, Package, Link2, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { SiteSurveyImporter } from "@/components/site-survey-importer";

const ConfidenceChart = dynamic(() => import("./confidence-chart"), { ssr: false, loading: () => <div className="h-48 bg-muted animate-pulse rounded-lg" /> });

// ─── Equipment Comparison sub-component ────────────────────────────────────

function EquipmentComparisonCard({
  submission, submissionId, equipSearch, setEquipSearch,
  equipSearchResults, setEquipSearchResults,
  equipSearching, setEquipSearching,
  equipLinking, setEquipLinking, setSubmission,
}: {
  submission: any; submissionId: string;
  equipSearch: string; setEquipSearch: (v: string) => void;
  equipSearchResults: any[]; setEquipSearchResults: (v: any[]) => void;
  equipSearching: boolean; setEquipSearching: (v: boolean) => void;
  equipLinking: boolean; setEquipLinking: (v: boolean) => void;
  setSubmission: (fn: any) => void;
}) {
  const sold: any = submission?.soldEquipment ?? null;
  const allDesignFiles: any[] = submission?.designCadFiles ?? [];
  // Only show the latest (first match) per file type
  const latestPlanset = allDesignFiles.find((f: any) => {
    const atype = (f?.attachmentType ?? "").toLowerCase();
    const label = (f?.label ?? "").toLowerCase();
    const fname = (f?.fileName ?? "").toLowerCase();
    return atype === "planset" || atype === "designs" || label.includes("planset") || label.includes("design") || fname.includes("planset") || fname.includes("design");
  });
  const latestProductionModel = allDesignFiles.find((f: any) => {
    const atype = (f?.attachmentType ?? "").toLowerCase().replace(/[\s_-]+/g, "");
    const label = (f?.label ?? "").toLowerCase();
    const fname = (f?.fileName ?? "").toLowerCase();
    return atype === "productionmodel" || label.includes("production") || fname.includes("production");
  });
  const latestShadeReport = allDesignFiles.find((f: any) => {
    const atype = (f?.attachmentType ?? "").toLowerCase().replace(/[\s_-]+/g, "");
    const label = (f?.label ?? "").toLowerCase();
    const fname = (f?.fileName ?? "").toLowerCase();
    return atype === "shadereport" || label.includes("shade") || fname.includes("shade");
  });
  const plansetFiles: any[] = latestPlanset ? [latestPlanset] : [];
  const productionModelFiles: any[] = latestProductionModel ? [latestProductionModel] : [];
  const shadeReportFiles: any[] = latestShadeReport ? [latestShadeReport] : [];

  const handleSearch = async () => {
    if (!equipSearch.trim()) return;
    setEquipSearching(true);
    try {
      const r = await fetch(`/api/sch/search?q=${encodeURIComponent(equipSearch.trim())}&limit=8`);
      const d = await r.json();
      setEquipSearchResults(d?.projects ?? []);
    } catch { setEquipSearchResults([]); }
    setEquipSearching(false);
  };

  const handleLink = async (schProjectId: number) => {
    setEquipLinking(true);
    try {
      const r = await fetch("/api/sch/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId, schProjectId }),
      });
      const d = await r.json();
      if (r.ok) {
        setSubmission((prev: any) => ({
          ...(prev ?? {}),
          schProjectId,
          soldEquipment: d.equipment,
          designCadFiles: d.designCadFiles ?? prev?.designCadFiles ?? [],
        }));
        setEquipSearchResults([]);
        setEquipSearch("");
        const designCount = (d.designCadFiles ?? []).filter((f: any) => f.storedUrl).length;
        toast.success(`Equipment linked${designCount > 0 ? ` + ${designCount} design file(s)` : ""}`);
      } else {
        toast.error(d?.error || "Failed to link");
      }
    } catch { toast.error("Link failed"); }
    setEquipLinking(false);
  };

  // Build discrepancy flags from AI analysis vs sold equipment
  const discrepancies = useMemo(() => {
    if (!sold) return [];
    const flags: { field: string; sold: string; detected: string; severity: "info" | "warn" }[] = [];
    const photos: any[] = submission?.photos ?? [];

    // Detect inverter type from analysis results
    const analysisTexts = photos
      .map((p: any) => {
        const ar = p?.analysisResult;
        const summary = typeof ar === "string" ? ar : (ar?.summary ?? ar?.analysis ?? ar?.detailed_analysis ?? "");
        return typeof summary === "string" ? summary : JSON.stringify(summary);
      })
      .join(" ")
      .toLowerCase();

    // Panel check
    if (sold.panel?.name) {
      const panelName = sold.panel.name.toLowerCase();
      const panelMfg = (sold.panel.manufacturer ?? "").toLowerCase();
      // Check if any analysis mentions the panel
      const panelMentioned = analysisTexts.includes(panelMfg) || analysisTexts.includes(panelName.split(" ")[0]?.toLowerCase?.() ?? "");
      // Only flag if we detect a DIFFERENT panel mentioned
      const otherPanels = ["rec", "longi", "jinko", "canadian solar", "silfab", "mission", "solaria", "lg", "panasonic", "trina"];
      const detectedOther = otherPanels.find(op => !panelMfg.includes(op) && analysisTexts.includes(op));
      if (detectedOther) {
        flags.push({ field: "Panel", sold: `${sold.panel.manufacturer} ${sold.panel.name}`, detected: `Photos may show "${detectedOther}" panels`, severity: "warn" });
      }
    }

    // Inverter check
    if (sold.inverter?.name) {
      const invName = sold.inverter.name.toLowerCase();
      const invMfg = (sold.inverter.manufacturer ?? "").toLowerCase();
      // Check for inverter type discrepancy
      const isEnphase = invMfg.includes("enphase") || invName.includes("iq8") || invName.includes("iq7");
      const isSolaredge = invMfg.includes("solaredge") || invName.includes("solaredge");
      if (isEnphase && analysisTexts.includes("solaredge")) {
        flags.push({ field: "Inverter", sold: sold.inverter.name, detected: "Photos may show SolarEdge equipment", severity: "warn" });
      }
      if (isSolaredge && (analysisTexts.includes("enphase") || analysisTexts.includes("iq8"))) {
        flags.push({ field: "Inverter", sold: sold.inverter.name, detected: "Photos may show Enphase equipment", severity: "warn" });
      }
    }

    // Battery check — only show when battery is part of the project
    if (sold.batteryCount > 0 && !analysisTexts.match(/\bbatter(y|ies)\b/)) {
      flags.push({ field: "Storage", sold: `${sold.batteryCount} battery(s) sold`, detected: "No battery photos detected", severity: "warn" });
    }

    return flags;
  }, [submission, sold]);

  return (
    <Card className="shadow-sm border-2 border-violet-200/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Package className="w-5 h-5 text-violet-600" />
          Equipment — Sold vs Installed
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sold ? (
          <>
            {/* Equipment details grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                <p className="text-[10px] font-mono text-violet-500 uppercase">Panel (Sold)</p>
                <p className="text-sm font-semibold mt-1">{sold.panel?.manufacturer ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{sold.panel?.name ?? "—"}</p>
                {sold.panel?.watts && <p className="text-xs text-muted-foreground">{sold.panel.watts}W</p>}
              </div>
              <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                <p className="text-[10px] font-mono text-violet-500 uppercase">Inverter (Sold)</p>
                <p className="text-sm font-semibold mt-1">{sold.inverter?.manufacturer ?? "—"}</p>
                <p className="text-xs text-muted-foreground">{sold.inverter?.name ?? "—"}</p>
                {sold.inverter?.type && <Badge variant="outline" className="text-[9px] mt-1">{sold.inverter.type}</Badge>}
              </div>
              <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                <p className="text-[10px] font-mono text-violet-500 uppercase">System Size</p>
                <p className="text-sm font-semibold mt-1">{sold.systemSizeKw ?? "—"} kW</p>
                <p className="text-xs text-muted-foreground">{sold.panelCount} panels • {sold.mountingType ?? "—"}</p>
              </div>
              {sold.batteryCount > 0 && (
                <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                  <p className="text-[10px] font-mono text-violet-500 uppercase">Storage</p>
                  <p className="text-sm font-semibold mt-1">{sold.batteryCount} Battery(s)</p>
                  {sold.adders?.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Adders: {sold.adders.filter((a: any) => a.type === "Equipment").map((a: any) => a.name).join(", ") || "None"}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Discrepancy flags */}
            {discrepancies.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-mono text-amber-600 uppercase font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> Equipment Discrepancies — Review Recommended
                </p>
                {discrepancies.map((d, i) => (
                  <div key={i} className={`p-3 rounded-lg border text-sm ${
                    d.severity === "warn" ? "bg-amber-50 border-amber-200" : "bg-blue-50 border-blue-200"
                  }`}>
                    <span className="font-semibold">{d.field}:</span>{" "}
                    <span className="text-muted-foreground">Sold: </span>
                    <span>{d.sold}</span>
                    <span className="text-muted-foreground"> → Detected: </span>
                    <span className={d.severity === "warn" ? "text-amber-700 font-medium" : "text-blue-700"}>{d.detected}</span>
                  </div>
                ))}
              </div>
            )}
            {discrepancies.length === 0 && (
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> No equipment discrepancies detected between sold and installed.
                </p>
              </div>
            )}

            {/* Design files sections: Planset / Production Model / Shade Report */}
            {([{ title: "Planset", files: plansetFiles, color: "violet" }, { title: "Production Model", files: productionModelFiles, color: "blue" }, { title: "Shade Report", files: shadeReportFiles, color: "emerald" }] as const).map(({ title, files, color }) => (
              <div key={title} className="mt-3 pt-3 border-t border-violet-100">
                <p className="text-[10px] font-mono text-violet-500 uppercase font-semibold flex items-center gap-1 mb-2">
                  <FileText className="w-3 h-3" /> {title}
                </p>
                {files.length > 0 ? (
                  <div className="space-y-1.5">
                    {files.map((f: any, idx: number) => {
                      const hasUrl = !!f.storedUrl;
                      const isPdf = (f.fileName ?? "").toLowerCase().endsWith(".pdf");
                      const label = f.fileName?.replace(/[_]/g, " ").replace(/\.\w+$/, "") ?? `${title} ${idx + 1}`;
                      const sizeKb = f.fileSize ? `${Math.round(f.fileSize / 1024)} KB` : "";
                      return (
                        <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-violet-50/50 border border-violet-100 hover:bg-violet-50 transition-colors group">
                          <FileText className={`w-4 h-4 flex-shrink-0 ${isPdf ? "text-red-500" : "text-blue-500"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" title={f.fileName}>{label}</p>
                            {sizeKb && <p className="text-[10px] text-muted-foreground">{sizeKb}</p>}
                          </div>
                          {hasUrl ? (
                            <a
                              href={f.storedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Open
                            </a>
                          ) : (
                            <Badge variant="outline" className="text-[9px] text-amber-600 border-amber-300">Not downloaded</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 font-medium">Missing</p>
                )}
              </div>
            ))}

            <p className="text-[10px] text-muted-foreground mt-2">
              SCH Project #{sold.schProjectId} • Data fetched {sold.fetchedAt ? new Date(sold.fetchedAt).toLocaleDateString() : "—"}
            </p>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              No equipment data linked yet. Search for the SCH project to compare sold vs installed equipment.
            </p>
            {/* Search box */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={equipSearch}
                  onChange={(e) => setEquipSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Search by customer name or project ID…"
                  className="w-full pl-10 pr-4 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/30"
                />
              </div>
              <Button size="sm" onClick={handleSearch} disabled={equipSearching} className="bg-violet-600 hover:bg-violet-700 text-white">
                {equipSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search SCH"}
              </Button>
            </div>

            {/* Search results */}
            {equipSearchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-64 overflow-y-auto">
                {equipSearchResults.map((p: any) => (
                  <div key={p.id} className="p-3 flex items-center justify-between hover:bg-muted/30 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">#{p.id} — {p.projectName}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.systemSize ? `${p.systemSize} kW` : ""} {p.panelName ? `• ${p.panelName}` : ""} {p.state ? `• ${p.state}` : ""}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleLink(p.id)} disabled={equipLinking} className="ml-3 gap-1 text-violet-600 border-violet-300">
                      {equipLinking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Link2 className="w-3 h-3" />}
                      Link
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface Props { id: string; }

export default function SubmissionDetailClient({ id }: Props) {
  const router = useRouter();
  const { user: workspaceUser } = useWorkspaceUser();
  const [submission, setSubmission] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [expandedLabels, setExpandedLabels] = useState<Set<string>>(new Set());
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
  const [equipSearch, setEquipSearch] = useState("");
  const [equipSearchResults, setEquipSearchResults] = useState<any[]>([]);
  const [equipSearching, setEquipSearching] = useState(false);
  const [equipLinking, setEquipLinking] = useState(false);

  const [equipAutoLinked, setEquipAutoLinked] = useState(false);
  const [siteSurveyOpen, setSiteSurveyOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    let timer: any = null;
    const load = () => {
      fetch(`/api/submissions/${id}`)
        .then((r) => r?.json?.())
        .then((d: any) => {
          if (cancelled) return;
          setSubmission(d);
          const photos = d?.photos ?? [];
          photos.forEach((p: any) => {
            if (p?.cloudStoragePath) {
              fetch(`/api/file-url?path=${encodeURIComponent(p.cloudStoragePath)}&public=${p.isPublic ?? false}`)
                .then((r) => r?.json?.())
                .then((data: any) => {
                  if (data?.url) setPhotoUrls((prev) => ({ ...(prev ?? {}), [p.id]: data.url }));
                })
                .catch(() => {});
            }
          });

          // Auto-link SCH equipment if not already linked
          if (!d?.soldEquipment && !equipAutoLinked) {
            setEquipAutoLinked(true);
            fetch("/api/sch/auto-link", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ submissionId: id }),
            })
              .then((r) => r.json())
              .then((linkData: any) => {
                if (cancelled) return;
                if (linkData?.success && linkData?.equipment) {
                  setSubmission((prev: any) => ({
                    ...(prev ?? {}),
                    schProjectId: linkData.schProjectId,
                    soldEquipment: linkData.equipment,
                  }));
                  if (!linkData.alreadyLinked) {
                    toast.success("Equipment data auto-linked from SubcontractorHub");
                  }
                }
              })
              .catch(() => { /* non-blocking */ });
          }

          if (d?.status === "analyzing" || d?.status === "importing") { timer = setTimeout(load, 4000); }
        })
        .catch(() => toast.error("Failed to load submission"))
        .finally(() => setLoading(false));
    };
    load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [id]);

  // Build the detailed label-by-label report
  const report = useMemo(() => {
    if (!submission) return null;
    const expectedCategories: any[] = Array.isArray(submission?.expectedCategories) ? submission.expectedCategories : [];
    const photos: any[] = submission?.photos ?? [];
    const photosByLabel: Record<string, any[]> = {};

    // Normalize label strings so minor spacing/punctuation differences from SCH
    // (e.g. "mounted+ EGC" vs "mounted + EGC") don't create duplicate groups.
    const normalizeLabel = (lbl: string) =>
      lbl.replace(/\s*\+\s*/g, " + ").replace(/\s{2,}/g, " ").trim();
    // Canonical label map: normalizedLabel → first-seen display label
    const canonicalLabel: Record<string, string> = {};
    const toCanonical = (lbl: string) => {
      const norm = normalizeLabel(lbl);
      if (!canonicalLabel[norm]) canonicalLabel[norm] = lbl;
      return canonicalLabel[norm];
    };
    // Pre-seed canonical labels from expectedCategories so those names win
    for (const cat of expectedCategories) {
      const catName = cat?.name ?? "";
      if (catName) {
        const norm = normalizeLabel(catName);
        canonicalLabel[norm] = catName;
      }
    }

    // Build a lookup from internal category/subcategory → expected category name
    // so reclassified photos land under the correct header
    const categoryToLabelMap: Record<string, string> = {};
    // Track whether battery/storage sections exist in expected categories
    let hasBatteryCategories = false;
    // ALL "Pull back of Balance of System" entries (whether from E5 or the old S4 battery BOS)
    // are unified under E5. There is no separate battery BOS pullback header.
    // "External photo(s) showing utility meter" is also merged into E5 BOS — those
    // exterior meter/equipment photos are BOS documentation, not a separate category.
    let e5BosLabel = "";
    const bosIndicesToRemove: number[] = [];
    const labelsToMergeIntoBOS: string[] = []; // labels whose photos get merged into E5
    for (let i = 0; i < expectedCategories.length; i++) {
      const cat = expectedCategories[i];
      const catName = cat?.name ?? "";
      const lower = catName.toLowerCase();
      if (lower.includes("pull back") && lower.includes("balance")) {
        if (!e5BosLabel) {
          // First BOS pullback entry — use as E5 regardless of battery flag
          e5BosLabel = catName;
          // Remove battery-only flags so it always displays
          if (cat) {
            cat.is_required_battery = false;
            cat.is_required_solar_and_battery = false;
            cat.is_required = true;
          }
        } else {
          // Duplicate BOS pullback (e.g. old S4 battery BOS) — mark for removal
          bosIndicesToRemove.push(i);
        }
      }
      // "External photo(s) showing utility meter, placard, & full meter number" → merge into E5
      if ((lower.includes("utility meter") || lower.includes("meter number")) && lower.includes("external")) {
        bosIndicesToRemove.push(i);
        labelsToMergeIntoBOS.push(catName);
      }
      // Check if any battery/storage categories exist
      if (lower.includes("battery") || lower.includes("gateway") || lower.includes("transfer switch") || lower.includes("system controller")) {
        hasBatteryCategories = true;
      }
    }
    // Remove duplicate BOS pullback entries and merged labels (iterate backwards to preserve indices)
    const uniqueIndicesToRemove = [...new Set(bosIndicesToRemove)].sort((a, b) => b - a);
    for (const idx of uniqueIndicesToRemove) {
      expectedCategories.splice(idx, 1);
    }
    if (e5BosLabel) {
      categoryToLabelMap["Electrical_Panel__BOS_Pullback"] = e5BosLabel;
    }

    for (const cat of expectedCategories) {
      const catName = cat?.name ?? "";
      const lower = catName.toLowerCase();
      // Skip the BOS pullback — already handled above
      if (lower.includes("pull back") && lower.includes("balance")) continue;
      // Map common LR label patterns to internal categories
      if (lower.includes("inverter") && lower.includes("placard")) categoryToLabelMap["Project_Site__Inverter_Micro_Optimizer"] = catName;
      if (lower.includes("main breaker") && !lower.includes("busbar")) {
        categoryToLabelMap["Electrical_Panel__Main_Breaker"] = catName;
        categoryToLabelMap["Electrical_Panel__Main_Breaker_Busbar"] = catName; // backward compat for old photos
      }
      if (lower.includes("main breaker") && lower.includes("busbar")) {
        categoryToLabelMap["Electrical_Panel__Main_Breaker"] = catName; // legacy combined label
        categoryToLabelMap["Electrical_Panel__Main_Breaker_Busbar"] = catName;
      }
      if (lower.includes("busbar")) categoryToLabelMap["Electrical_Panel__Main_Panel_Breaker"] = catName;
      if (lower.includes("point of interconnection")) categoryToLabelMap["Electrical_Panel__POI_Backfed_Breaker"] = catName;
      if (lower.includes("production meter") || lower.includes("production ct")) categoryToLabelMap["Electrical_Panel__Production_Meter_CTs"] = catName;
      if (lower.includes("consumption")) categoryToLabelMap["Electrical_Panel__Consumption_CTs"] = catName;
      if (lower.includes("fused ac")) categoryToLabelMap["Electrical_Panel__Fused_AC_Disconnect"] = catName;
      if (lower.includes("combiner sub")) categoryToLabelMap["Electrical_Panel__Combiner_Sub_Panels"] = catName;
      if (lower.includes("combiner box") || (lower.includes("inverter") && !lower.includes("placard"))) categoryToLabelMap["Electrical_Panel__Inverter_Combiner"] = catName;
      if (lower.includes("flashing") || lower.includes("attachment")) categoryToLabelMap["Roof_Mount__Flashing_Sealant"] = catName;
      if (lower.includes("rail with")) categoryToLabelMap["Roof_Mount__Rail_Micros_EGC"] = catName;
      if (lower.includes("complete array")) {
        categoryToLabelMap["Roof_Mount__Complete_Array"] = catName;
        categoryToLabelMap["Roof_Mount__Complete_Array_Rail_Trimmed"] = catName;
      }
      if (lower.includes("under array")) categoryToLabelMap["Roof_Mount__Under_Array_Wiring"] = catName;
      if (lower.includes("tilt")) categoryToLabelMap["Roof_Mount__Tilt"] = catName;
      if (lower.includes("junction box")) categoryToLabelMap["Roof_Mount__Junction_Box"] = catName;
      if (lower.includes("module label") || lower.includes("module placard")) categoryToLabelMap["Project_Site__Module_Label"] = catName;
      if (lower.includes("serial number")) categoryToLabelMap["Project_Site__Module_Serial"] = catName;
      if (lower.includes("sticker sheet") || lower.includes("string diagram")) categoryToLabelMap["Project_Site__Sticker_Sheet_String_Diagram"] = catName;
      if (lower.includes("commissioning")) {
        // Map ALL commissioning subcategories (generic, Enphase, Tesla, SolarEdge) to this one header
        categoryToLabelMap["System_Commissioning__Commissioning_Screenshots"] = catName;
        categoryToLabelMap["System_Commissioning__Commissioning_Enphase"] = catName;
        categoryToLabelMap["System_Commissioning__Commissioning_Tesla"] = catName;
        categoryToLabelMap["System_Commissioning__Commissioning_SolarEdge"] = catName;
      }
      if (lower.includes("battery label")) { categoryToLabelMap["Storage__S1_Arbitrage_Battery"] = catName; hasBatteryCategories = true; }
      if (lower.includes("comms cable")) { categoryToLabelMap["Storage__S2_Backup_Battery"] = catName; hasBatteryCategories = true; }
      if (lower.includes("battery ct")) { categoryToLabelMap["Storage__S3_Integrated_Battery"] = catName; hasBatteryCategories = true; }
      if (lower.includes("gateway") && lower.includes("wiring")) { categoryToLabelMap["Storage__S5_Gateway_Transfer_Switch_Wiring"] = catName; hasBatteryCategories = true; }
      if (lower.includes("gateway") && lower.includes("label")) { categoryToLabelMap["Storage__S6_Gateway_Transfer_Switch_Label"] = catName; hasBatteryCategories = true; }
    }

    // Determine battery and Tesla inverter presence from SCH sold equipment data.
    // SCH data is the SOURCE OF TRUTH — if SCH says no battery, hide storage headers
    // even if the LR portal sent battery category labels.
    const sold: any = submission?.soldEquipment;
    const schLinked = !!(sold && (sold.inverter || sold.panel));
    // Battery: SCH batteryCount > 0, or fallback to LR portal categories if no SCH data
    const hasBatteryEquipment = schLinked
      ? (sold?.batteryCount > 0 || !!(sold?.batteries && sold.batteries.length > 0))
      : hasBatteryCategories;
    // Inverter brand detection from SCH equipment data
    const inverterName = (sold?.inverter?.name ?? "").toLowerCase();
    const inverterMfg = (sold?.inverter?.manufacturer ?? "").toLowerCase();
    const isTeslaInverter = schLinked
      ? (inverterMfg.includes("tesla") || inverterName.includes("tesla") || inverterName.includes("powerwall"))
      : true; // If no SCH data, don't hide MCI (play it safe)
    const isEnphaseInverter = schLinked
      ? (inverterMfg.includes("enphase") || inverterName.includes("enphase") || inverterName.includes("iq8") || inverterName.includes("iq7"))
      : false;
    const isSolaredgeInverter = schLinked
      ? (inverterMfg.includes("solaredge") || inverterName.includes("solaredge"))
      : false;

    // Helper: check if a map key targets a battery/storage category
    const isBatteryMapKey = (key: string) => key.startsWith("Storage__");

    for (const p of photos) {
      const analysis = p?.analysisResult;
      let label: string;

      // Use AI-determined category when the AI has reclassified the photo.
      // When reclassified=true, the AI detected the photo belongs in a different category
      // than where it was uploaded — use the AI's classification.
      // When reclassified=false (or no AI data), keep the photo under its original uploaded label.
      const wasReclassified = !!(analysis?.reclassified);
      const hasAICategory = !!(analysis?.category_detected || analysis?.correct_lr_code);

      if (wasReclassified && hasAICategory) {
        // Photo was reclassified by AI — group it under the CORRECT header
        const recat = p?.category || analysis?.category_detected || "";
        const resub = p?.subcategory || analysis?.subcategory_detected || "";
        const mapKey = `${recat}__${resub}`;

        // If no battery on this project, don't route photos into battery categories
        if (!hasBatteryEquipment && isBatteryMapKey(mapKey)) {
          label = toCanonical(p?.expectedLabel || p?.category || "Unknown");
        } else {
          // Try to find the matching expected category header
          const mappedLabel = categoryToLabelMap[mapKey];
          if (mappedLabel) {
            label = toCanonical(mappedLabel);
          } else if (analysis?.correct_lr_label) {
            // Fall back to the LR label from the AI
            label = toCanonical(analysis.correct_lr_label);
          } else {
            label = toCanonical(p?.expectedLabel || p?.category || "Unknown");
          }
        }
      } else {
        // Not reclassified or no AI data — keep under original uploaded label
        label = toCanonical(p?.expectedLabel || p?.category || "Unknown");
      }

      if (!photosByLabel[label]) photosByLabel[label] = [];
      photosByLabel[label].push(p);
    }

    // Merge photos from "utility meter" labels into E5 BOS
    if (e5BosLabel) {
      const canonBos = toCanonical(e5BosLabel);
      for (const mergeLabel of labelsToMergeIntoBOS) {
        const canonMerge = toCanonical(mergeLabel);
        const mergePhotos = photosByLabel[canonMerge];
        if (mergePhotos && mergePhotos.length > 0) {
          if (!photosByLabel[canonBos]) photosByLabel[canonBos] = [];
          photosByLabel[canonBos].push(...mergePhotos);
          delete photosByLabel[canonMerge];
        }
      }
    }

    // Detect interconnection method from POI photos — if IPCs found, E8 Fused AC Disconnect is required
    let detectedInterconnectionMethod: string | null = null;
    for (const p of photos) {
      const analysis = p?.analysisResult;
      if (analysis?.interconnection_method && analysis.interconnection_method !== "unknown") {
        detectedInterconnectionMethod = analysis.interconnection_method;
        break; // Use the first definitive detection
      }
    }
    const ipcsDetected = detectedInterconnectionMethod === "ipc";

    // Build dual-use coverage: map LR label → photos from OTHER categories that also satisfy it
    // e.g., "Consumption Metering (CTs)" → [{photo, from_label: "Point of Interconnection", reason: "..."}]
    const dualUseCoverage: Record<string, { photo: any; from_label: string; lr_code: string; reason: string }[]> = {};
    for (const p of photos) {
      const analysis = p?.analysisResult;
      if (Array.isArray(analysis?.also_satisfies)) {
        for (const alt of analysis.also_satisfies) {
          const altLabel = alt?.lr_label || "";
          if (!altLabel) continue;
          // Find the expected category that matches this LR label
          const matchingCat = expectedCategories.find((c: any) => {
            const cName = (c?.name ?? "").toLowerCase();
            const altLower = altLabel.toLowerCase();
            return cName.includes(altLower) || altLower.includes(cName) ||
              (alt?.lr_code && cName.includes(alt.lr_code.toLowerCase()));
          });
          const targetLabel = matchingCat?.name || altLabel;
          const fromLabel = p?.expectedLabel || p?.category || "Unknown";
          if (!dualUseCoverage[targetLabel]) dualUseCoverage[targetLabel] = [];
          dualUseCoverage[targetLabel].push({ photo: p, from_label: fromLabel, lr_code: alt?.lr_code || "", reason: alt?.reason || "" });
        }
      }
    }

    // Build rows: one per expected label + any extra labels found in photos not in expected
    const rows: any[] = [];
    const handledLabels = new Set<string>();

    // First: expected categories, sorted by sort_order
    // Filter out battery/storage sections when no battery is present
    const sorted = [...expectedCategories].sort((a, b) => (a?.sort_order ?? 999) - (b?.sort_order ?? 999));
    for (const cat of sorted) {
      const name = cat?.name ?? "";
      const nameLower = name.toLowerCase();

      // Hide battery-related sections when no battery is in the project
      if (!hasBatteryEquipment) {
        const isBatterySection = nameLower.includes("battery") ||
          nameLower.includes("gateway") ||
          nameLower.includes("transfer switch") ||
          nameLower.includes("system controller") ||
          (cat?.is_required_battery && !cat?.is_required) ||
          (cat?.is_required_solar_and_battery && !cat?.is_required);
        if (isBatterySection) {
          handledLabels.add(toCanonical(name)); // Mark as handled so it doesn't appear as "extra"
          continue; // Skip this category entirely
        }
      }

      // Hide MCI (PS3) sections when inverter is NOT Tesla (per SCH data)
      if (!isTeslaInverter) {
        const isMciSection = nameLower.includes("mci") ||
          (nameLower.includes("module") && nameLower.includes("circuit") && nameLower.includes("interrupter")) ||
          (nameLower.includes("string map") && nameLower.includes("mci"));
        if (isMciSection) {
          handledLabels.add(toCanonical(name)); // Mark as handled so it doesn't appear as "extra"
          continue; // Skip this category entirely
        }
      }

      // Hide PS2 (Q.Home / IQ Combiner label serial) when inverter is NOT Enphase
      // The IQ Combiner is an Enphase-only component; SolarEdge/Tesla don't have one
      if (schLinked && !isEnphaseInverter) {
        const isIqCombinerSerial = (nameLower.includes("combiner") || nameLower.includes("qhome") || nameLower.includes("q.home") || nameLower.includes("iq")) && (nameLower.includes("label") || nameLower.includes("serial"));
        if (isIqCombinerSerial) {
          handledLabels.add(toCanonical(name));
          continue;
        }
      }

      // Hide Sticker Sheet / String Diagram (PS8) when inverter is NOT SolarEdge or Enphase
      if (schLinked && !isSolaredgeInverter && !isEnphaseInverter) {
        const isStickerSheet = nameLower.includes("sticker sheet") || nameLower.includes("string diagram");
        if (isStickerSheet) {
          handledLabels.add(toCanonical(name));
          continue;
        }
      }

      // Hide E9 Combiner Sub Panels for single-inverter systems — combiner sub panels
      // are only applicable for large systems with multiple inverters or combiners
      if (schLinked) {
        const isCombinerSubPanel = nameLower.includes("combiner sub") || nameLower.includes("sub panel");
        if (isCombinerSubPanel) {
          const invQty = sold?.inverter?.quantity ?? 0;
          // Hide if single inverter (qty <= 1). For Enphase microinverter systems,
          // the IQ Combiner is handled by PS2, not E9.
          if (invQty <= 1) {
            handledLabels.add(toCanonical(name));
            continue;
          }
        }
      }

      // Hide brand-specific commissioning headers that don't match the inverter type
      if (schLinked) {
        const isCommTesla = nameLower.includes("commissioning") && nameLower.includes("tesla");
        const isCommEnphase = nameLower.includes("commissioning") && nameLower.includes("enphase");
        const isCommSolaredge = nameLower.includes("commissioning") && nameLower.includes("solaredge");
        if ((isCommTesla && !isTeslaInverter) || (isCommEnphase && !isEnphaseInverter) || (isCommSolaredge && !isSolaredgeInverter)) {
          handledLabels.add(toCanonical(name));
          continue;
        }
      }

      // Hide Existing Site Damage — only relevant when pre-existing damage exists, never required
      if (nameLower.includes("site damage") || nameLower.includes("existing damage") || nameLower.includes("pre-existing")) {
        const catPhotos = photosByLabel[toCanonical(name)] ?? [];
        if (catPhotos.length === 0) {
          handledLabels.add(toCanonical(name));
          continue;
        }
      }

      // Hide Invoice / BOM — informational only, never required
      if (nameLower.includes("invoice") || nameLower.includes("bill of material")) {
        const catPhotos = photosByLabel[toCanonical(name)] ?? [];
        if (catPhotos.length === 0) {
          handledLabels.add(toCanonical(name));
          continue;
        }
      }

      // Hide "MPU or Trench or Tree Removal" — this is an M2 adder, not M1.
      // If SCH doesn't flag it as needed, suppress it entirely.
      if (nameLower.includes("mpu") || nameLower.includes("trench") || nameLower.includes("tree removal")) {
        handledLabels.add(toCanonical(name));
        continue;
      }

      // Hide "test3" or similar test/placeholder headers
      if (/^test\d*$/i.test(name.trim())) {
        handledLabels.add(toCanonical(name));
        continue;
      }

      const canonName = toCanonical(name);
      handledLabels.add(canonName);
      const ownPhotos = photosByLabel[canonName] ?? [];
      const dualUse = dualUseCoverage[canonName] ?? dualUseCoverage[name] ?? [];
      // Inject dual-use photos so the SAME photo also "lives" in this category to
      // satisfy this requirement too. A photo from another category that the AI
      // marked as also_satisfies this one is cloned in here (and flagged as borrowed)
      // so it shows up and counts here as well — the same photo can live in as many
      // categories as needed to satisfy multiple requirements.
      const borrowedPhotos = dualUse
        .filter((du: any) => du?.photo && !ownPhotos.some((cp: any) => cp?.id === du.photo?.id))
        .map((du: any) => ({
          ...du.photo,
          isAcceptable: true, // also_satisfies implies the photo meets this requirement
          _borrowed: true,
          _borrowedFrom: du.from_label,
          _borrowReason: du.reason,
        }));
      const catPhotos = [...ownPhotos, ...borrowedPhotos];
      const analyzed = catPhotos.filter((p: any) => p?.confidenceScore != null);
      const avgConf = analyzed.length ? analyzed.reduce((s: number, p: any) => s + (p.confidenceScore ?? 0), 0) / analyzed.length : null;
      const acceptable = catPhotos.filter((p: any) => p?.isAcceptable === true).length;
      const failed = catPhotos.filter((p: any) => p?.isAcceptable === false).length;
      const pending = catPhotos.filter((p: any) => p?.isAcceptable == null).length;
      // If IPCs detected, promote Fused AC Disconnect from optional to required
      const isFusedDisconnect = /fused.*ac.*disconnect/i.test(name) || /E8/i.test(name);
      const promotedByIPC = isFusedDisconnect && ipcsDetected && !cat?.is_required;

      // Core M1 categories that are ALWAYS required for standard solar installs
      // even if the LR portal doesn't flag them as required
      const isAlwaysRequiredM1 = (() => {
        // Commissioning is ALWAYS required — the funding company mandates it.
        // Non-matching brand headers are already hidden above, so any commissioning
        // row that reaches this point is the correct one for this inverter type.
        if (nameLower.includes("commissioning")) return true;
        // Production Meter / CTs (E6)
        if (nameLower.includes("production meter") || nameLower.includes("production ct")) return true;
        // Consumption CTs (E7)
        if (nameLower.includes("consumption")) return true;
        // Under array wire management (R4)
        if (nameLower.includes("under array") || nameLower.includes("wire management")) return true;
        // Rail with optimizers/microinverters + EGC (R2)
        if (nameLower.includes("rail with") || (nameLower.includes("rail") && nameLower.includes("egc"))) return true;
        // Module label / placard
        if (nameLower.includes("module label") || nameLower.includes("module placard")) return true;
        // Close-up of attachments / flashing / sealant (R1)
        if (nameLower.includes("flashing") || nameLower.includes("attachment") || nameLower.includes("sealant")) return true;
        // Tilt (R5)
        if (nameLower.includes("tilt")) return true;
        // Complete array (R3)
        if (nameLower.includes("complete array")) return true;
        // Junction box (R6)
        if (nameLower.includes("junction box")) return true;
        // Inverter / Combiner box (E1)
        if (nameLower.includes("combiner box") || (nameLower.includes("inverter") && !nameLower.includes("placard") && !nameLower.includes("label"))) return true;
        // IQ Combiner label / serial — only required for Enphase systems
        // (non-Enphase brands are already hidden above, so if it reaches here it's Enphase)
        if ((nameLower.includes("combiner") || nameLower.includes("qhome") || nameLower.includes("q.home") || nameLower.includes("iq")) && (nameLower.includes("label") || nameLower.includes("serial"))) return true;
        // Main breaker rating (E2) — always required
        if (nameLower.includes("main breaker")) return true;
        // BOS Pullback (E5) — always required
        if (nameLower.includes("pull back") && nameLower.includes("balance")) return true;
        // Point of Interconnection (E4)
        if (nameLower.includes("point of interconnection")) return true;
        // Inverter placard (PS1)
        if (nameLower.includes("inverter") && nameLower.includes("placard")) return true;
        // Sticker Sheet / String Diagram (PS8) — required for SolarEdge/Enphase
        // (non-matching brands are already hidden above, so if it reaches here it's the right brand)
        if (nameLower.includes("sticker sheet") || nameLower.includes("string diagram")) return true;
        return false;
      })();

      // E3 Busbar: required for breaker POI (120% rule), NOT required for IPC line-side tap
      const isBusbar = nameLower.includes("busbar") || nameLower.includes("bus bar");
      const busbarDemotedByIPC = isBusbar && ipcsDetected;
      // Invoice / BOM (PS7) is NEVER required — it's informational only
      const isInvoiceBOM = nameLower.includes("invoice") || nameLower.includes("bill of material");
      // Existing site damage (PS6) is NEVER required — only uploaded when pre-existing damage exists
      const isSiteDamage = nameLower.includes("site damage") || nameLower.includes("existing damage") || nameLower.includes("pre-existing");
      // If IPCs detected, busbar goes from required to optional (IPC taps bypass the main panel busbar)
      const effectiveRequired = (busbarDemotedByIPC || isInvoiceBOM || isSiteDamage) ? false : (!!cat?.is_required || promotedByIPC || isAlwaysRequiredM1);
      // Build description, stripping battery-only SolarEdge notes when no battery
      let catDescription = cat?.description ?? "";
      if (!hasBatteryEquipment && nameLower.includes("commissioning")) {
        // Remove SolarEdge battery-only lines (20% backup reserve, Storm Guard)
        catDescription = catDescription
          .split("\n")
          .filter((line: string) => {
            const ll = line.toLowerCase();
            return !(ll.includes("20%") && ll.includes("backup")) &&
                   !(ll.includes("storm") && ll.includes("guard")) &&
                   !(ll.includes("solaredge") && (ll.includes("backup") || ll.includes("reserve")));
          })
          .join("\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim();
      }
      rows.push({
        name,
        description: promotedByIPC
          ? catDescription + "\n\n⚡ PROMOTED TO REQUIRED — IPCs detected at Point of Interconnection. This overcurrent protection device is NEC-required."
          : busbarDemotedByIPC
          ? catDescription + "\n\nℹ️ IPC line-side tap detected — busbar rating is not required since the tap bypasses the main panel busbar (120% rule does not apply)."
          : catDescription,
        is_required: effectiveRequired,
        photoCount: catPhotos.length,
        photos: catPhotos,
        avgConf,
        acceptable,
        failed,
        pending,
        dualUse,
        // When the category has NO photos of its own and is only satisfied by
        // borrowed dual-use photos, keep the indigo "COVERED" status so it's clear
        // the photo is shared from another category.
        status: catPhotos.length === 0
          ? "missing"
          : ownPhotos.length === 0 && borrowedPhotos.length > 0
          ? "dual_use"
          : acceptable > 0 ? "pass" : failed > 0 ? "issues" : pending > 0 ? "analyzing" : "pass",
      });
    }

    // Then: extra labels from photos not in expected categories
    for (const [label, catPhotos] of Object.entries(photosByLabel)) {
      if (handledLabels.has(label)) continue;
      // Skip utility meter labels — already merged into E5 BOS
      const labelLower = label.toLowerCase();
      if ((labelLower.includes("utility meter") || labelLower.includes("meter number")) && labelLower.includes("external")) {
        // Merge any remaining photos into BOS
        if (e5BosLabel) {
          const bosRow = rows.find(r => r.name === e5BosLabel);
          if (bosRow) {
            bosRow.photos.push(...catPhotos);
            bosRow.photoCount += catPhotos.length;
            bosRow.acceptable += catPhotos.filter((p: any) => p?.isAcceptable === true).length;
            bosRow.failed += catPhotos.filter((p: any) => p?.isAcceptable === false).length;
            bosRow.pending += catPhotos.filter((p: any) => p?.isAcceptable == null).length;
            // Recalculate status
            bosRow.status = bosRow.acceptable > 0 ? "pass" : bosRow.failed > 0 ? "issues" : bosRow.pending > 0 ? "analyzing" : "pass";
          }
        }
        continue;
      }
      // Hide battery/storage extra labels when no battery on project
      if (!hasBatteryEquipment) {
        const ll = label.toLowerCase();
        if (ll.includes("battery") || ll.includes("gateway") || ll.includes("transfer switch") || ll.includes("system controller") || ll.includes("storage")) continue;
      }
      // Hide MCI extra labels when inverter is not Tesla
      if (!isTeslaInverter) {
        const ll = label.toLowerCase();
        if (ll.includes("mci") || (ll.includes("module") && ll.includes("circuit") && ll.includes("interrupter"))) continue;
      }
      // Hide PS2 (IQ Combiner label serial) extra labels when inverter is NOT Enphase
      if (schLinked && !isEnphaseInverter) {
        const ll = label.toLowerCase();
        if ((ll.includes("combiner") || ll.includes("qhome") || ll.includes("q.home") || ll.includes("iq")) && (ll.includes("label") || ll.includes("serial"))) continue;
      }
      // Hide Sticker Sheet / String Diagram extra labels when inverter is NOT SolarEdge or Enphase
      if (schLinked && !isSolaredgeInverter && !isEnphaseInverter) {
        const ll = label.toLowerCase();
        if (ll.includes("sticker sheet") || ll.includes("string diagram")) continue;
      }
      // Hide E9 Combiner Sub Panels extras for single-inverter systems
      if (schLinked) {
        const ll = label.toLowerCase();
        if (ll.includes("combiner sub") || ll.includes("sub panel")) {
          const invQty = sold?.inverter?.quantity ?? 0;
          if (invQty <= 1) continue;
        }
      }
      // Hide MPU/Trench/Tree Removal and test headers from extras too
      if (labelLower.includes("mpu") || labelLower.includes("trench") || labelLower.includes("tree removal")) continue;
      if (/^test\d*$/i.test(label.trim())) continue;

      const analyzed = catPhotos.filter((p: any) => p?.confidenceScore != null);
      const avgConf = analyzed.length ? analyzed.reduce((s: number, p: any) => s + (p.confidenceScore ?? 0), 0) / analyzed.length : null;
      const acceptable = catPhotos.filter((p: any) => p?.isAcceptable === true).length;
      const failed = catPhotos.filter((p: any) => p?.isAcceptable === false).length;
      const pending = catPhotos.filter((p: any) => p?.isAcceptable == null).length;

      // If IPCs detected at POI, promote Fused AC Disconnect from bonus to required
      const isFusedDisconnect = /fused.*ac.*disconnect/i.test(label) || /E8/i.test(label);
      const promotedToRequired = isFusedDisconnect && ipcsDetected;

      // Check if this extra label matches a core M1 required category
      const extraLabelLower = label.toLowerCase();
      const isExtraAlwaysRequired = (() => {
        if (extraLabelLower.includes("commissioning")) return true;
        if (extraLabelLower.includes("production meter") || extraLabelLower.includes("production ct")) return true;
        if (extraLabelLower.includes("consumption")) return true;
        if (extraLabelLower.includes("under array") || extraLabelLower.includes("wire management")) return true;
        if (extraLabelLower.includes("rail with") || (extraLabelLower.includes("rail") && extraLabelLower.includes("egc"))) return true;
        if (extraLabelLower.includes("module label") || extraLabelLower.includes("module placard")) return true;
        if (extraLabelLower.includes("flashing") || extraLabelLower.includes("attachment") || extraLabelLower.includes("sealant")) return true;
        if (extraLabelLower.includes("tilt")) return true;
        if (extraLabelLower.includes("complete array")) return true;
        if (extraLabelLower.includes("junction box")) return true;
        if (extraLabelLower.includes("combiner box") || (extraLabelLower.includes("inverter") && !extraLabelLower.includes("placard") && !extraLabelLower.includes("label"))) return true;
        if ((extraLabelLower.includes("combiner") || extraLabelLower.includes("qhome") || extraLabelLower.includes("q.home") || extraLabelLower.includes("iq")) && (extraLabelLower.includes("label") || extraLabelLower.includes("serial"))) return true;
        if (extraLabelLower.includes("main breaker")) return true;
        if (extraLabelLower.includes("point of interconnection")) return true;
        if (extraLabelLower.includes("inverter") && extraLabelLower.includes("placard")) return true;
        // Sticker Sheet / String Diagram (PS8) — required for SolarEdge/Enphase
        if (extraLabelLower.includes("sticker sheet") || extraLabelLower.includes("string diagram")) return true;
        return false;
      })();
      const effectiveExtraRequired = promotedToRequired || isExtraAlwaysRequired;

      rows.push({
        name: label,
        description: promotedToRequired ? "REQUIRED — IPCs detected at Point of Interconnection. Fused AC disconnect (or equivalent overcurrent protection device such as a breaker panel) provides NEC-required overcurrent protection for IPC line-side taps." : "",
        is_required: effectiveExtraRequired,
        photoCount: catPhotos.length,
        photos: catPhotos,
        avgConf,
        acceptable,
        failed,
        pending,
        status: catPhotos.length === 0 ? "missing"
          : effectiveExtraRequired ? (acceptable > 0 ? "pass" : failed > 0 ? "issues" : pending > 0 ? "analyzing" : "pass")
          : catPhotos.some((p: any) => p?.isAcceptable == null) ? "analyzing" : "bonus",
        isExtra: !effectiveExtraRequired,
        promotedFromBonus: promotedToRequired,
      });
    }

    // ── R4 (Under-Array Wire Management): require ONE acceptable photo per array/mounting plane ──
    // The array/mounting-plane count is auto-detected from the planset CAD pulled from SubcontractorHub.
    const arrayCount: number | null = (submission as any)?.arrayCount ?? null;
    {
      const r4Row = rows.find((r: any) => {
        const nl = (r.name || "").toLowerCase();
        return nl.includes("under array") || nl.includes("under-array") || nl.includes("wire management");
      });
      if (r4Row) {
        const required = arrayCount && arrayCount > 1 ? arrayCount : 1;
        r4Row.requiredPhotoCount = required;
        r4Row.arrayCount = arrayCount;
        const acceptableCount = r4Row.acceptable ?? 0;
        if (required > 1) {
          r4Row.arrayShortfall = Math.max(0, required - acceptableCount);
          if (acceptableCount === 0 && r4Row.photoCount === 0) {
            // Fully missing — one per array required
            r4Row.status = "missing";
            r4Row.missingAllArrays = true;
          } else if (acceptableCount < required) {
            // Partial coverage — not every array documented yet
            r4Row.status = "issues";
            r4Row.arrayPartial = true;
          } else {
            r4Row.status = "pass";
          }
        }
      }
    }

    const requiredRows = rows.filter(r => r.is_required);
    const requiredPresent = requiredRows.filter(r => r.photoCount > 0);
    const requiredMissing = requiredRows.filter(r => r.photoCount === 0 && r.status !== "dual_use");
    const requiredDualUse = requiredRows.filter(r => r.status === "dual_use");
    const requiredPassing = requiredRows.filter(r => r.status === "pass");
    const requiredFailing = requiredRows.filter(r => r.status === "issues");

    return { rows, requiredRows, requiredPresent, requiredMissing, requiredDualUse, requiredPassing, requiredFailing, totalPhotos: photos.length, ipcsDetected, detectedInterconnectionMethod, hasBatteryEquipment, isTeslaInverter };
  }, [submission]);

  const toggleLabel = (name: string) => {
    setExpandedLabels(prev => {
      const s = new Set(prev);
      if (s.has(name)) s.delete(name); else s.add(name);
      return s;
    });
  };

  const expandAll = () => {
    if (!report) return;
    setExpandedLabels(new Set(report.rows.map((r: any) => r.name)));
  };

  const collapseAll = () => setExpandedLabels(new Set());

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Submission not found</p>
        <Button variant="outline" onClick={() => router.push("/submissions")} className="mt-4">Back to Submissions</Button>
      </div>
    );
  }

  const photos = submission?.photos ?? [];
  const normLabel = (lbl: string) => lbl.replace(/\s*\+\s*/g, " + ").replace(/\s{2,}/g, " ").trim();
  const expectedLabels = new Set((Array.isArray(submission?.expectedCategories) ? submission.expectedCategories : []).map((c: any) => normLabel(c?.name ?? "")));
  const isExpectedPhoto = (p: any) => expectedLabels.size === 0 || expectedLabels.has(normLabel(p?.expectedLabel || p?.category || ""));
  const requiredPhotos = photos.filter(isExpectedPhoto);
  const passCount = requiredPhotos.filter((p: any) => p?.isAcceptable === true)?.length ?? 0;
  const failCount = requiredPhotos.filter((p: any) => p?.isAcceptable === false)?.length ?? 0;
  const pendingCount = requiredPhotos.filter((p: any) => p?.isAcceptable == null)?.length ?? 0;
  const totalIssues = requiredPhotos.reduce((s: number, p: any) => s + (p?.issuesFound?.length ?? 0), 0);
  const avgConfidence = photos.filter((p: any) => p?.confidenceScore != null)?.length > 0
    ? photos.filter((p: any) => p?.confidenceScore != null).reduce((s: number, p: any) => s + (p?.confidenceScore ?? 0), 0) / photos.filter((p: any) => p?.confidenceScore != null)?.length : 0;
  const passLikelihood = avgConfidence >= 0.8 ? "High" : avgConfidence >= 0.6 ? "Medium" : "Low";
  const passLikelihoodColor = passLikelihood === "High" ? "text-emerald-600" : passLikelihood === "Medium" ? "text-amber-600" : "text-red-600";

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    importing: "bg-indigo-100 text-indigo-700",
    analyzing: "bg-blue-100 text-blue-700",
    review_needed: "bg-amber-100 text-amber-700",
    ready: "bg-green-100 text-green-700",
    submitted: "bg-indigo-100 text-indigo-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };

  const updateStatus = async (status: string) => {
    try {
      await fetch(`/api/submissions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      setSubmission((prev: any) => ({ ...(prev ?? {}), status }));
      toast.success(`Status updated to ${status?.replace?.("_", " ")}`);
    } catch { toast.error("Failed to update status"); }
  };

  const labelStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case "bonus": return <CheckCircle2 className="w-5 h-5 text-sky-500" />;
      case "dual_use": return <Layers className="w-5 h-5 text-indigo-500" />;
      case "issues": return <AlertCircle className="w-5 h-5 text-red-600" />;
      case "missing": return <XCircle className="w-5 h-5 text-red-500" />;
      case "analyzing": return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default: return <Camera className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const labelStatusText = (status: string) => {
    switch (status) {
      case "pass": return "PASS";
      case "bonus": return "BONUS";
      case "dual_use": return "COVERED";
      case "issues": return "ISSUES";
      case "missing": return "MISSING";
      case "analyzing": return "ANALYZING";
      default: return "PENDING";
    }
  };

  const labelStatusBadge = (status: string) => {
    const cls: Record<string, string> = {
      pass: "bg-emerald-100 text-emerald-800 border-emerald-200",
      bonus: "bg-sky-100 text-sky-800 border-sky-200",
      dual_use: "bg-indigo-100 text-indigo-800 border-indigo-200",
      issues: "bg-red-100 text-red-800 border-red-200",
      missing: "bg-red-50 text-red-700 border-red-200",
      analyzing: "bg-blue-100 text-blue-700 border-blue-200",
    };
    return <Badge className={`text-[10px] ${cls[status] ?? "bg-gray-100 text-gray-600"}`}>{labelStatusText(status)}</Badge>;
  };

  return (
    <div className="p-4 lg:p-8 max-w-[1400px] mx-auto space-y-6">
      {/* Lightbox */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setLightboxPhoto(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="absolute -top-10 right-0 text-white hover:bg-white/20" onClick={() => setLightboxPhoto(null)}>
              <XCircle className="w-6 h-6" />
            </Button>
            <img src={photoUrls[lightboxPhoto?.id] || lightboxPhoto?.sourcePhotoUrl || ""} alt={lightboxPhoto?.expectedLabel || ""}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg" />
            <div className="mt-2 p-3 bg-black/60 rounded-lg">
              <p className="text-white text-sm font-semibold">{lightboxPhoto?.expectedLabel || lightboxPhoto?.category}</p>
              {lightboxPhoto?.analysisResult?.reclassified && (
                <div className="flex items-center gap-1.5 mt-1">
                  <RefreshCw className="w-3 h-3 text-violet-300" />
                  <span className="text-violet-300 text-xs">
                    Reclassified → <span className="font-semibold text-violet-200">{lightboxPhoto.analysisResult.correct_lr_code}: {lightboxPhoto.analysisResult.correct_lr_label}</span>
                  </span>
                </div>
              )}
              {lightboxPhoto?.analysisResult?.details && <p className="text-white/70 text-xs mt-1">{lightboxPhoto.analysisResult.details}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/submissions")} className="mt-1">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-display font-bold tracking-tight">{submission?.customerName ?? "Unnamed"}</h1>
            <Badge className={statusColors[submission?.status] ?? "bg-gray-100 text-gray-700"}>
              {(submission?.status ?? "draft")?.replace?.("_", " ")}
            </Badge>
            {submission?.status === "importing" && <span className="text-sm text-indigo-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Importing photos from Google Drive ({submission?.categoriesComplete ?? 0}/{submission?.totalPhotos ?? '?'})…</span>}
            {submission?.status === "analyzing" && <span className="text-sm text-blue-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> AI analysis in progress…</span>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {submission?.milestoneType} milestone • {submission?.installerName}
            {submission?.accountId ? ` • Account: ${submission.accountId}` : ""}
            {submission?.createdAt ? ` • ${new Date(submission.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}` : ""}
          </p>
          {submission?.sourceUrl && (
            <a href={submission.sourceUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
              <ExternalLink className="w-3 h-3" /> View original photopack
            </a>
          )}
        </div>
      </div>

      {/* ===== EXECUTIVE SUMMARY ===== */}
      {(submission?.status === "importing" || submission?.status === "analyzing") ? (
        /* Progress view while photos are still being imported/analyzed */
        <Card className="border-2 border-primary/20 shadow-md overflow-hidden">
          <CardContent className="p-0">
            {/* Progress bar */}
            <div className="h-1.5 bg-muted w-full">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-primary transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.max(5, ((submission?.categoriesComplete ?? 0) / Math.max(1, submission?.totalPhotos ?? 1)) * 100))}%` }}
              />
            </div>
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">
                    {submission?.status === "importing" ? "Importing Photos" : "Analyzing Photos"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {submission?.status === "importing"
                      ? "Downloading photos from Google Drive and preparing for AI analysis…"
                      : "AI is reviewing each photo and classifying it into the correct category…"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold">{submission?.totalPhotos ?? '—'}</p>
                  <p className="text-[11px] text-muted-foreground">Total Photos</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-indigo-50">
                  <p className="text-2xl font-bold text-indigo-700">{submission?.categoriesComplete ?? 0}</p>
                  <p className="text-[11px] text-indigo-600">
                    {submission?.status === "importing" ? "Downloaded" : "Analyzed"}
                  </p>
                </div>
                <div className="text-center p-3 rounded-lg bg-blue-50">
                  <p className="text-2xl font-bold text-blue-700">
                    {Math.round(((submission?.categoriesComplete ?? 0) / Math.max(1, submission?.totalPhotos ?? 1)) * 100)}%
                  </p>
                  <p className="text-[11px] text-blue-600">Progress</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground text-center mt-4">
                This page updates automatically. The full report will appear once all photos are processed.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Full report after processing is complete */
        <Card className="border-2 border-primary/20 shadow-md">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="w-5 h-5 text-primary" />
              Pre-Submission Report Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className={`text-2xl font-bold ${passLikelihoodColor}`}>{passLikelihood}</p>
                <p className="text-[11px] text-muted-foreground">Pass Likelihood</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{Math.round(avgConfidence * 100)}%</p>
                <p className="text-[11px] text-muted-foreground">Avg Confidence</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{report?.totalPhotos ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">Photos Uploaded</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-50">
                <p className="text-2xl font-bold text-emerald-700">{((report?.requiredPresent?.length ?? 0) + (report?.requiredDualUse?.length ?? 0))}/{report?.requiredRows?.length ?? 0}</p>
                <p className="text-[11px] text-emerald-600">Required Labels Covered</p>
              </div>
              {(report?.requiredDualUse?.length ?? 0) > 0 && (
                <div className="text-center p-3 rounded-lg bg-indigo-50">
                  <p className="text-2xl font-bold text-indigo-700">{report?.requiredDualUse?.length ?? 0}</p>
                  <p className="text-[11px] text-indigo-600">Via Dual-Use Photos</p>
                </div>
              )}
              <div className="text-center p-3 rounded-lg bg-red-50">
                <p className="text-2xl font-bold text-red-700">{report?.requiredMissing?.length ?? 0}</p>
                <p className="text-[11px] text-red-600">Required Labels Missing</p>
              </div>
            </div>

            {/* Quick verdict */}
            {report && report.requiredMissing.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                <p className="text-sm font-semibold text-red-800 flex items-center gap-2">
                  <XCircle className="w-4 h-4" /> DO NOT SUBMIT — {report.requiredMissing.length} required label(s) have zero photos:
                </p>
                <ul className="mt-2 text-sm text-red-700 space-y-1 ml-6 list-disc">
                  {report.requiredMissing.map((r: any) => <li key={r.name}>{r.name}</li>)}
                </ul>
              </div>
            )}
            {report && report.requiredMissing.length === 0 && report.requiredFailing.length === 0 && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <p className="text-sm font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> All required labels are present and passing AI review.
                </p>
              </div>
            )}
            {report && report.requiredMissing.length === 0 && report.requiredFailing.length > 0 && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                <p className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> All required labels present, but {report.requiredFailing.length} label(s) have quality issues. Review flagged photos before submitting.
                </p>
              </div>
            )}
            {/* IPC detection banner */}
            {report?.ipcsDetected && (
              <div className="mt-4 p-3 rounded-lg bg-orange-50 border border-orange-200">
                <p className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                  <Zap className="w-4 h-4" /> IPCs Detected at Point of Interconnection
                </p>
                <p className="text-xs text-orange-700 mt-1">
                  Insulated Piercing Connectors (IPCs) were detected at the POI. Per NEC code, <strong>overcurrent protection (Fused AC Disconnect or equivalent breaker panel)</strong> is <strong>required</strong>. This category has been promoted from optional to required in the report below.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ===== EQUIPMENT COMPARISON ===== */}
      <EquipmentComparisonCard
        submission={submission}
        submissionId={id}
        equipSearch={equipSearch}
        setEquipSearch={setEquipSearch}
        equipSearchResults={equipSearchResults}
        setEquipSearchResults={setEquipSearchResults}
        equipSearching={equipSearching}
        setEquipSearching={setEquipSearching}
        equipLinking={equipLinking}
        setEquipLinking={setEquipLinking}
        setSubmission={setSubmission}
      />

      {/* ===== DETAILED LABEL-BY-LABEL REPORT ===== */}
      {submission?.status !== "importing" && submission?.status !== "analyzing" && <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-bold flex items-center gap-2">
            <FileStack className="w-5 h-5 text-primary" />
            Detailed Label-by-Label Review
          </h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={expandAll}>Expand All</Button>
            <Button variant="outline" size="sm" onClick={collapseAll}>Collapse All</Button>
          </div>
        </div>

        <div className="space-y-2">
          {(report?.rows ?? []).map((row: any) => {
            const expanded = expandedLabels.has(row.name);
            return (
              <Card key={row.name} className={`shadow-sm transition-all ${
                row.status === "missing" ? "border-red-300 bg-red-50/30" :
                row.status === "issues" ? "border-amber-300 bg-amber-50/20" :
                row.status === "pass" ? "border-emerald-200" :
                row.status === "bonus" ? "border-sky-200 bg-sky-50/20" :
                row.status === "dual_use" ? "border-indigo-200 bg-indigo-50/20" :
                "border-border"
              }`}>
                {/* Row header — always visible */}
                <button
                  onClick={() => toggleLabel(row.name)}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left hover:bg-muted/30 transition-colors"
                >
                  {expanded ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  {labelStatusIcon(row.status)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm truncate">{row.name}</span>
                      {row.is_required && <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">REQUIRED</Badge>}
                      {row.isExtra && <Badge variant="outline" className="text-[9px] border-sky-300 text-sky-700">BONUS</Badge>}
                      {labelStatusBadge(row.status)}
                      {row.requiredPhotoCount > 1 && (
                        <Badge variant="outline" className="text-[9px] border-indigo-300 text-indigo-700">
                          {row.acceptable ?? 0}/{row.requiredPhotoCount} arrays
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-muted-foreground">{row.photoCount} photo{row.photoCount !== 1 ? "s" : ""}</span>
                    {row.avgConf != null && (
                      <span className={`text-xs font-mono font-bold ${
                        row.avgConf >= 0.8 ? "text-emerald-700" : row.avgConf >= 0.6 ? "text-amber-700" : "text-red-700"
                      }`}>{Math.round(row.avgConf * 100)}%</span>
                    )}
                  </div>
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Label requirement description */}
                    {row.description && (
                      <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-100">
                        <p className="text-xs font-semibold text-blue-800 flex items-center gap-1 mb-1">
                          <Info className="w-3 h-3" /> Lightreach Requirement
                        </p>
                        <p className="text-xs text-blue-700 whitespace-pre-line">{row.description}</p>
                      </div>
                    )}

                    {/* Dual-use coverage — show when no direct photos but another category covers this one */}
                    {row.photoCount === 0 && row.dualUse?.length > 0 && (
                      <div className="p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                        <p className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5 mb-2">
                          <Layers className="w-4 h-4" /> Covered by photo from another category
                        </p>
                        {row.dualUse.map((du: any, j: number) => (
                          <div key={j} className="flex items-start gap-2 mb-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-[11px] text-indigo-700">
                                Photo from <span className="font-semibold">{du.from_label}</span> also satisfies this category
                              </p>
                              {du.reason && <p className="text-[10px] text-indigo-500 italic">{du.reason}</p>}
                            </div>
                          </div>
                        ))}
                        <p className="text-[10px] text-indigo-500 mt-1.5">💡 This photo can be used in both spots when uploading to the LR portal.</p>
                      </div>
                    )}

                    {/* Per-array requirement banner (R4 under-array wire management) */}
                    {row.requiredPhotoCount > 1 && (
                      <div className={`p-3 rounded-lg border ${row.arrayPartial || row.missingAllArrays ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                        <p className={`text-xs font-semibold flex items-center gap-1.5 ${row.arrayPartial || row.missingAllArrays ? "text-amber-800" : "text-emerald-800"}`}>
                          <Layers className="w-4 h-4" />
                          One photo required per array — {row.requiredPhotoCount} mounting planes detected on the planset
                        </p>
                        {row.missingAllArrays ? (
                          <p className="text-[11px] text-amber-700 mt-1">Missing under the array for all {row.requiredPhotoCount} arrays. Upload one under-array wire management photo for each mounting plane.</p>
                        ) : row.arrayPartial ? (
                          <p className="text-[11px] text-amber-700 mt-1">Only {row.acceptable ?? 0} of {row.requiredPhotoCount} arrays documented. Missing under the array for {row.arrayShortfall} array{row.arrayShortfall !== 1 ? "s" : ""}.</p>
                        ) : (
                          <p className="text-[11px] text-emerald-700 mt-1">All {row.requiredPhotoCount} arrays documented.</p>
                        )}
                      </div>
                    )}

                    {/* Missing state */}
                    {row.photoCount === 0 && (!row.dualUse || row.dualUse.length === 0) && (
                      <div className="p-4 text-center rounded-lg border-2 border-dashed border-red-300 bg-red-50/50">
                        <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-red-700">No photos uploaded for this label</p>
                        {row.is_required && row.requiredPhotoCount > 1 ? (
                          <p className="text-xs text-red-600 mt-1">This is REQUIRED. Missing under the array for all {row.requiredPhotoCount} arrays — submission will be rejected without one photo per mounting plane.</p>
                        ) : row.is_required ? (
                          <p className="text-xs text-red-600 mt-1">This is REQUIRED. Submission will be rejected without it.</p>
                        ) : null}
                      </div>
                    )}

                    {/* Photos grid */}
                    {row.photoCount > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {row.photos.map((photo: any) => {
                          const imgUrl = photoUrls[photo?.id] || photo?.sourcePhotoUrl || "";
                          const analysis = photo?.analysisResult ?? {};
                          return (
                            <div key={photo.id} className={`rounded-lg border p-3 ${
                              photo?.isAcceptable === true ? "border-emerald-200 bg-emerald-50/30" :
                              photo?.isAcceptable === false ? "border-red-200 bg-red-50/30" :
                              "border-border bg-muted/10"
                            }`}>
                              {/* Photo preview + info */}
                              <div className="flex gap-3">
                                <div className="w-28 h-28 rounded-lg overflow-hidden bg-muted shrink-0 relative cursor-pointer group"
                                  onClick={() => setLightboxPhoto(photo)}>
                                  {imgUrl ? (
                                    <img src={imgUrl} alt={photo?.expectedLabel ?? ""} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                      <ImageIcon className="w-8 h-8 opacity-30" />
                                    </div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                    <Eye className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    {photo?.isAcceptable === true && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                                    {photo?.isAcceptable === false && !row.isExtra && <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
                                    {photo?.isAcceptable === false && row.isExtra && <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />}
                                    {photo?.isAcceptable == null && photo?.confidenceScore == null && <Loader2 className="w-4 h-4 text-blue-400 animate-spin shrink-0" />}
                                    <span className="text-xs font-medium truncate">{photo?.originalName || "Photo"}</span>
                                  </div>
                                  {photo?._borrowed && (
                                    <div className="mb-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-100 border border-indigo-200">
                                      <Layers className="w-3 h-3 text-indigo-600 shrink-0" />
                                      <span className="text-[10px] font-medium text-indigo-700">
                                        Shared from {photo._borrowedFrom}
                                      </span>
                                    </div>
                                  )}

                                  {/* Confidence bar */}
                                  {photo?.confidenceScore != null && (
                                    <div className="mb-2">
                                      <div className="flex justify-between mb-0.5">
                                        <span className="text-[10px] text-muted-foreground">Confidence</span>
                                        <span className={`text-[10px] font-mono font-bold ${
                                          photo.confidenceScore >= 0.8 ? "text-emerald-700" : photo.confidenceScore >= 0.6 ? "text-amber-700" : "text-red-700"
                                        }`}>{Math.round(photo.confidenceScore * 100)}%</span>
                                      </div>
                                      <Progress value={Math.round(photo.confidenceScore * 100)} className="h-1.5" />
                                    </div>
                                  )}

                                  {/* AI description */}
                                  {analysis?.details && <p className="text-[11px] text-muted-foreground mb-1 line-clamp-2">{analysis.details}</p>}

                                  {/* Reclassification badge */}
                                  {analysis?.reclassified ? (
                                    <div className="mt-1 p-1.5 rounded bg-violet-50 border border-violet-200">
                                      <div className="flex items-center gap-1.5 text-[10px] text-violet-800 font-semibold">
                                        <RefreshCw className="w-3 h-3 shrink-0" />
                                        Reclassified by AI
                                      </div>
                                      <p className="text-[10px] text-violet-600 mt-0.5">
                                        <span className="line-through opacity-60">{analysis.original_label || photo?.expectedLabel}</span>
                                        {" → "}
                                        <span className="font-semibold">{analysis.correct_lr_code ? `${analysis.correct_lr_code}: ` : ""}{analysis.correct_lr_label || analysis.category_detected}</span>
                                      </p>
                                      {analysis.reclassification_reason && (
                                        <p className="text-[10px] text-violet-500 mt-0.5 italic">{analysis.reclassification_reason}</p>
                                      )}
                                    </div>
                                  ) : analysis?.category_detected && analysis.category_detected !== photo?.expectedLabel && analysis.category_detected !== photo?.category ? (
                                    <p className="text-[10px] text-amber-700 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 shrink-0" />
                                      AI detected this as: <span className="font-semibold">{analysis.category_detected}</span>
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              {/* Issues — shown as red for required/expected labels, soft blue for bonus */}
                              {(photo?.issuesFound?.length ?? 0) > 0 && (
                                row.isExtra ? (
                                  <div className="mt-2 p-2 rounded bg-sky-50 border border-sky-100 space-y-0.5">
                                    <p className="text-[10px] font-semibold text-sky-800 mb-1">AI Notes (bonus photo — not required for LR approval):</p>
                                    {(photo.issuesFound ?? []).map((issue: string, j: number) => (
                                      <p key={j} className="text-[11px] text-sky-700 flex items-start gap-1">
                                        <Camera className="w-3 h-3 shrink-0 mt-0.5" />{issue}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-2 p-2 rounded bg-red-50 border border-red-100 space-y-0.5">
                                    <p className="text-[10px] font-semibold text-red-800 mb-1">Issues Found:</p>
                                    {(photo.issuesFound ?? []).map((issue: string, j: number) => (
                                      <p key={j} className="text-[11px] text-red-700 flex items-start gap-1">
                                        <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />{issue}
                                      </p>
                                    ))}
                                  </div>
                                )
                              )}

                              {/* Recommendations — shown as amber for required, soft gray for bonus */}
                              {(analysis?.recommendations?.length ?? 0) > 0 && (
                                row.isExtra ? (
                                  <div className="mt-2 p-2 rounded bg-gray-50 border border-gray-100 space-y-0.5">
                                    <p className="text-[10px] font-semibold text-gray-600 mb-1">Tips (optional — this is a bonus photo):</p>
                                    {(analysis.recommendations ?? []).map((rec: string, j: number) => (
                                      <p key={j} className="text-[11px] text-gray-500 flex items-start gap-1">
                                        <Shield className="w-3 h-3 shrink-0 mt-0.5" />{rec}
                                      </p>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-2 p-2 rounded bg-amber-50 border border-amber-100 space-y-0.5">
                                    <p className="text-[10px] font-semibold text-amber-800 mb-1">Prevention Tips:</p>
                                    {(analysis.recommendations ?? []).map((rec: string, j: number) => (
                                      <p key={j} className="text-[11px] text-amber-700 flex items-start gap-1">
                                        <Shield className="w-3 h-3 shrink-0 mt-0.5" />{rec}
                                      </p>
                                    ))}
                                  </div>
                                )
                              )}

                              {/* Dual-use indicator — photo also satisfies other categories */}
                              {Array.isArray(analysis?.also_satisfies) && analysis.also_satisfies.length > 0 && (
                                <div className="mt-2 p-2 rounded bg-indigo-50 border border-indigo-200 space-y-1">
                                  <p className="text-[10px] font-semibold text-indigo-800 flex items-center gap-1">
                                    <Layers className="w-3 h-3 shrink-0" /> Also usable for:
                                  </p>
                                  {analysis.also_satisfies.map((alt: any, j: number) => (
                                    <div key={j} className="flex items-start gap-1.5">
                                      <CheckCircle2 className="w-3 h-3 text-indigo-600 shrink-0 mt-0.5" />
                                      <p className="text-[11px] text-indigo-700">
                                        <span className="font-semibold">{alt.lr_code}: {alt.lr_label}</span>
                                        {alt.reason && <span className="text-indigo-500 ml-1">— {alt.reason}</span>}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>}

      {/* Confidence Chart — hidden during import/analysis */}
      {submission?.status !== "importing" && submission?.status !== "analyzing" && (photos?.length ?? 0) > 0 && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Photo Confidence Distribution
            </CardTitle>
          </CardHeader>
          <CardContent><ConfidenceChart photos={photos} /></CardContent>
        </Card>
      )}

      {/* Reviewer Notes */}
      {submission?.reviewerNotes && (
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-1">Reviewer Notes</p>
            <p className="text-sm">{submission.reviewerNotes}</p>
          </CardContent>
        </Card>
      )}

      {/* Admin Actions */}
      {workspaceUser?.role === "admin" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display">Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={async () => {
              try {
                const r = await fetch("/api/photopack/reanalyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ submissionId: id }) });
                const d = await r.json();
                if (r.ok) { toast.success(`Re-analyzing ${d.total} photos…`); setSubmission((prev: any) => ({ ...(prev ?? {}), status: "analyzing" })); }
                else toast.error(d?.error || "Failed");
              } catch { toast.error("Failed to trigger re-analysis"); }
            }} className="gap-1 text-blue-600 border-blue-200">
              <Zap className="w-3 h-3" /> Re-run AI Analysis
            </Button>
            <Button size="sm" variant="outline" onClick={() => updateStatus("ready")} className="gap-1">
              <CheckCircle2 className="w-3 h-3" /> Mark Ready
            </Button>
            <Button size="sm" variant="outline" onClick={() => updateStatus("approved")} className="gap-1 text-emerald-600 border-emerald-200">
              <Zap className="w-3 h-3" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={() => updateStatus("rejected")} className="gap-1 text-red-600 border-red-200">
              <AlertCircle className="w-3 h-3" /> Reject
            </Button>
            {submission?.schProjectId && (
              <Button size="sm" variant="outline" onClick={() => setSiteSurveyOpen(true)} className="gap-1 text-indigo-600 border-indigo-200">
                <Download className="w-3 h-3" /> Import Site Survey Photos
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Site Survey Importer Dialog */}
      {submission?.schProjectId && (
        <SiteSurveyImporter
          open={siteSurveyOpen}
          onClose={() => setSiteSurveyOpen(false)}
          schProjectId={submission.schProjectId}
          submissionId={id}
          onImported={() => {
            setSiteSurveyOpen(false);
            // Refresh submission data
            fetch(`/api/submissions/${id}`)
              .then(r => r.json())
              .then(d => setSubmission(d))
              .catch(() => {});
          }}
        />
      )}
    </div>
  );
}