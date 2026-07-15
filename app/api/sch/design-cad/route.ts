export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { fetchSchDesignAttachments, downloadSchFile, DesignCadFile } from "@/lib/scrhub";
import { prisma } from "@/lib/db";
import { uploadBufferToBlob } from "@/lib/blob-storage";

/**
 * GET /api/sch/design-cad?projectId=41389
 * Fetches Design CAD / Planset attachments list from SCH.
 *
 * POST /api/sch/design-cad
 * Downloads Design CAD files from SCH CDN, re-uploads to our S3,
 * and stores the URLs on the submission.
 * Body: { projectId: number, submissionId: string }
 */

export async function GET(req: NextRequest) {
  try {
    const projectId = parseInt(req.nextUrl.searchParams.get("projectId") || "0", 10);
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const files = await fetchSchDesignAttachments(projectId);
    return NextResponse.json({ files });
  } catch (e: any) {
    console.error("[design-cad] GET error:", e);
    return NextResponse.json({ error: e?.message || "Failed to fetch design files" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, submissionId } = body ?? {};

    if (!projectId || !submissionId) {
      return NextResponse.json({ error: "projectId and submissionId are required" }, { status: 400 });
    }

    // 1. Fetch design attachment list from SCH
    const designFiles = await fetchSchDesignAttachments(projectId);
    if (designFiles.length === 0) {
      // No design files available — store empty array
      await prisma.photopackSubmission.update({
        where: { id: submissionId },
        data: { designCadFiles: [] as any },
      });
      return NextResponse.json({ files: [], message: "No Design CAD files found for this project. Design may not be completed yet." });
    }

    const storedFiles: DesignCadFile[] = [];

    // 2. Download each design file from SCH CDN and re-upload to Blob storage
    for (const file of designFiles) {
      try {
        if (!file.cdnUrl) continue;

        console.log(`[design-cad] Downloading: ${file.fileName} from ${file.cdnUrl.slice(0, 80)}...`);
        const { buffer, contentType } = await downloadSchFile(file.cdnUrl);

        const safeFileName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
        const blobPath = `design-cad/${projectId}/${Date.now()}_${safeFileName}`;

        const { url: publicUrl } = await uploadBufferToBlob(blobPath, buffer, contentType);

        storedFiles.push({
          ...file,
          storedUrl: publicUrl,
          fileSize: buffer.length,
        });

        console.log(`[design-cad] Stored: ${safeFileName} → ${publicUrl.slice(0, 80)}...`);
      } catch (fileErr: any) {
        console.log(`[design-cad] Skipped/store ${file.fileName}:`, fileErr?.message);
        // Still include file info without storedUrl so we know it exists
        storedFiles.push({ ...file });
      }
    }

    // 3. Store design file URLs on the submission
    await prisma.photopackSubmission.update({
      where: { id: submissionId },
      data: { designCadFiles: JSON.parse(JSON.stringify(storedFiles)) },
    });

    return NextResponse.json({
      files: storedFiles,
      stored: storedFiles.filter((f) => f.storedUrl).length,
      total: storedFiles.length,
    });
  } catch (e: any) {
    console.error("[design-cad] POST error:", e);
    return NextResponse.json({ error: e?.message || "Failed to fetch/store design files" }, { status: 500 });
  }
}
