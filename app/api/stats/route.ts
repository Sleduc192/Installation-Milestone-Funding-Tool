export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspaceUser } from "@/lib/workspace-auth";

export async function GET() {
  try {
    const user = await getWorkspaceUser();
    const userId = user.id;
    const isAdmin = user.role === "admin";

    const submissionWhere = isAdmin ? {} : { userId };

    const [totalPhotos, totalSubmissions, submissions, categoryStats, recentSubmissions] = await Promise.all([
      prisma.approvedPhoto.count(),
      prisma.photopackSubmission.count({ where: submissionWhere }),
      prisma.photopackSubmission.findMany({ where: submissionWhere }),
      prisma.approvedPhoto.groupBy({
        by: ["displayCategory", "milestoneType"],
        _count: { id: true },
      }),
      prisma.photopackSubmission.findMany({
        where: submissionWhere,
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { _count: { select: { photos: true } }, user: { select: { name: true, email: true } } },
      }),
    ]);

    const statusCounts = {
      draft: 0,
      analyzing: 0,
      review_needed: 0,
      ready: 0,
      submitted: 0,
      approved: 0,
      rejected: 0,
    };

    for (const s of submissions ?? []) {
      const key = s?.status as keyof typeof statusCounts;
      if (key && statusCounts[key] !== undefined) {
        statusCounts[key]++;
      }
    }

    const avgConfidence = (submissions ?? [])
      .filter((s: any) => s?.overallConfidence != null)
      .reduce((sum: number, s: any, _: number, arr: any[]) => sum + (s?.overallConfidence ?? 0) / (arr?.length ?? 1), 0);

    return NextResponse.json({
      totalPhotos,
      totalSubmissions,
      statusCounts,
      avgConfidence: Math.round((avgConfidence ?? 0) * 100) / 100,
      categoryStats: (categoryStats ?? []).map((c: any) => ({
        category: c?.displayCategory ?? "Unknown",
        milestone: c?.milestoneType ?? "Unknown",
        count: c?._count?.id ?? 0,
      })),
      recentSubmissions: (recentSubmissions ?? []).map((s: any) => ({
        id: s?.id,
        customerName: s?.customerName,
        milestoneType: s?.milestoneType,
        status: s?.status,
        overallConfidence: s?.overallConfidence,
        totalPhotos: s?.totalPhotos ?? 0,
        issuesFound: s?.issuesFound ?? 0,
        photoCount: s?._count?.photos ?? 0,
        userName: s?.user?.name ?? s?.user?.email ?? "Unknown",
        createdAt: s?.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Stats error:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
