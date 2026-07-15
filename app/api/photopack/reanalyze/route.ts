export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { analyzePhoto, updateSubmissionAggregates } from "@/lib/analyze-photo";

export async function POST(req: NextRequest) {
  try {

    const { submissionId } = await req.json();
    if (!submissionId) return NextResponse.json({ error: "submissionId required" }, { status: 400 });

    const submission = await prisma.photopackSubmission.findUnique({
      where: { id: submissionId },
      include: { photos: true },
    });
    if (!submission) return NextResponse.json({ error: "Submission not found" }, { status: 404 });

    // Reset status
    await prisma.photopackSubmission.update({ where: { id: submissionId }, data: { status: "analyzing" } });

    const expectedCategories: any[] = Array.isArray(submission.expectedCategories) ? submission.expectedCategories as any[] : [];
    const photos = submission.photos ?? [];
    // Only re-analyze photos without scores
    const toAnalyze = photos.filter((p: any) => p.confidenceScore == null);

    // Fire and forget — process in parallel batches for faster analysis
    const BATCH_SIZE = 5;
    (async () => {
      for (let i = 0; i < toAnalyze.length; i += BATCH_SIZE) {
        const batch = toAnalyze.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (p: any) => {
            try {
              const labelDesc = expectedCategories.find((c: any) => c.name === p.expectedLabel)?.description;
              await analyzePhoto({
                photoId: p.id,
                submissionId,
                imageUrl: p.sourcePhotoUrl || p.cloudStoragePath,
                category: p.expectedLabel || p.category,
                subcategory: "General",
                milestoneType: submission.milestoneType,
                expectedLabel: p.expectedLabel || undefined,
                labelDescription: labelDesc,
              });
            } catch (e) {
              console.error("Re-analyze error", p.id, e);
            }
          })
        );
      }
      await updateSubmissionAggregates(submissionId, expectedCategories);
    })();

    return NextResponse.json({ message: `Re-analyzing ${toAnalyze.length} photos`, total: photos.length });
  } catch (e: any) {
    console.error("Reanalyze error:", e);
    return NextResponse.json({ error: e?.message || "Failed" }, { status: 500 });
  }
}
