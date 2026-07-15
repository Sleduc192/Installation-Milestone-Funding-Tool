"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link as LinkIcon, Loader2, Sparkles, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function ReviewClient() {
  const router = useRouter();

  const [url, setUrl] = useState("");
  const [milestone, setMilestone] = useState("Install");
  const [loading, setLoading] = useState(false);

  const submitSch = async () => {
    if (!url.trim()) { toast.error("Paste a photopack URL"); return; }
    setLoading(true);
    try {
      const r = await fetch("/api/photopack/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), milestoneType: milestone }),
      });
      const d = await r.json();
      if (!r.ok) { toast.error(d?.error || "Ingest failed"); setLoading(false); return; }
      toast.success(`Ingested ${d.photoCount} photos for ${d.customerName}. Running AI review…`);
      router.push(`/submissions/${d.submissionId}`);
    } catch (e: any) {
      toast.error(e?.message || "Error");
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Review by URL</h1>
        <p className="text-muted-foreground">Paste a SubcontractorHub photopack URL — we pull every photo, run AI review, and report what's approved vs. missing.</p>
      </div>

      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><LinkIcon className="w-5 h-5 text-primary"/> Photopack URL</CardTitle>
          <CardDescription>Example: https://app.subcontractorhub.com/public-module/installation/&lt;uuid&gt;</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Photopack URL or Installation ID</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://app.subcontractorhub.com/public-module/installation/..." />
          </div>
          <div>
            <Label>Milestone</Label>
            <select value={milestone} onChange={(e) => setMilestone(e.target.value)} className="w-full mt-1 border rounded-md h-10 px-3 bg-background">
              <option value="Install">M1 — Install</option>
            </select>
          </div>
          <Button onClick={submitSch} disabled={loading} className="w-full" size="lg">
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Ingesting & Analyzing…</> : <><Sparkles className="w-4 h-4 mr-2"/> Run AI Review</>}
          </Button>
        </CardContent>
      </Card>

      <div className="grid sm:grid-cols-2 gap-4 mt-6">
        <Card><CardContent className="p-4 flex gap-3 items-start"><ShieldCheck className="w-6 h-6 text-primary mt-0.5"/><div><div className="font-semibold">Read-only</div><div className="text-sm text-muted-foreground">No emails, no edits — pulls photos directly from the source.</div></div></CardContent></Card>
        <Card><CardContent className="p-4 flex gap-3 items-start"><AlertCircle className="w-6 h-6 text-primary mt-0.5"/><div><div className="font-semibold">What you get</div><div className="text-sm text-muted-foreground">Per-photo confidence, missing required categories, and prevention tips for likely rejections.</div></div></CardContent></Card>
      </div>
    </div>
  );
}
