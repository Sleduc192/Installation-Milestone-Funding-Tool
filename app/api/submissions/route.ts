export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspaceUser } from "@/lib/workspace-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getWorkspaceUser();
    const where = user.role === "admin" ? {} : { userId: user.id };

    const submissions = await prisma.photopackSubmission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        photos: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true, company: true } },
      },
    });

    return NextResponse.json(submissions);
  } catch (error: any) {
    console.error("Submissions GET error:", error);
    return NextResponse.json({ error: "Failed to fetch submissions" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getWorkspaceUser();
    const body = (await req.json()) ?? {};
    const { customerName, accountId, installerName, milestoneType } = body;

    if (!customerName || !installerName || !milestoneType) {
      return NextResponse.json({ error: "customerName, installerName, and milestoneType are required" }, { status: 400 });
    }

    const reqCats = await prisma.photoCategory.count({
      where: { milestoneType, isRequired: true },
    });

    const submission = await prisma.photopackSubmission.create({
      data: {
        customerName,
        accountId: accountId ?? "",
        installerName,
        milestoneType,
        userId: user.id,
        categoriesRequired: reqCats,
      },
    });

    return NextResponse.json(submission, { status: 201 });
  } catch (error: any) {
    console.error("Submissions POST error:", error);
    return NextResponse.json({ error: "Failed to create submission" }, { status: 500 });
  }
}
