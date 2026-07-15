export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {

    const category = req.nextUrl?.searchParams?.get("category") ?? undefined;
    const subcategory = req.nextUrl?.searchParams?.get("subcategory") ?? undefined;
    const milestone = req.nextUrl?.searchParams?.get("milestone") ?? undefined;

    const where: any = {};
    if (category) where.displayCategory = category;
    if (subcategory) where.subcategory = subcategory;
    if (milestone) where.milestoneType = milestone;

    const photos = await prisma.approvedPhoto.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json(photos);
  } catch (error: any) {
    console.error("Approved photos error:", error);
    return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
  }
}
