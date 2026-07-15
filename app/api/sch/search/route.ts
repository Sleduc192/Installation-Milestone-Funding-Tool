export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { searchSchProjects } from "@/lib/scrhub";

export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q") || "";
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
    const status = req.nextUrl.searchParams.get("status") || undefined;

    if (!q.trim()) {
      return NextResponse.json({ projects: [], total: 0 });
    }

    const result = await searchSchProjects(q, { page, limit, status });
    return NextResponse.json(result);
  } catch (e: any) {
    console.error("SCH search error:", e);
    return NextResponse.json({ error: e?.message || "Search failed" }, { status: 500 });
  }
}
