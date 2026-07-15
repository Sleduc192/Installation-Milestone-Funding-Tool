"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const STATUS_COLORS: Record<string, string> = {
  draft: "#94a3b8",
  analyzing: "#60a5fa",
  review_needed: "#d97706",
  ready: "#34d399",
  submitted: "#818cf8",
  approved: "#10b981",
  rejected: "#f87171",
};

export default function StatusChart({ data }: { data: Record<string, number> }) {
  const chartData = Object.entries(data ?? {}).filter(([_, v]: [string, number]) => (v ?? 0) > 0).map(([name, value]: [string, number]) => ({
    name: (name ?? "")?.replace?.("_", " "),
    value: value ?? 0,
    fill: STATUS_COLORS[name] ?? "#94a3b8",
  }));

  if ((chartData?.length ?? 0) === 0) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No submissions yet</div>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
            dataKey="value"
          >
            {(chartData ?? []).map((entry: any, index: number) => (
              <Cell key={`cell-${index}`} fill={entry?.fill ?? "#94a3b8"} />
            ))}
          </Pie>
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Legend verticalAlign="top" wrapperStyle={{ fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
