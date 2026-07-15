export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchSchEquipment } from "@/lib/scrhub";

export async function GET(req: NextRequest) {
  try {
    const projectId = parseInt(req.nextUrl.searchParams.get("projectId") || "0", 10);
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const equipment = await fetchSchEquipment(projectId);
    return NextResponse.json(equipment);
  } catch (e: any) {
    console.error("SCH equipment error:", e);
    return NextResponse.json({ error: e?.message || "Equipment fetch failed" }, { status: 500 });
  }
}
