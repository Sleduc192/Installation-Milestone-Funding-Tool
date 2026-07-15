"use client";

import { useState, useEffect } from "react";
import { useWorkspaceUser } from "@/hooks/use-workspace-user";
import Link from "next/link";
import {
  FileStack, Upload, Eye, Trash2, CheckCircle2, AlertTriangle,
  Clock, Search, Filter
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  importing: "bg-indigo-100 text-indigo-700",
  analyzing: "bg-blue-100 text-blue-700",
  review_needed: "bg-amber-100 text-amber-800",
  ready: "bg-green-100 text-green-700",
  submitted: "bg-indigo-100 text-indigo-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

export default function SubmissionsClient() {
  const { user } = useWorkspaceUser();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const fetchSubmissions = () => {
    setLoading(true);
    fetch("/api/submissions")
      .then((r) => r?.json?.())
      .then((d: any) => setSubmissions(d ?? []))
      .catch(() => toast.error("Failed to load submissions"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchSubmissions(); }, []);

  const deleteSubmission = async (id: string) => {
    if (!confirm("Delete this submission?")) return;
    try {
      await fetch(`/api/submissions/${id}`, { method: "DELETE" });
      toast.success("Submission deleted");
      fetchSubmissions();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const filtered = (submissions ?? []).filter((s: any) => {
    const matchSearch = !search ||
      s?.customerName?.toLowerCase?.()?.includes?.(search?.toLowerCase?.()) ||
      s?.installerName?.toLowerCase?.()?.includes?.(search?.toLowerCase?.());
    const matchStatus = filterStatus === "all" || s?.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Submissions</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your M1 photo pack submissions</p>
        </div>
        <Link href="/upload">
          <Button className="gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white">
            <Upload className="w-4 h-4" /> New Submission
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e: any) => setSearch(e?.target?.value ?? "")}
            placeholder="Search by customer or installer..."
            className="pl-10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e: any) => setFilterStatus(e?.target?.value ?? "all")}
          className="h-10 px-3 rounded-md border border-input bg-background text-sm"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="analyzing">Analyzing</option>
          <option value="review_needed">Review Needed</option>
          <option value="ready">Ready</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i: number) => <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />)}
        </div>
      ) : (filtered?.length ?? 0) === 0 ? (
        <Card className="shadow-sm">
          <CardContent className="p-12 text-center">
            <FileStack className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
            <p className="text-muted-foreground">No submissions found</p>
            <Link href="/upload">
              <Button variant="outline" className="mt-4 gap-2">
                <Upload className="w-4 h-4" /> Create Your First Submission
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {(filtered ?? []).map((s: any) => (
            <Card key={s?.id} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <FileStack className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-sm">{s?.customerName ?? "Unnamed"}</h3>
                      <p className="text-xs text-muted-foreground">
                        {s?.installerName} • {s?.milestoneType} • {s?.photos?.length ?? 0} photos
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Created {s?.createdAt ? new Date(s.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }) : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {s?.overallConfidence != null && (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Confidence</p>
                        <p className={`text-lg font-mono font-bold ${
                          (s?.overallConfidence ?? 0) >= 0.8 ? "text-emerald-600" :
                          (s?.overallConfidence ?? 0) >= 0.6 ? "text-amber-600" : "text-red-600"
                        }`}>
                          {Math.round((s?.overallConfidence ?? 0) * 100)}%
                        </p>
                      </div>
                    )}
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">
                        {s?.categoriesComplete ?? 0}/{s?.categoriesRequired ?? 0} categories
                      </p>
                      <Badge className={statusColors[s?.status] ?? "bg-gray-100 text-gray-700"}>
                        {(s?.status ?? "draft")?.replace?.("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Link href={`/submissions/${s?.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600"
                        onClick={() => deleteSubmission(s?.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
