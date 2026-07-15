"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const SEVERITY_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f59e0b",
  medium: "#eab308",
  low: "#3b82f6",
};

export default function RejectionChart({ patterns }: { patterns: any[] }) {
  const chartData = (patterns ?? []).map((p: any) => ({
    name: (p?.patternName ?? "")?.replace?.(/_/g, " ")?.substring?.(0, 20),
    severity: p?.severity ?? "medium",
    value: p?.severity === "critical" ? 4 : p?.severity === "high" ? 3 : p?.severity === "medium" ? 2 : 1,
  }));

  if ((chartData?.length ?? 0) === 0) {
    return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No patterns recorded</div>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 10, left: 100, bottom: 5 }}>
          <XAxis type="number" tickLine={false} tick={{ fontSize: 10 }} domain={[0, 4]} />
          <YAxis dataKey="name" type="category" tickLine={false} tick={{ fontSize: 10 }} width={100} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Bar dataKey="value" name="Severity Level" radius={[0, 4, 4, 0]}>
            {(chartData ?? []).map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={SEVERITY_COLORS[entry?.severity] ?? "#94a3b8"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
