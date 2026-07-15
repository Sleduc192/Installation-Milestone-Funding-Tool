export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const milestoneType = req.nextUrl?.searchParams?.get("milestone") ?? "Install";
    const categories = await prisma.photoCategory.findMany({
      where: { milestoneType },
      orderBy: { displayOrder: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error: any) {
    console.error("Categories error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
