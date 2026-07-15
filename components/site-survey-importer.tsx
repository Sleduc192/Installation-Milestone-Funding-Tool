"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle2, Download, FileText, ImageIcon, Upload, X, AlertCircle, Zap } from "lucide-react";
import { toast } from "sonner";

// ─── LR Category mapping for site survey page classification ─────────────────

interface LRCategory {
  lrCode: string;
  lrLabel: string;
  internalCategory: string;
  internalSubcategory: string;
}

const IMPORTABLE_CATEGORIES: LRCategory[] = [
  { lrCode: "E1", lrLabel: "Inverter / Combiner Box", internalCategory: "Electrical_Panel", internalSubcategory: "Inverter_Combiner" },
  { lrCode: "E2", lrLabel: "Main Breaker", internalCategory: "Electrical_Panel", internalSubcategory: "Main_Breaker" },
  { lrCode: "E3", lrLabel: "Main Panel Busbar rating", internalCategory: "Electrical_Panel", internalSubcategory: "Main_Panel_Breaker" },
  { lrCode: "E4", lrLabel: "Point of Interconnection", internalCategory: "Electrical_Panel", internalSubcategory: "POI_Backfed_Breaker" },
  { lrCode: "E5", lrLabel: "Pull back of Balance of System", internalCategory: "Electrical_Panel", internalSubcategory: "BOS_Pullback" },
  { lrCode: "E7", lrLabel: "Consumption Metering (CTs)", internalCategory: "Electrical_Panel", internalSubcategory: "Consumption_CTs" },
  { lrCode: "E8", lrLabel: "Fused AC Disconnects", internalCategory: "Electrical_Panel", internalSubcategory: "Fused_AC_Disconnect" },
  { lrCode: "R3", lrLabel: "Complete Array(s)", internalCategory: "Roof_Mount", internalSubcategory: "Complete_Array" },
  { lrCode: "BONUS", lrLabel: "Front of Home / Other", internalCategory: "General", internalSubcategory: "Standard_Photo" },
];

// ─── Text-based auto-classification of site survey pages ─────────────────────

