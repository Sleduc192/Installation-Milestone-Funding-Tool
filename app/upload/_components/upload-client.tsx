"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Upload, FileImage, Zap, CheckCircle2, AlertCircle, Loader2,
  ChevronRight, Camera, X, Eye, Shield
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";

interface PhotoCategory {
  id: number;
  categoryName: string;
  subcategoryName: string;
  milestoneType: string;
  isRequired: boolean;
  minPhotos: number;
  requirements: string | null;
}

interface UploadedPhoto {
  file: File;
  preview: string;
  category: string;
  subcategory: string;
  cloudStoragePath: string | null;
  analyzing: boolean;
  analysis: any | null;
  uploaded: boolean;
}

export default function UploadClient() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [categories, setCategories] = useState<PhotoCategory[]>([]);
  const [form, setForm] = useState({
    customerName: "",
    accountId: "",
    installerName: "",
    milestoneType: "Install",
  });
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);

  useEffect(() => {
    fetch(`/api/categories?milestone=${form.milestoneType}`)
      .then((r) => r?.json?.())
      .then((d: any) => setCategories(d ?? []))
      .catch(() => {});
  }, [form?.milestoneType]);

  const createSubmission = async () => {
    if (!form.customerName || !form.installerName) {
      toast.error("Customer name and installer name are required");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setSubmissionId(data?.id);
      setStep(2);
      toast.success("Submission created");
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create submission");
    } finally {
      setCreating(false);
    }
  };

  const handleFiles = useCallback((files: FileList | null, category: string, subcategory: string) => {
    if (!files) return;
    const newPhotos: UploadedPhoto[] = [];
    for (let i = 0; i < (files?.length ?? 0); i++) {
      const file = files[i];
      if (!file) continue;
      const preview = URL.createObjectURL(file);
      newPhotos.push({
        file,
        preview,
        category,
        subcategory,
        cloudStoragePath: null,
        analyzing: false,
        analysis: null,
        uploaded: false,
      });
    }
    setPhotos((prev) => [...(prev ?? []), ...newPhotos]);
  }, []);

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const copy = [...(prev ?? [])];
      if (copy[index]?.preview) URL.revokeObjectURL(copy[index].preview);
      copy.splice(index, 1);
      return copy;
    });
  };

  const uploadAndAnalyze = async () => {
    if ((photos?.length ?? 0) === 0) {
      toast.error("Add at least one photo");
      return;
    }
    setAnalyzing(true);
    setStep(3);
    let completed = 0;

    for (let i = 0; i < (photos?.length ?? 0); i++) {
      const photo = photos[i];
      if (!photo) continue;

      try {
        // 1. Upload directly from the browser to Vercel Blob storage.
        // upload() handles the token handshake with /api/upload/presigned
        // and streams the file straight to Blob storage — it never passes
        // through our own serverless function, so large phone photos are fine.
        const blob = await upload(photo?.file?.name ?? "photo.jpg", photo.file, {
          access: "public",
          handleUploadUrl: "/api/upload/presigned",
        });
        const cloud_storage_path = blob.url;

        // 2. Register photo in submission
        await fetch(`/api/submissions/${submissionId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cloudStoragePath: cloud_storage_path,
            isPublic: true,
            originalName: photo?.file?.name,
            category: photo.category,
            subcategory: photo.subcategory,
          }),
        });

        // 4. Analyze with AI
        setPhotos((prev) => {
          const copy = [...(prev ?? [])];
          if (copy[i]) copy[i] = { ...(copy[i] as UploadedPhoto), analyzing: true, cloudStoragePath: cloud_storage_path, uploaded: true };
          return copy;
        });

        const base64 = await fileToBase64(photo.file);
        const analyzeRes = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submissionId,
            imageBase64: base64,
            category: photo.category,
            subcategory: photo.subcategory,
            milestoneType: form.milestoneType,
          }),
        });
        const analysis = await analyzeRes.json();

        setPhotos((prev) => {
          const copy = [...(prev ?? [])];
          if (copy[i]) copy[i] = { ...(copy[i] as UploadedPhoto), analyzing: false, analysis };
          return copy;
        });
      } catch (err: any) {
        console.error("Upload/analyze error for photo", i, err);
        setPhotos((prev) => {
          const copy = [...(prev ?? [])];
          if (copy[i]) copy[i] = { ...(copy[i] as UploadedPhoto), analyzing: false, analysis: { error: err?.message ?? "Failed" } };
          return copy;
        });
      }

      completed++;
      setOverallProgress(Math.round((completed / (photos?.length ?? 1)) * 100));
    }

    setAnalyzing(false);
    toast.success("All photos analyzed!");
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const groupedCategories = (categories ?? []).reduce((acc: Record<string, PhotoCategory[]>, cat: PhotoCategory) => {
    const key = cat?.categoryName ?? "Other";
    if (!acc[key]) acc[key] = [];
    acc[key].push(cat);
    return acc;
  }, {} as Record<string, PhotoCategory[]>);

  const photosForCategory = (cat: string, sub: string) =>
    (photos ?? []).filter((p: UploadedPhoto) => p?.category === cat && p?.subcategory === sub);

  const getCategoryIcon = (cat: string) => {
    if (cat?.includes?.("Roof")) return "🏠";
    if (cat?.includes?.("Electrical")) return "⚡";
    if (cat?.includes?.("Equipment")) return "🏷️";
    if (cat?.includes?.("Commission")) return "📊";
    return "📷";
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        {["Submission Details", "Upload Photos", "AI Analysis"].map((label: string, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}>
              {step > i + 1 ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-sm ${step === i + 1 ? "font-medium" : "text-muted-foreground"}`}>{label}</span>
            {i < 2 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === 1 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="font-display">New M1 Submission</CardTitle>
            <CardDescription>Enter the project details before uploading photos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={form.customerName}
                  onChange={(e: any) => setForm({ ...form, customerName: e?.target?.value ?? "" })}
                  placeholder="Homeowner name"
                />
              </div>
              <div className="space-y-2">
                <Label>Palmetto Account ID</Label>
                <Input
                  value={form.accountId}
                  onChange={(e: any) => setForm({ ...form, accountId: e?.target?.value ?? "" })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label>Installer Company *</Label>
                <Input
                  value={form.installerName}
                  onChange={(e: any) => setForm({ ...form, installerName: e?.target?.value ?? "" })}
                  placeholder="Your company name"
                />
              </div>
              <div className="space-y-2">
                <Label>Milestone Type</Label>
                <select
                  value={form.milestoneType}
                  onChange={(e: any) => setForm({ ...form, milestoneType: e?.target?.value ?? "Install" })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value="Install">Install (M1)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end">
              <Button onClick={createSubmission} disabled={creating} className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                Continue to Photos
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Photo Upload */}
      {step === 2 && (
        <div className="space-y-4">
          <Card className="shadow-sm bg-gradient-to-r from-primary/5 to-amber-500/5 border-primary/10">
            <CardContent className="p-4">
              <p className="text-sm">
                <strong>Upload photos for each required category.</strong> Required categories are marked with a{" "}
                <Badge className="bg-red-100 text-red-700 text-[10px] px-1">Required</Badge> badge.
                The AI will analyze each photo for compliance.
              </p>
            </CardContent>
          </Card>

          {Object.entries(groupedCategories ?? {}).map(([catName, subs]: [string, PhotoCategory[]]) => (
            <Card key={catName} className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-display flex items-center gap-2">
                  <span>{getCategoryIcon(catName)}</span>
                  {(catName ?? "")?.replace?.(/_/g, " ")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {(subs ?? []).map((sub: PhotoCategory) => {
                  const catPhotos = photosForCategory(sub?.categoryName, sub?.subcategoryName);
                  return (
                    <div key={`${sub?.categoryName}-${sub?.subcategoryName}`} className="p-4 rounded-lg bg-muted/30">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Camera className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{(sub?.subcategoryName ?? "")?.replace?.(/_/g, " ")}</span>
                          {sub?.isRequired && <Badge className="bg-red-100 text-red-700 text-[10px] px-1">Required</Badge>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {catPhotos?.length ?? 0}/{sub?.minPhotos ?? 1} min
                        </span>
                      </div>
                      {sub?.requirements && (
                        <p className="text-xs text-muted-foreground mb-3">{sub.requirements}</p>
                      )}

                      {/* Photo previews */}
                      <div className="flex flex-wrap gap-2 mb-2">
                        {(catPhotos ?? []).map((photo: UploadedPhoto, idx: number) => {
                          const globalIdx = (photos ?? []).indexOf(photo);
                          return (
                            <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden bg-muted">
                              <img
                                src={photo?.preview}
                                alt={photo?.file?.name ?? "photo"}
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => removePhoto(globalIdx)}
                                className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}

                        <label className="w-20 h-20 rounded-lg border-2 border-dashed border-muted-foreground/20 flex flex-col items-center justify-center cursor-pointer hover:border-primary/40 hover:bg-primary/5 transition-colors">
                          <Upload className="w-5 h-5 text-muted-foreground/40" />
                          <span className="text-[9px] text-muted-foreground/40 mt-0.5">Add</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e: any) => handleFiles(e?.target?.files, sub?.categoryName, sub?.subcategoryName)}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{photos?.length ?? 0} photos added</span>
              <Button
                onClick={uploadAndAnalyze}
                disabled={(photos?.length ?? 0) === 0}
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              >
                <Zap className="w-4 h-4" />
                Upload & Analyze
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Analysis Results */}
      {step === 3 && (
        <div className="space-y-4">
          {analyzing && (
            <Card className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-sm font-medium">Analyzing photos with AI...</span>
                </div>
                <Progress value={overallProgress} className="h-2" />
                <p className="text-xs text-muted-foreground mt-2">{overallProgress}% complete</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(photos ?? []).map((photo: UploadedPhoto, idx: number) => (
              <Card key={idx} className={`shadow-sm transition-all ${
                photo?.analysis?.is_acceptable === true ? "border-emerald-200" :
                photo?.analysis?.is_acceptable === false ? "border-red-200" : ""
              }`}>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="w-24 h-24 rounded-lg overflow-hidden bg-muted shrink-0">
                      <img src={photo?.preview} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-muted-foreground truncate">
                          {photo?.file?.name ?? "photo"}
                        </span>
                        <Badge className={`text-[10px] ${
                          photo?.analyzing ? "bg-blue-100 text-blue-700" :
                          photo?.analysis?.is_acceptable ? "bg-emerald-100 text-emerald-700" :
                          photo?.analysis?.is_acceptable === false ? "bg-red-100 text-red-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {photo?.analyzing ? "Analyzing..." :
                           photo?.analysis?.is_acceptable ? "Pass" :
                           photo?.analysis?.is_acceptable === false ? "Fail" : "Pending"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {(photo?.category ?? "")?.replace?.(/_/g, " ")} → {(photo?.subcategory ?? "")?.replace?.(/_/g, " ")}
                      </p>

                      {photo?.analysis && !photo?.analysis?.error && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-4 text-xs">
                            <span>Confidence: <strong className="font-mono">{Math.round((photo?.analysis?.confidence_score ?? 0) * 100)}%</strong></span>
                            <span>Quality: <strong className="font-mono">{Math.round((photo?.analysis?.quality_score ?? 0) * 100)}%</strong></span>
                          </div>
                          {(photo?.analysis?.issues?.length ?? 0) > 0 && (
                            <div className="mt-1">
                              {(photo?.analysis?.issues ?? []).slice(0, 2).map((issue: string, j: number) => (
                                <p key={j} className="text-xs text-red-600 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 shrink-0" />{issue}
                                </p>
                              ))}
                            </div>
                          )}
                          {(photo?.analysis?.recommendations?.length ?? 0) > 0 && (
                            <div className="mt-1">
                              {(photo?.analysis?.recommendations ?? []).slice(0, 2).map((rec: string, j: number) => (
                                <p key={j} className="text-xs text-amber-600 flex items-center gap-1">
                                  <Shield className="w-3 h-3 shrink-0" />{rec}
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {photo?.analysis?.error && (
                        <p className="text-xs text-red-500 mt-1">{photo?.analysis?.error}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {!analyzing && (
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => setStep(2)}>Add More Photos</Button>
              <Button
                onClick={() => router.push(`/submissions/${submissionId}`)}
                className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white"
              >
                <Eye className="w-4 h-4" />
                View Full Results
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
