"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

const COLORS = ["#1e3a5f", "#d4a843", "#3b82f6", "#10b981"];

export default function CategoryChart({ data }: { data: { category: string; milestone: string; count: number }[] }) {
  const grouped: Record<string, number> = {};
  for (const d of data ?? []) {
    const key = d?.category ?? "Unknown";
    grouped[key] = (grouped[key] ?? 0) + (d?.count ?? 0);
  }

  const chartData = Object.entries(grouped ?? {}).map(([name, value]: [string, number]) => ({
    name: (name ?? "")?.replace?.("_", " "),
    count: value ?? 0,
  }));

  if ((chartData?.length ?? 0) === 0) {
    return <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">No data available</div>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
          <XAxis
            dataKey="name"
            tickLine={false}
            tick={{ fontSize: 10 }}
            interval="preserveStartEnd"
            angle={-30}
            textAnchor="end"
            height={50}
          />
          <YAxis tickLine={false} tick={{ fontSize: 10 }} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {(chartData ?? []).map((_: any, index: number) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
