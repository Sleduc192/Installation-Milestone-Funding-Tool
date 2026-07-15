"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Package, Loader2, ExternalLink, Zap, Sun, Battery,
  ChevronDown, ChevronRight, MapPin, Calendar, Link2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function ProjectSearchClient() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(false);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [equipmentCache, setEquipmentCache] = useState<Record<number, any>>({});
  const [loadingEquip, setLoadingEquip] = useState<number | null>(null);

  const search = useCallback(async (p = 1) => {
    if (!query.trim()) return;
    setSearching(true);
    setPage(p);
    try {
      const r = await fetch(`/api/sch/search?q=${encodeURIComponent(query.trim())}&page=${p}&limit=15`);
      const d = await r.json();
      if (r.ok) {
        setResults(d?.projects ?? []);
        setTotal(d?.total ?? 0);
      } else {
        toast.error(d?.error || "Search failed");
      }
    } catch { toast.error("Search failed"); }
    setSearching(false);
  }, [query]);

  const toggleExpand = async (projectId: number) => {
    if (expandedId === projectId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(projectId);
    if (!equipmentCache[projectId]) {
      setLoadingEquip(projectId);
      try {
        const r = await fetch(`/api/sch/equipment?projectId=${projectId}`);
        const d = await r.json();
        if (r.ok) {
          setEquipmentCache(prev => ({ ...prev, [projectId]: d }));
        } else {
          toast.error(d?.error || "Equipment fetch failed");
        }
      } catch { toast.error("Equipment fetch failed"); }
      setLoadingEquip(null);
    }
  };

  const ingestPhotopack = async (uuid: string) => {
    if (!uuid) { toast.error("No UUID found for this project"); return; }
    const url = `https://app.subcontractorhub.com/projects/detail/${uuid}/installation-attachment`;
    router.push(`/review?url=${encodeURIComponent(url)}`);
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div className="p-4 lg:p-8 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-700 rounded-lg flex items-center justify-center">
            <Search className="w-5 h-5 text-white" />
          </div>
          Project Search
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search SE Finance projects by customer name or project ID. View equipment details and link to photopacks.
        </p>
      </div>

      {/* Search bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search(1)}
                placeholder="Customer name, project ID, or address…"
                className="w-full pl-10 pr-4 py-2.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <Button onClick={() => search(1)} disabled={searching} className="bg-violet-600 hover:bg-violet-700 text-white px-6">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : "Search"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {total} project{total !== 1 ? "s" : ""} found — showing page {page}/{totalPages || 1}
            </p>
            {totalPages > 1 && (
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => search(page - 1)} disabled={page <= 1 || searching}>Prev</Button>
                <Button size="sm" variant="outline" onClick={() => search(page + 1)} disabled={page >= totalPages || searching}>Next</Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            {results.map((p: any) => {
              const isExpanded = expandedId === p.id;
              const equip = equipmentCache[p.id];
              const isLoading = loadingEquip === p.id;

              return (
                <Card key={p.id} className={`shadow-sm transition-all ${isExpanded ? "border-violet-300 ring-1 ring-violet-200" : ""}`}>
                  {/* Row header */}
                  <button
                    onClick={() => toggleExpand(p.id)}
                    className="w-full p-4 flex items-center gap-3 text-left hover:bg-muted/20 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-violet-500 shrink-0" /> : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">#{p.id}</span>
                        <span className="text-sm font-medium">{p.projectName}</span>
                        {p.stage && <Badge variant="outline" className="text-[9px]">{p.stage}</Badge>}
                        {p.financeType && <Badge variant="outline" className="text-[9px] bg-blue-50 border-blue-200 text-blue-700">{p.financeType}</Badge>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {p.systemSize && <span className="flex items-center gap-1"><Sun className="w-3 h-3" />{p.systemSize} kW</span>}
                        {p.panelName && <span>• {p.panelName}</span>}
                        {(p.city || p.state) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{[p.city, p.state].filter(Boolean).join(", ")}</span>}
                        {p.updatedAt && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.updatedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <Package className="w-4 h-4 text-violet-400 shrink-0" />
                  </button>

                  {/* Expanded equipment details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-border/50">
                      {isLoading ? (
                        <div className="py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" /> Loading equipment data…
                        </div>
                      ) : equip ? (
                        <div className="space-y-4 mt-4">
                          {/* Equipment grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                              <p className="text-[10px] font-mono text-violet-500 uppercase">Panel</p>
                              <p className="text-sm font-semibold mt-1">{equip.panel?.manufacturer ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{equip.panel?.name ?? "—"}</p>
                              {equip.panel?.watts && <p className="text-xs text-muted-foreground">{equip.panel.watts}W</p>}
                            </div>
                            <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                              <p className="text-[10px] font-mono text-violet-500 uppercase">Inverter</p>
                              <p className="text-sm font-semibold mt-1">{equip.inverter?.manufacturer ?? "—"}</p>
                              <p className="text-xs text-muted-foreground">{equip.inverter?.name ?? "—"}</p>
                              {equip.inverter?.type && <Badge variant="outline" className="text-[9px] mt-1">{equip.inverter.type}</Badge>}
                            </div>
                            <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                              <p className="text-[10px] font-mono text-violet-500 uppercase">System</p>
                              <p className="text-sm font-semibold mt-1">{equip.systemSizeKw ?? "—"} kW</p>
                              <p className="text-xs text-muted-foreground">{equip.panelCount} panels • {equip.mountingType ?? "—"}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-violet-50 border border-violet-100">
                              <p className="text-[10px] font-mono text-violet-500 uppercase">Storage</p>
                              <p className="text-sm font-semibold mt-1">
                                {equip.batteryCount > 0 ? (
                                  <span className="flex items-center gap-1"><Battery className="w-4 h-4" /> {equip.batteryCount} Battery(s)</span>
                                ) : "No Storage"}
                              </p>
                            </div>
                          </div>

                          {/* Adders */}
                          {equip.adders?.length > 0 && (
                            <div>
                              <p className="text-[10px] font-mono text-muted-foreground uppercase mb-1">Adders</p>
                              <div className="flex flex-wrap gap-2">
                                {equip.adders.map((a: any, i: number) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {a.name} {a.qty > 1 ? `×${a.qty}` : ""}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            {p.uuid && (
                              <Button size="sm" variant="outline" onClick={() => ingestPhotopack(p.uuid)} className="gap-1 text-violet-600 border-violet-300">
                                <Zap className="w-3 h-3" /> Ingest Photopack
                              </Button>
                            )}
                            <Button size="sm" variant="outline" onClick={() => {
                              window.open(`https://app.subcontractorhub.com/expansionjs/projects/review/detail/${p.id}?tab=Project`, "_blank");
                            }} className="gap-1">
                              <ExternalLink className="w-3 h-3" /> Open in SCH
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="py-4 text-sm text-muted-foreground">No equipment data available.</p>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!searching && results.length === 0 && query && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground mt-3">No projects found. Try a different search term.</p>
        </div>
      )}

      {/* Initial state */}
      {!searching && results.length === 0 && !query && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-violet-300 mx-auto" />
          <p className="text-muted-foreground mt-3">Search for SE Finance projects to view equipment details and manage photopacks.</p>
        </div>
      )}
    </div>
  );
}