function classifyPageByText(text: string): LRCategory | null {
  const t = text.toLowerCase();
  // Main breaker
  if (t.includes("main breaker") || t.includes("msp - main") || t.includes("main disconnect")) {
    return IMPORTABLE_CATEGORIES.find(c => c.lrCode === "E2") ?? null;
  }
  // Busbar rating / panel label
  if (t.includes("busbar") || t.includes("bus bar") || t.includes("mains rating") || t.includes("panel label") || t.includes("panel rating") || t.includes("msp label") || t.includes("deadfront off") || t.includes("inner label")) {
    return IMPORTABLE_CATEGORIES.find(c => c.lrCode === "E3") ?? null;
  }
  // Address / front of home
  if (t.includes("address photo") || t.includes("front of home") || t.includes("front of house") || t.includes("house photo") || t.includes("home exterior")) {
    return IMPORTABLE_CATEGORIES.find(c => c.lrCode === "BONUS") ?? null;
  }
  // MSP deadfront (closed panel) — E2 area
  if (t.includes("deadfront on") || t.includes("msp closed") || t.includes("panel closed")) {
    return IMPORTABLE_CATEGORIES.find(c => c.lrCode === "E2") ?? null;
  }
  // Inverter / combiner
  if (t.includes("inverter") || t.includes("combiner")) {
    return IMPORTABLE_CATEGORIES.find(c => c.lrCode === "E1") ?? null;
  }
  // Meter / CTs
  if (t.includes("meter") || t.includes("consumption") || t.includes(" ct ") || t.includes("current transformer")) {
    return IMPORTABLE_CATEGORIES.find(c => c.lrCode === "E7") ?? null;
  }
  // Roof / array
  if (t.includes("roof") || t.includes("array") || t.includes("aerial")) {
    return IMPORTABLE_CATEGORIES.find(c => c.lrCode === "R3") ?? null;
  }
  // Disconnect
  if (t.includes("disconnect") || t.includes("ac disc")) {
    return IMPORTABLE_CATEGORIES.find(c => c.lrCode === "E8") ?? null;
  }
  return null;
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface PageInfo {
  pageNumber: number;
  thumbnailDataUrl: string | null;
  textContent: string;
  autoCategory: LRCategory | null;
  selectedCategory: string; // lrCode or "" for skip
  selected: boolean;
  importing: boolean;
  imported: boolean;
  error: string | null;
}

interface SiteSurveyImporterProps {
  open: boolean;
  onClose: () => void;
  schProjectId: number;
  submissionId: string;
  onImported: () => void; // callback to refresh submission data
}

export function SiteSurveyImporter({ open, onClose, schProjectId, submissionId, onImported }: SiteSurveyImporterProps) {
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [rendering, setRendering] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pdfjsRef = useRef<any>(null);

  // Load pdfjs-dist dynamically
  const loadPdfJs = useCallback(async () => {
    if (pdfjsRef.current) return pdfjsRef.current;
    const pdfjs = await import("pdfjs-dist");
    // Use unpkg CDN worker to avoid webpack issues
    const ver = pdfjs.version ?? "6.0.227";
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${ver}/build/pdf.worker.min.mjs`;
    pdfjsRef.current = pdfjs;
    return pdfjs;
  }, []);

  // Step 1: Fetch PDF from SCH via our API
  const fetchPdf = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/sch/site-survey?schProjectId=${schProjectId}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Failed to fetch site survey");
      setPdfUrl(data.pdfUrl);
      return data;
    } catch (e: any) {
      setError(e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [schProjectId]);

  // Step 2: Render thumbnails and extract text from each page
  const renderPages = useCallback(async (url: string) => {
    setRendering(true);
    try {
      const pdfjs = await loadPdfJs();
      const loadingTask = pdfjs.getDocument({ url, disableAutoFetch: true, disableStream: true });
      const pdf = await loadingTask.promise;
      const numPages = pdf.numPages;
      const pageInfos: PageInfo[] = [];

      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await pdf.getPage(i);

          // Render thumbnail
          const viewport = page.getViewport({ scale: 0.4 });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            await page.render({ canvasContext: ctx, viewport }).promise;
          }
          const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.7);

          // Extract text
          const textContent = await page.getTextContent();
          const text = textContent.items.map((item: any) => item.str).join(" ");

          // Auto-classify
          const autoCategory = classifyPageByText(text);

          pageInfos.push({
            pageNumber: i,
            thumbnailDataUrl,
            textContent: text.slice(0, 200),
            autoCategory,
            selectedCategory: autoCategory?.lrCode ?? "",
            selected: !!autoCategory,
            importing: false,
            imported: false,
            error: null,
          });
        } catch (pageErr) {
          pageInfos.push({
            pageNumber: i,
            thumbnailDataUrl: null,
            textContent: "",
            autoCategory: null,
            selectedCategory: "",
            selected: false,
            importing: false,
            imported: false,
            error: "Failed to render",
          });
        }
      }

      setPages(pageInfos);
    } catch (e: any) {
      setError(`Failed to render PDF: ${e.message}`);
    } finally {
      setRendering(false);
    }
  }, [loadPdfJs]);

  // Trigger fetch + render when dialog opens
  useEffect(() => {
    if (open && !pdfUrl && !loading) {
      (async () => {
        const data = await fetchPdf();
        if (data?.pdfUrl) {
          await renderPages(data.pdfUrl);
        }
      })();
    }
  }, [open, pdfUrl, loading, fetchPdf, renderPages]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setPdfUrl(null);
      setPages([]);
      setError(null);
    }
  }, [open]);

  // Toggle page selection
  const togglePage = (pageNum: number) => {
    setPages(prev => prev.map(p =>
      p.pageNumber === pageNum ? { ...p, selected: !p.selected } : p
    ));
  };

  // Update category for a page
  const setCategoryForPage = (pageNum: number, lrCode: string) => {
    const realCode = lrCode === "__skip__" ? "" : lrCode;
    setPages(prev => prev.map(p =>
      p.pageNumber === pageNum ? { ...p, selectedCategory: realCode, selected: !!realCode } : p
    ));
  };

  // Render a single page at full resolution and return as blob
  const renderPageFullRes = async (pageNumber: number): Promise<Blob> => {
    const pdfjs = await loadPdfJs();
    const loadingTask = pdfjs.getDocument({ url: pdfUrl!, disableAutoFetch: true, disableStream: true });
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 2.0 }); // High-res for analysis
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("Failed to create image blob"));
      }, "image/jpeg", 0.92);
    });
  };

  // Import selected pages
  const handleImport = async () => {
    const selectedPages = pages.filter(p => p.selected && p.selectedCategory);
    if (selectedPages.length === 0) {
      toast.error("Select at least one page to import");
      return;
    }

    setImporting(true);
    const photoRecords: any[] = [];

    try {
      for (const page of selectedPages) {
        // Mark as importing
        setPages(prev => prev.map(p =>
          p.pageNumber === page.pageNumber ? { ...p, importing: true } : p
        ));

        try {
          // 1. Render page to high-res image
          const blob = await renderPageFullRes(page.pageNumber);

          // 2. Get presigned upload URL
          const presignRes = await fetch("/api/upload/presigned", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fileName: `site_survey_p${page.pageNumber}.jpg`,
              contentType: "image/jpeg",
              isPublic: true,
            }),
          });
          const { uploadUrl, cloud_storage_path } = await presignRes.json();

          // 3. Upload to S3
          const uploadRes = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": "image/jpeg",
              "Content-Disposition": "attachment",
            },
            body: blob,
          });
          if (!uploadRes.ok) throw new Error(`Upload failed: ${uploadRes.status}`);

          // 4. Look up category info
          const cat = IMPORTABLE_CATEGORIES.find(c => c.lrCode === page.selectedCategory);

          photoRecords.push({
            cloudStoragePath: cloud_storage_path,
            category: cat?.internalCategory ?? "General",
            subcategory: cat?.internalSubcategory ?? "Standard_Photo",
            expectedLabel: cat?.lrLabel ?? "Site Survey Photo",
            pageNumber: page.pageNumber,
          });

          setPages(prev => prev.map(p =>
            p.pageNumber === page.pageNumber ? { ...p, importing: false, imported: true } : p
          ));
        } catch (e: any) {
          setPages(prev => prev.map(p =>
            p.pageNumber === page.pageNumber ? { ...p, importing: false, error: e.message } : p
          ));
        }
      }

      // 5. Register all photos in the submission
      if (photoRecords.length > 0) {
        const regRes = await fetch("/api/sch/site-survey", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ submissionId, photos: photoRecords }),
        });
        const regData = await regRes.json();

        if (regRes.ok) {
          // 6. Trigger AI analysis for each imported photo
          const importedPhotos = regData.photos ?? [];
          for (let i = 0; i < importedPhotos.length; i++) {
            const photo = importedPhotos[i];
            const rec = photoRecords[i];
            try {
              // Get public URL for analysis
              const urlRes = await fetch(`/api/file-url?path=${encodeURIComponent(rec.cloudStoragePath)}&isPublic=true`);
              const urlData = await urlRes.json();
              const imageUrl = urlData.url;

              await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  submissionId,
                  photoId: photo.id,
                  imageUrl,
                  category: rec.category,
                  subcategory: rec.subcategory,
                  expectedLabel: rec.expectedLabel,
                }),
              });
            } catch (analyzeErr) {
              console.error(`[site-survey] Analysis failed for page ${rec.pageNumber}:`, analyzeErr);
            }
          }

          toast.success(`Imported ${regData.imported} photo(s) from site survey`);
          onImported();
        } else {
          toast.error(regData.error ?? "Failed to register imported photos");
        }
      }
    } catch (e: any) {
      toast.error(`Import failed: ${e.message}`);
    } finally {
      setImporting(false);
    }
  };

  const selectedCount = pages.filter(p => p.selected && p.selectedCategory).length;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Import from Site Survey
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Select pages from the SCH site survey PDF to import as photos. Pages are auto-classified based on their labels.
          </p>
        </DialogHeader>

        {/* Loading state */}
        {(loading || rendering) && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {loading ? "Downloading site survey from SubcontractorHub..." : "Rendering PDF pages..."}
            </p>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <AlertCircle className="w-8 h-8 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
            <Button variant="outline" size="sm" onClick={() => { setError(null); setPdfUrl(null); }}>
              Retry
            </Button>
          </div>
        )}

        {/* Page grid */}
        {!loading && !rendering && !error && pages.length > 0 && (
          <>
            <ScrollArea className="flex-1 -mx-6 px-6" style={{ maxHeight: "calc(85vh - 220px)" }}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {pages.map((page) => (
                  <div
                    key={page.pageNumber}
                    className={`relative border rounded-lg overflow-hidden cursor-pointer transition-all ${
                      page.selected
                        ? "border-primary ring-2 ring-primary/30 shadow-md"
                        : "border-border hover:border-primary/50"
                    } ${page.imported ? "opacity-60" : ""}`}
                    onClick={() => !page.imported && !importing && togglePage(page.pageNumber)}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-[3/4] bg-muted relative">
                      {page.thumbnailDataUrl ? (
                        <img
                          src={page.thumbnailDataUrl}
                          alt={`Page ${page.pageNumber}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
                        </div>
                      )}

                      {/* Page number badge */}
                      <div className="absolute top-1 left-1">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Page {page.pageNumber}
                        </Badge>
                      </div>

                      {/* Selection checkmark */}
                      {page.selected && !page.imported && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                        </div>
                      )}

                      {/* Imported indicator */}
                      {page.imported && (
                        <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                        </div>
                      )}

                      {/* Importing spinner */}
                      {page.importing && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Loader2 className="w-6 h-6 text-white animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Category selector */}
                    <div className="p-1.5" onClick={(e) => e.stopPropagation()}>
                      {page.autoCategory && !page.imported ? (
                        <Select
                          value={page.selectedCategory || "__skip__"}
                          onValueChange={(v) => setCategoryForPage(page.pageNumber, v)}
                          disabled={importing}
                        >
                          <SelectTrigger className="h-7 text-[11px]">
                            <SelectValue placeholder="Category..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__" className="text-[11px]">Skip</SelectItem>
                            {IMPORTABLE_CATEGORIES.map(cat => (
                              <SelectItem key={cat.lrCode} value={cat.lrCode} className="text-[11px]">
                                {cat.lrCode} - {cat.lrLabel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : page.imported ? (
                        <p className="text-[10px] text-emerald-600 font-medium text-center">Imported</p>
                      ) : (
                        <Select
                          value={page.selectedCategory || "__skip__"}
                          onValueChange={(v) => setCategoryForPage(page.pageNumber, v)}
                          disabled={importing}
                        >
                          <SelectTrigger className="h-7 text-[11px]">
                            <SelectValue placeholder="Assign category..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__skip__" className="text-[11px]">Skip</SelectItem>
                            {IMPORTABLE_CATEGORIES.map(cat => (
                              <SelectItem key={cat.lrCode} value={cat.lrCode} className="text-[11px]">
                                {cat.lrCode} - {cat.lrLabel}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedCount} page{selectedCount !== 1 ? "s" : ""} selected of {pages.length} total
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose} disabled={importing}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleImport}
                  disabled={selectedCount === 0 || importing}
                  className="gap-1.5"
                >
                  {importing ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing...</>
                  ) : (
                    <><Upload className="w-3.5 h-3.5" /> Import {selectedCount} Photo{selectedCount !== 1 ? "s" : ""} & Analyze</>
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Empty state */}
        {!loading && !rendering && !error && pages.length === 0 && pdfUrl && (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <FileText className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No pages found in the site survey PDF.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
