"use client";

import { useState, useEffect } from "react";
import { useWorkspaceUser } from "@/hooks/use-workspace-user";
import {
  FileStack, Camera, CheckCircle2, AlertTriangle, TrendingUp, Clock,
  Upload, ArrowRight, Zap, BarChart3, Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import Link from "next/link";
import dynamic from "next/dynamic";

const CategoryChart = dynamic(() => import("./category-chart"), { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> });
const StatusChart = dynamic(() => import("./status-chart"), { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> });

interface StatsData {
  totalPhotos: number;
  totalSubmissions: number;
  statusCounts: Record<string, number>;
  avgConfidence: number;
  categoryStats: { category: string; milestone: string; count: number }[];
  recentSubmissions: any[];
}

export default function DashboardClient() {
  const { user } = useWorkspaceUser();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r?.json?.())
      .then((d: any) => setStats(d ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = user?.role === "admin";
  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    analyzing: "bg-blue-100 text-blue-700",
    review_needed: "bg-amber-100 text-amber-800",
    ready: "bg-green-100 text-green-700",
    submitted: "bg-indigo-100 text-indigo-700",
    approved: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="h-8 w-64 bg-muted animate-pulse rounded" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i: number) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Reference Photos",
      value: stats?.totalPhotos ?? 0,
      icon: Camera,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Total Submissions",
      value: stats?.totalSubmissions ?? 0,
      icon: FileStack,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "Approved",
      value: stats?.statusCounts?.approved ?? 0,
      icon: CheckCircle2,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Avg Confidence",
      value: `${Math.round((stats?.avgConfidence ?? 0) * 100)}%`,
      icon: TrendingUp,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
    },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">
            Welcome back, {user?.name?.split?.(' ')?.[0] ?? 'there'}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isAdmin ? "System overview and submission management" : "Track your M1 photo submissions"}
          </p>
        </div>
        <Link href="/upload">
          <Button className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white gap-2">
            <Upload className="w-4 h-4" />
            New Submission
          </Button>
        </Link>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card: any, i: number) => {
          const Icon = card?.icon;
          return (
            <Card key={i} className="shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card?.label}</p>
                    <p className="text-2xl font-display font-bold mt-1">{card?.value}</p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl ${card?.bg} flex items-center justify-center`}>
                    {Icon && <Icon className={`w-5 h-5 ${card?.color}`} />}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Reference Library by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={stats?.categoryStats ?? []} />
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Submission Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StatusChart data={stats?.statusCounts ?? {}} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Submissions */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              Recent Submissions
            </CardTitle>
            <Link href="/submissions">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View All <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {(stats?.recentSubmissions?.length ?? 0) === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileStack className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No submissions yet</p>
              <Link href="/upload">
                <Button variant="outline" size="sm" className="mt-3 gap-1">
                  <Upload className="w-3 h-3" /> Create First Submission
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {(stats?.recentSubmissions ?? []).map((s: any) => (
                <Link key={s?.id} href={`/submissions/${s?.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                        <FileStack className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{s?.customerName ?? "Unnamed"}</p>
                        <p className="text-xs text-muted-foreground">
                          {s?.milestoneType} • {s?.photoCount ?? 0} photos
                          {isAdmin && s?.userName ? ` • by ${s.userName}` : ""}
                          {s?.createdAt ? ` • ${new Date(s.createdAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true })}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {s?.overallConfidence != null && (
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <p className="text-sm font-mono font-medium">{Math.round((s?.overallConfidence ?? 0) * 100)}%</p>
                        </div>
                      )}
                      <Badge className={statusColors[s?.status] ?? "bg-gray-100 text-gray-700"}>
                        {(s?.status ?? "draft")?.replace?.("_", " ")}
                      </Badge>
                      <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="shadow-sm bg-gradient-to-r from-primary/5 to-amber-500/5 border-primary/10">
        <CardContent className="p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-display font-semibold text-sm">M1 Submission Tips</h3>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                <li>• Ensure all labels and serial numbers are clearly readable</li>
                <li>• Take photos in good lighting - avoid shadows on panels</li>
                <li>• Include full array views showing all panels in the layout</li>
                <li>• AC disconnect rating and fuse size must be visible</li>
                <li>• Commissioning screenshots should show all devices online</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
