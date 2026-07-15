"use client";

import { useState, useEffect } from "react";
import { useWorkspaceUser } from "@/hooks/use-workspace-user";
import {
  Shield, Camera, FileStack, Upload, Users, Database, AlertTriangle,
  CheckCircle2, BarChart3, Image as ImageIcon
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function AdminClient() {
  const { user } = useWorkspaceUser();
  const [refData, setRefData] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/reference-photos").then((r) => r?.json?.()),
      fetch("/api/stats").then((r) => r?.json?.()),
    ])
      .then(([ref, st]: any[]) => {
        setRefData(ref ?? null);
        setStats(st ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map((i: number) => <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  const adminCards = [
    { label: "Total Reference Photos", value: refData?.total ?? 0, icon: Camera, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Classified References", value: refData?.referenceCount ?? 0, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Total Submissions", value: stats?.totalSubmissions ?? 0, icon: FileStack, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Needs Review", value: stats?.statusCounts?.review_needed ?? 0, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" /> Admin Panel
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Manage reference photos, submissions, and system settings</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {adminCards.map((card: any, i: number) => {
          const Icon = card?.icon;
          return (
            <Card key={i} className="shadow-sm">
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/admin/reference-photos">
          <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Reference Photo Library</h3>
                  <p className="text-sm text-muted-foreground">View and manage approved reference photos by category</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/admin/analytics">
          <Card className="shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-display font-semibold">Analytics & Reports</h3>
                  <p className="text-sm text-muted-foreground">View submission analytics and rejection patterns</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Reference Library Breakdown */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Database className="w-4 h-4 text-muted-foreground" />
            Reference Library Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {(refData?.byCategory ?? []).map((cat: any, i: number) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <p className="text-sm font-medium">
                    {(cat?.category ?? "")?.replace?.(/_/g, " ")} / {(cat?.subcategory ?? "")?.replace?.(/_/g, " ")}
                  </p>
                  <Badge variant="outline" className="text-[10px] mt-1">{cat?.milestone}</Badge>
                </div>
                <span className="text-lg font-mono font-bold text-primary">{cat?.count ?? 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
