export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { findSchProjectByUuid, fetchSchEquipment, searchSchProjects } from "@/lib/scrhub";

/**
 * POST /api/sch/auto-link
 * Automatically find and link SCH equipment for a submission.
 * Tries:
 * 1. externalId (UUID) → findSchProjectByUuid
 * 2. customerName → searchSchProjects (first match)
 * If equipment is already linked, returns it without re-fetching.
 */
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try { body = await req.json(); } catch { /* empty body */ }
    const { submissionId } = body;
    if (!submissionId) {
      return NextResponse.json({ error: "submissionId required" }, { status: 400 });
    }

    const submission = await prisma.photopackSubmission.findUnique({
      where: { id: submissionId },
      select: { id: true, externalId: true, customerName: true, schProjectId: true, soldEquipment: true },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Already linked — return existing data
    if (submission.soldEquipment && submission.schProjectId) {
      return NextResponse.json({
        success: true,
        alreadyLinked: true,
        equipment: submission.soldEquipment,
        schProjectId: submission.schProjectId,
      });
    }

    let schProjectId: number | null = null;

    // Strategy 1: externalId (UUID from SCH URL)
    if (submission.externalId) {
      try {
        schProjectId = await findSchProjectByUuid(submission.externalId);
      } catch (e) {
        console.warn("[auto-link] UUID lookup failed:", e);
      }
    }

    // Strategy 2: customerName search
    if (!schProjectId && submission.customerName) {
      try {
        const { projects } = await searchSchProjects(submission.customerName, { limit: 5 });
        if (projects.length === 1) {
          schProjectId = projects[0].id;
        }
        // If multiple results, don't auto-link — user needs to pick
      } catch (e) {
        console.warn("[auto-link] Name search failed:", e);
      }
    }

    if (!schProjectId) {
      return NextResponse.json({ success: false, reason: "no_match", message: "Could not auto-match SCH project" });
    }

    // Fetch equipment
    const equipment = await fetchSchEquipment(schProjectId);

    // Save to submission
    await prisma.photopackSubmission.update({
      where: { id: submissionId },
      data: { schProjectId, soldEquipment: equipment as any },
    });

    console.log(`[auto-link] Linked submission ${submissionId} → SCH #${schProjectId}`);

    return NextResponse.json({ success: true, alreadyLinked: false, equipment, schProjectId });
  } catch (e: any) {
    console.error("[auto-link] Error:", e);
    return NextResponse.json({ error: e?.message || "Auto-link failed" }, { status: 500 });
  }
}
