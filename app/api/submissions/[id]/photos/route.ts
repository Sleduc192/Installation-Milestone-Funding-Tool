export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {

    const body = (await req.json()) ?? {};
    const { cloudStoragePath, isPublic, originalName, category, subcategory } = body;

    if (!cloudStoragePath || !category || !subcategory) {
      return NextResponse.json({ error: "cloudStoragePath, category, and subcategory required" }, { status: 400 });
    }

    const photo = await prisma.submissionPhoto.create({
      data: {
        submissionId: params?.id,
        cloudStoragePath,
        isPublic: isPublic ?? false,
        originalName: originalName ?? "",
        category,
        subcategory,
      },
    });

    // Update submission photo count
    const count = await prisma.submissionPhoto.count({ where: { submissionId: params?.id } });
    await prisma.photopackSubmission.update({
      where: { id: params?.id },
      data: { totalPhotos: count },
    });

    return NextResponse.json(photo, { status: 201 });
  } catch (error: any) {
    console.error("Photo add error:", error);
    return NextResponse.json({ error: "Failed to add photo" }, { status: 500 });
  }
}
