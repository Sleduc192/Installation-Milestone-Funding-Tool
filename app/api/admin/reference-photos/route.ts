export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspaceUser } from "@/lib/workspace-auth";

export async function GET() {
  try {
    const user = await getWorkspaceUser();
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const stats = await prisma.approvedPhoto.groupBy({
      by: ["displayCategory", "subcategory", "milestoneType"],
      _count: { id: true },
    });

    const total = await prisma.approvedPhoto.count();
    const referenceCount = await prisma.approvedPhoto.count({ where: { isReference: true } });

    return NextResponse.json({
      total,
      referenceCount,
      byCategory: (stats ?? []).map((s: any) => ({
        category: s?.displayCategory ?? "Unknown",
        subcategory: s?.subcategory ?? "Unknown",
        milestone: s?.milestoneType ?? "Unknown",
        count: s?._count?.id ?? 0,
      })),
    });
  } catch (error: any) {
    console.error("Reference photos error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getWorkspaceUser();
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = (await req.json()) ?? {};
    const { customerName, milestoneType, displayCategory, subcategory, originalName, cloudStoragePath, isPublic } = body;

    const photo = await prisma.approvedPhoto.create({
      data: {
        customerName: customerName ?? "Admin Upload",
        milestoneType: milestoneType ?? "Install",
        displayCategory: displayCategory ?? "Roof_Mount",
        subcategory: subcategory ?? "Array_Layout",
        originalName: originalName ?? "uploaded_photo",
        filePath: cloudStoragePath ?? "",
        cloudStoragePath: cloudStoragePath ?? null,
        isPublic: isPublic ?? true,
        isReference: true,
      },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error: any) {
    console.error("Add reference photo error:", error);
    return NextResponse.json({ error: "Failed to add reference photo" }, { status: 500 });
  }
}
