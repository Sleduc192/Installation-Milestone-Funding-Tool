"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, ShieldCheck, AlertCircle, FolderOpen, CheckCircle2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function ReviewGdriveClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [gdriveUrl, setGdriveUrl] = useState("");
  const [gdriveName, setGdriveName] = useState("");
  const [gdriveMilestone, setGdriveMilestone] = useState("Install");
  const [gdriveLoading, setGdriveLoading] = useState(false);
  const [gdriveConnected, setGdriveConnected] = useState<boolean | null>(null);
  const [connectingGdrive, setConnectingGdrive] = useState(false);

  const checkGdriveStatus = useCallback(async () => {
    try {
      const r = await fetch("/api/gdrive/status");
      const d = await r.json();
      setGdriveConnected(d.connected);
    } catch {
      setGdriveConnected(false);
    }
  }, []);

  useEffect(() => {
    checkGdriveStatus();
  }, [checkGdriveStatus]);

  // Handle redirect back from OAuth callback
  useEffect(() => {
    if (searchParams.get("connected") === "1") {
      setGdriveConnected(true);
      setConnectingGdrive(false);
      toast.success("Google Drive connected successfully!");
      // Clean up the URL param
      router.replace("/review-gdrive");
    }
  }, [searchParams, router]);

  const connectGdrive = async () => {
    setConnectingGdrive(true);
    try {
      const r = await fetch("/api/gdrive/auth");
      const d = await r.json();
      if (d.authUrl) {
        // Use top-level navigation so it works inside iframes
        const top = window.top || window;
        top.location.href = d.authUrl;
      } else {
        toast.error(d.error || "Could not start authorization");
        setConnectingGdrive(false);
      }
    } catch (e: any) {
      toast.error(e?.message || "Error");
      setConnectingGdrive(false);
    }
  };

  const submitGdrive = async () => {
    if (!gdriveUrl.trim()) { toast.error("Paste a Google Drive folder URL"); return; }
    setGdriveLoading(true);
    try {
      const r = await fetch("/api/gdrive/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folderUrl: gdriveUrl.trim(),
          milestoneType: gdriveMilestone,
          customerName: gdriveName.trim() || undefined,
        }),
      });
      const contentType = r.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        const text = await r.text();
        console.error("GDrive ingest returned non-JSON:", r.status, text.slice(0, 500));
        toast.error(`Server error (${r.status}). Check console for details.`);
        setGdriveLoading(false);
        return;
      }
      const d = await r.json();
      if (!r.ok) { toast.error(d?.error || "Import failed"); setGdriveLoading(false); return; }
      toast.success(`Imported ${d.photoCount} photos from "${d.folderName}". Running AI review…`);
      router.push(`/submissions/${d.submissionId}`);
    } catch (e: any) {
      console.error("GDrive submit error:", e);
      toast.error(e?.message || "Error");
      setGdriveLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Google Drive Import</h1>
        <p className="text-muted-foreground">Import photos from a shared Google Drive folder — we download every image, run AI review, and report what's approved vs. missing.</p>
      </div>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderOpen className="w-5 h-5 text-primary"/> Google Drive Folder</CardTitle>
          <CardDescription>Paste a shared Google Drive folder link — we download all photos and run the same AI analysis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Connection Status */}
          {gdriveConnected === null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking Google Drive connection…
            </div>
          ) : gdriveConnected ? (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4" /> Google Drive connected
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                <AlertCircle className="w-4 h-4" /> Google Drive not connected yet
              </div>
              <Button onClick={connectGdrive} disabled={connectingGdrive} variant="outline" className="w-full">
                {connectingGdrive
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Waiting for authorization…</>
                  : <><ExternalLink className="w-4 h-4 mr-2"/> Connect Google Drive</>}
              </Button>
            </div>
          )}

          {gdriveConnected && (
            <>
              <div>
                <Label>Google Drive Folder URL</Label>
                <Input
                  value={gdriveUrl}
                  onChange={(e) => setGdriveUrl(e.target.value)}
                  placeholder="https://drive.google.com/drive/folders/..."
                />
                <p className="text-xs text-muted-foreground mt-1">The folder must be shared with the connected Google account. Subfolders are scanned automatically.</p>
              </div>
              <div>
                <Label>Customer / Project Name <span className="text-muted-foreground font-normal">(optional — defaults to folder name)</span></Label>
                <Input
                  value={gdriveName}
                  onChange={(e) => setGdriveName(e.target.value)}
                  placeholder="e.g. Smith Residence"
                />
              </div>
              <div>
                <Label>Milestone</Label>
                <select value={gdriveMilestone} onChange={(e) => setGdriveMilestone(e.target.value)} className="w-full mt-1 border rounded-md h-10 px-3 bg-background">
                  <option value="Install">M1 — Install</option>
                </select>
              </div>
              <Button onClick={submitGdrive} disabled={gdriveLoading} className="w-full" size="lg">
                {gdriveLoading
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Downloading & Analyzing…</>
                  : <><Sparkles className="w-4 h-4 mr-2"/> Import & Run AI Review</>}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <Card><CardContent className="p-4 flex gap-3 items-start"><ShieldCheck className="w-6 h-6 text-primary mt-0.5"/><div><div className="font-semibold">Read-only</div><div className="text-sm text-muted-foreground">No emails, no edits — downloads photos from your Drive folder.</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex gap-3 items-start"><AlertCircle className="w-6 h-6 text-primary mt-0.5"/><div><div className="font-semibold">What you get</div><div className="text-sm text-muted-foreground">Per-photo confidence, missing required categories, and prevention tips for likely rejections.</div></div></CardContent></Card>
      </div>
    </div>
  );
}
