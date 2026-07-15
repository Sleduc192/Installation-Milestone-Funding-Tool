"use client";

import { useState, useEffect } from "react";
import { BarChart3, TrendingUp, AlertTriangle, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";

const RejectionChart = dynamic(() => import("./rejection-chart"), { ssr: false, loading: () => <div className="h-64 bg-muted animate-pulse rounded-lg" /> });

export default function AnalyticsClient() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/rejection-patterns").then((r) => r?.json?.()),
      fetch("/api/stats").then((r) => r?.json?.()),
    ])
      .then(([pats, st]: any[]) => {
        setPatterns(pats ?? []);
        setStats(st ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2].map((i: number) => <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />)}
      </div>
    );
  }

  const severityColors: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    high: "bg-amber-100 text-amber-700",
    medium: "bg-yellow-100 text-yellow-700",
    low: "bg-blue-100 text-blue-700",
  };

  return (
    <div className="p-6 lg:p-8 max-w-[1200px] space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" /> Analytics & Patterns
        </h1>
        <p className="text-muted-foreground text-sm mt-1">Rejection patterns and submission analytics</p>
      </div>

      {/* Rejection Pattern Chart */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Known Rejection Patterns
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RejectionChart patterns={patterns} />
        </CardContent>
      </Card>

      {/* Pattern Details */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Pattern Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(patterns ?? []).map((p: any) => (
              <div key={p?.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{(p?.patternName ?? "")?.replace?.(/_/g, " ")}</span>
                    <Badge className={severityColors[p?.severity] ?? "bg-gray-100 text-gray-700"}>
                      {p?.severity}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{p?.description}</p>
                  <p className="text-xs text-muted-foreground/60">
                    {(p?.category ?? "")?.replace?.(/_/g, " ")} {p?.subcategory ? `/ ${p.subcategory?.replace?.(/_/g, " ")}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
