"use client";

import { useState, useEffect } from "react";
import {
  Camera, Upload, Search, Filter, CheckCircle2, Image as ImageIcon, Plus, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function ReferencePhotosClient() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");
  const [filterMilestone, setFilterMilestone] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [newPhoto, setNewPhoto] = useState({
    customerName: "",
    milestoneType: "Install",
    displayCategory: "Roof_Mount",
    subcategory: "Array_Layout",
    file: null as File | null,
  });
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchPhotos = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterCat) params.set("category", filterCat);
    if (filterMilestone) params.set("milestone", filterMilestone);
    fetch(`/api/approved-photos?${params.toString()}`)
      .then((r) => r?.json?.())
      .then((d: any) => setPhotos(d ?? []))
      .catch(() => toast.error("Failed to load photos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPhotos(); }, [filterCat, filterMilestone]);

  const uploadReference = async () => {
    if (!newPhoto.file) {
      toast.error("Select a file");
      return;
    }
    setUploading(true);
    try {
      // Get presigned URL
      const presignedRes = await fetch("/api/upload/presigned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileName: newPhoto.file.name,
          contentType: newPhoto.file.type,
          isPublic: true,
        }),
      });
      const { uploadUrl, cloud_storage_path } = (await presignedRes.json()) ?? {};

      // Upload to S3
      const uploadHeaders: Record<string, string> = {
        "Content-Type": newPhoto?.file?.type ?? "image/jpeg",
      };
      if (uploadUrl?.includes?.('content-disposition')) {
        uploadHeaders["Content-Disposition"] = "attachment";
      }
      await fetch(uploadUrl, {
        method: "PUT",
        headers: uploadHeaders,
        body: newPhoto.file,
      });

      // Register in database
      await fetch("/api/admin/reference-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: newPhoto.customerName || "Admin Upload",
          milestoneType: newPhoto.milestoneType,
          displayCategory: newPhoto.displayCategory,
          subcategory: newPhoto.subcategory,
          originalName: newPhoto.file.name,
          cloudStoragePath: cloud_storage_path,
          isPublic: true,
        }),
      });

      toast.success("Reference photo added!");
      setDialogOpen(false);
      setNewPhoto({ customerName: "", milestoneType: "Install", displayCategory: "Roof_Mount", subcategory: "Array_Layout", file: null });
      fetchPhotos();
    } catch (err: any) {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const categories = ["Roof_Mount", "Electrical_Panel", "Equipment_Labels", "System_Commissioning"];
  const subcategories: Record<string, string[]> = {
    Roof_Mount: ["Array_Layout", "Tilt_Angle", "Rail_Installation", "Attachments_Flashing", "Under_Array", "Junction_Box", "Wire_Management"],
    Electrical_Panel: ["Main_Panel_Breaker", "AC_Disconnect", "Combiner_Box", "Point_of_Interconnection", "CTs_Monitoring", "Pullback"],
    Equipment_Labels: ["Module_Labels", "Combiner_Labels", "Microinverter_Labels"],
    System_Commissioning: ["Commissioning_Screenshots", "Monitoring_Access"],
  };

  const filtered = (photos ?? []).filter((p: any) => {
    if (!search) return true;
    return p?.customerName?.toLowerCase?.()?.includes?.(search?.toLowerCase?.()) ||
           p?.originalName?.toLowerCase?.()?.includes?.(search?.toLowerCase?.());
  });

  // Group by category
  const grouped: Record<string, any[]> = {};
  for (const p of filtered) {
    const key = `${p?.displayCategory ?? "Unknown"} / ${p?.subcategory ?? "Unknown"}`;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(p);
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Reference Photo Library</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {photos?.length ?? 0} approved reference photos from past submissions
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
              <Plus className="w-4 h-4" /> Add Reference Photo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Add Reference Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={newPhoto.customerName}
                  onChange={(e: any) => setNewPhoto({ ...newPhoto, customerName: e?.target?.value ?? "" })}
                  placeholder="Optional label"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Milestone</Label>
                  <select
                    value={newPhoto.milestoneType}
                    onChange={(e: any) => setNewPhoto({ ...newPhoto, milestoneType: e?.target?.value ?? "Install" })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="Install">Install</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <select
                    value={newPhoto.displayCategory}
                    onChange={(e: any) => setNewPhoto({ ...newPhoto, displayCategory: e?.target?.value ?? "Roof_Mount", subcategory: subcategories[e?.target?.value]?.[0] ?? "Array_Layout" })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {categories.map((c: string) => (
                      <option key={c} value={c}>{(c ?? "")?.replace?.(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Subcategory</Label>
                <select
                  value={newPhoto.subcategory}
                  onChange={(e: any) => setNewPhoto({ ...newPhoto, subcategory: e?.target?.value ?? "Array_Layout" })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  {(subcategories[newPhoto.displayCategory] ?? []).map((s: string) => (
                    <option key={s} value={s}>{(s ?? "")?.replace?.(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Photo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e: any) => setNewPhoto({ ...newPhoto, file: e?.target?.files?.[0] ?? null })}
                />
              </div>
              <Button
                onClick={uploadReference}
                disabled={uploading || !newPhoto.file}
                className="w-full gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              >
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploading ? "Uploading..." : "Upload Reference"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e: any) => setSearch(e?.target?.value ?? "")}
            placeholder="Search photos..."
            className="pl-10"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e: any) => setFilterCat(e?.target?.value ?? "")}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">All Categories</option>
          {categories.map((c: string) => <option key={c} value={c}>{(c ?? "")?.replace?.(/_/g, " ")}</option>)}
        </select>
        <select
          value={filterMilestone}
          onChange={(e: any) => setFilterMilestone(e?.target?.value ?? "")}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="">All Milestones</option>
          <option value="Install">Install</option>
        </select>
      </div>

      {/* Photos grouped by category */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i: number) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : Object.keys(grouped ?? {}).length === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center">
            <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No reference photos found</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(grouped ?? {}).map(([key, catPhotos]: [string, any[]]) => (
          <Card key={key} className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-display flex items-center gap-2">
                <Camera className="w-4 h-4 text-muted-foreground" />
                {(key ?? "")?.replace?.(/_/g, " ")}
                <Badge variant="outline" className="ml-2 text-[10px]">{catPhotos?.length ?? 0}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {(catPhotos ?? []).slice(0, 12).map((photo: any) => (
                  <div key={photo?.id} className="group">
                    <div className="aspect-square rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      <Camera className="w-8 h-8 text-muted-foreground/20" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 truncate">
                      {photo?.customerName ?? "Unknown"}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 truncate">
                      {photo?.originalName ?? ""}
                    </p>
                  </div>
                ))}
                {(catPhotos?.length ?? 0) > 12 && (
                  <div className="aspect-square rounded-lg bg-muted/50 flex items-center justify-center">
                    <span className="text-sm text-muted-foreground">+{(catPhotos?.length ?? 0) - 12} more</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
