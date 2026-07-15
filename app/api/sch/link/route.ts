export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { fetchSchEquipment, fetchSchDesignAttachments, downloadSchFile, DesignCadFile } from "@/lib/scrhub";
import { uploadBufferToBlob } from "@/lib/blob-storage";

/** Link an SCH project to a submission and fetch equipment data + Design CAD files */
export async function POST(req: NextRequest) {
  try {
    const { submissionId, schProjectId } = await req.json();
    if (!submissionId || !schProjectId) {
      return NextResponse.json({ error: "submissionId and schProjectId required" }, { status: 400 });
    }

    const equipment = await fetchSchEquipment(schProjectId);

    // Also fetch Design CAD files (non-blocking)
    let designCadFiles: DesignCadFile[] = [];
    try {
      const rawFiles = await fetchSchDesignAttachments(schProjectId);
      if (rawFiles.length > 0) {
        for (const file of rawFiles) {
          try {
            if (!file.cdnUrl) continue;
            const { buffer, contentType } = await downloadSchFile(file.cdnUrl);
            const safeFileName = file.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
            const blobPath = `design-cad/${schProjectId}/${Date.now()}_${safeFileName}`;
            const { url: publicUrl } = await uploadBufferToBlob(blobPath, buffer, contentType);
            designCadFiles.push({ ...file, storedUrl: publicUrl, fileSize: buffer.length });
            console.log(`[link] Stored design file: ${safeFileName}`);
          } catch (fileErr: any) {
            console.log(`[link] Skipped design file for ${file.fileName}:`, fileErr?.message);
            designCadFiles.push({ ...file });
          }
        }
      }
    } catch (cadErr) {
      console.log("[link] Design CAD fetch skipped");
    }

    const updated = await prisma.photopackSubmission.update({
      where: { id: submissionId },
      data: {
        schProjectId,
        soldEquipment: equipment as any,
        designCadFiles: designCadFiles.length > 0 ? JSON.parse(JSON.stringify(designCadFiles)) : undefined,
      },
    });

    return NextResponse.json({ success: true, equipment, designCadFiles, submissionId: updated.id });
  } catch (e: any) {
    console.error("SCH link error:", e);
    return NextResponse.json({ error: e?.message || "Link failed" }, { status: 500 });
  }
}
