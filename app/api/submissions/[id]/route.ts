export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchSchDesignAttachments, downloadSchFile, DesignCadFile } from "@/lib/scrhub";
import { uploadBufferToBlob } from "@/lib/blob-storage";
import { detectArrayCountFromPlanset } from "@/lib/detect-array-count";

/** Pull the best planset URL out of a designCadFiles array (prefer the planset attachment). */
function findPlansetUrl(designCadFiles: any): string | null {
  if (!Array.isArray(designCadFiles)) return null;
  const withUrl = designCadFiles.filter((f: any) => f?.storedUrl);
  const planset = withUrl.find((f: any) => {
    const atype = (f?.attachmentType ?? "").toLowerCase();
    const label = (f?.label ?? "").toLowerCase();
    const fname = (f?.fileName ?? "").toLowerCase();
    return atype === "planset" || atype === "designs" || label.includes("planset") || label.includes("design") || fname.includes("planset") || fname.includes("design");
  });
  return (planset?.storedUrl as string) || (withUrl[0]?.storedUrl as string) || null;
}

/** Detect and persist the number of mounting planes / arrays from the planset, once. */
async function ensureArrayCount(submission: any): Promise<void> {
  try {
    if (submission?.arrayCount != null) return; // already detected
    const plansetUrl = findPlansetUrl(submission?.designCadFiles);
    if (!plansetUrl) return;
    const { count, source } = await detectArrayCountFromPlanset(plansetUrl);
    if (count != null) {
      submission.arrayCount = count;
      submission.arrayCountSource = source;
      await prisma.photopackSubmission.update({
        where: { id: submission.id },
        data: { arrayCount: count, arrayCountSource: source },
      });
      console.log(`[array-count] persisted arrayCount=${count} for submission ${submission.id}`);
    }
  } catch (e: any) {
    console.log("[array-count] ensureArrayCount error:", e?.message);
  }
}

/** Check if designCadFiles already contains valid design entries (planset/production model/shade report) with working storedUrl */
function hasValidPlansetFiles(designCadFiles: any): boolean {
  if (!Array.isArray(designCadFiles) || designCadFiles.length === 0) return false;
  // Require an actual PLANSET/design entry (with a working storedUrl) to be present.
  // Otherwise the auto-fetch is re-triggered so a missing planset can be pulled in
  // even when production model / shade report are already stored.
  return designCadFiles.some((f: any) => {
    const atype = (f?.attachmentType ?? "").toLowerCase();
    const label = (f?.label ?? "").toLowerCase();
    const fname = (f?.fileName ?? "").toLowerCase();
    const isPlanset = atype === "planset" || atype === "designs" ||
      label.includes("planset") || label.includes("design") ||
      fname.includes("planset") || fname.includes("design");
    // Must have a storedUrl in the public path to be considered valid
    return isPlanset && !!f?.storedUrl;
  });
}

/** Auto-fetch planset files from SCH, download to our S3, and persist on the submission */
async function autoFetchPlanset(submissionId: string, schProjectId: number): Promise<any[] | null> {
  try {
    const rawFiles = await fetchSchDesignAttachments(schProjectId);
    if (rawFiles.length === 0) return null; // no planset in SCH either

    const storedFiles: DesignCadFile[] = [];

    for (const file of rawFiles) {
      try {
        if (!file.cdnUrl) continue;
        const { buffer, contentType } = await downloadSchFile(file.cdnUrl);
        const safeFileName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
        const blobPath = `design-cad/${schProjectId}/${Date.now()}_${safeFileName}`;
        const { url: publicUrl } = await uploadBufferToBlob(blobPath, buffer, contentType);
        storedFiles.push({ ...file, storedUrl: publicUrl, fileSize: buffer.length });
        console.log(`[auto-planset] Stored: ${safeFileName}`);
      } catch (fileErr: any) {
        // CDN URLs may expire for older projects — this is expected, not an error
        console.log(`[auto-planset] Skipped ${file.fileName} (CDN unavailable)`);
      }
    }

    if (storedFiles.length > 0) {
      await prisma.photopackSubmission.update({
        where: { id: submissionId },
        data: { designCadFiles: JSON.parse(JSON.stringify(storedFiles)) },
      });
      console.log(`[auto-planset] Stored ${storedFiles.length} planset file(s) for submission ${submissionId}`);
    }
    return storedFiles;
  } catch (err: any) {
    console.log(`[auto-planset] Could not fetch planset for project ${schProjectId}`);
    return null;
  }
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {

    const submission = await prisma.photopackSubmission.findUnique({
      where: { id: params?.id },
      include: {
        photos: { orderBy: { createdAt: "asc" } },
        user: { select: { name: true, email: true, company: true } },
      },
    });

    if (!submission) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Auto-fetch planset if SCH project linked but no planset files stored yet
    const schProjectId = (submission as any).schProjectId;
    if (schProjectId && !hasValidPlansetFiles((submission as any).designCadFiles)) {
      const fetched = await autoFetchPlanset(submission.id, schProjectId);
      if (fetched && fetched.length > 0) {
        (submission as any).designCadFiles = fetched;
      }
    }

    // Detect the number of mounting planes / arrays from the planset (once) so
    // R4 (Under Array Wire Management) can require one under-array photo per array.
    await ensureArrayCount(submission as any);

    return NextResponse.json(submission);
  } catch (error: any) {
    console.error("Submission GET error:", error);
    return NextResponse.json({ error: "Failed to fetch submission" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {

    const body = (await req.json()) ?? {};
    const submission = await prisma.photopackSubmission.update({
      where: { id: params?.id },
      data: body,
    });

    return NextResponse.json(submission);
  } catch (error: any) {
    console.error("Submission PATCH error:", error);
    return NextResponse.json({ error: "Failed to update submission" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {

    await prisma.photopackSubmission.delete({ where: { id: params?.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Submission DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
