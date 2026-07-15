"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";

export default function ConfidenceChart({ photos }: { photos: any[] }) {
  const chartData = (photos ?? []).filter((p: any) => p?.confidenceScore != null).map((p: any, i: number) => ({
    name: (p?.originalName ?? `Photo ${i + 1}`)?.substring?.(0, 15) ?? `P${i + 1}`,
    confidence: Math.round((p?.confidenceScore ?? 0) * 100),
    quality: Math.round((p?.qualityScore ?? 0) * 100),
    pass: p?.isAcceptable,
  }));

  if ((chartData?.length ?? 0) === 0) {
    return <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">No analyzed photos</div>;
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
          <XAxis
            dataKey="name"
            tickLine={false}
            tick={{ fontSize: 9 }}
            angle={-45}
            textAnchor="end"
            height={60}
          />
          <YAxis tickLine={false} tick={{ fontSize: 10 }} domain={[0, 100]} />
          <Tooltip contentStyle={{ fontSize: 11 }} />
          <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" label={{ value: "Pass", position: "right", fontSize: 10 }} />
          <Bar dataKey="confidence" name="Confidence %" radius={[4, 4, 0, 0]}>
            {(chartData ?? []).map((entry: any, index: number) => (
              <Cell
                key={`cell-${index}`}
                fill={entry?.pass ? "#10b981" : (entry?.confidence ?? 0) >= 60 ? "#fbbf24" : "#f87171"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
