export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspaceUser } from "@/lib/workspace-auth";
import { extractInstallationId, fetchPhotopack, findSchProjectByUuid, fetchSchEquipment, fetchSchDesignAttachments, downloadSchFile, DesignCadFile } from "@/lib/scrhub";
import { uploadBufferToBlob } from "@/lib/blob-storage";
import { analyzePhoto, updateSubmissionAggregates } from "@/lib/analyze-photo";

export async function POST(req: NextRequest) {
  try {
    const user = await getWorkspaceUser();

    const body = await req.json();
    const { url, milestoneType } = body ?? {};
    const id = extractInstallationId(url || "");
    if (!id) return NextResponse.json({ error: "Invalid photopack URL or ID" }, { status: 400 });

    const { design, labels, attachments } = await fetchPhotopack(id);
    if (!attachments || attachments.length === 0) {
      return NextResponse.json({ error: "No photos found for that photopack. Check the URL." }, { status: 404 });
    }

    const customerName = design?.customer_details?.name ?? "Unknown Customer";
    const customerAddress = design?.customer_details?.address ?? "";

    const expectedCategories = (labels ?? []).map((l: any) => ({
      name: l?.name,
      description: l?.description,
      is_required: !!l?.is_required,
      is_required_solar: !!l?.is_required_solar,
      is_required_battery: !!l?.is_required_battery,
      is_required_solar_and_battery: !!l?.is_required_solar_and_battery,
      sort_order: l?.sort_order ?? 999,
    }));

    // Try to auto-fetch equipment data from SCH (non-blocking)
    let schProjectId: number | null = null;
    let soldEquipment: any = null;
    try {
      schProjectId = await findSchProjectByUuid(id);
      if (schProjectId) {
        soldEquipment = await fetchSchEquipment(schProjectId);
        console.log(`[ingest] Auto-linked SCH project #${schProjectId} — ${soldEquipment?.panel?.name ?? "?"} / ${soldEquipment?.inverter?.name ?? "?"}`);
      }
    } catch (equipErr) {
      console.warn("[ingest] Equipment auto-fetch failed (non-blocking):", equipErr);
    }

    // Try to auto-fetch Design CAD files (non-blocking)
    let designCadFiles: DesignCadFile[] = [];
    if (schProjectId) {
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
              console.log(`[ingest] Stored design file: ${safeFileName}`);
            } catch (fileErr: any) {
              console.log(`[ingest] Skipped design file for ${file.fileName}:`, fileErr?.message);
              designCadFiles.push({ ...file });
            }
          }
          console.log(`[ingest] Fetched ${designCadFiles.length} Design CAD files for project #${schProjectId}`);
        }
      } catch (cadErr) {
        console.log("[ingest] Design CAD fetch skipped");
      }
    }

    const submission = await prisma.photopackSubmission.create({
      data: {
        customerName,
        installerName: customerAddress || "Auto-Ingested",
        milestoneType: milestoneType || "Install",
        status: "analyzing",
        userId: user.id,
        sourceUrl: url,
        externalId: id,
        expectedCategories,
        schProjectId,
        soldEquipment: soldEquipment ?? undefined,
        designCadFiles: designCadFiles.length > 0 ? JSON.parse(JSON.stringify(designCadFiles)) : undefined,
        categoriesRequired: expectedCategories.filter((c: any) => c.is_required).length,
        totalPhotos: attachments.length,
      },
    });

    // Create SubmissionPhoto rows
    const photoRows = await Promise.all(
      (attachments as any[]).map((a: any) =>
        prisma.submissionPhoto.create({
          data: {
            submissionId: submission.id,
            cloudStoragePath: a?.url ?? "",
            isPublic: true,
            originalName: (a?.file ?? "").split("/").pop() ?? `photo_${a?.id}`,
            sourcePhotoUrl: a?.url ?? null,
            expectedLabel: a?.label ?? "Unknown",
            category: a?.label ?? "Unknown",
            subcategory: "General",
          },
        })
      )
    );

    // Run AI analysis directly (no HTTP calls, no session needed)
    // Fire-and-forget — response returns immediately with submission ID
    // Process photos in parallel batches for faster analysis
    const ms = milestoneType || "Install";
    const BATCH_SIZE = 10;
    (async () => {
      for (let i = 0; i < photoRows.length; i += BATCH_SIZE) {
        const batch = photoRows.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(
          batch.map(async (p) => {
            try {
              const labelDesc = expectedCategories.find((c: any) => c.name === p.expectedLabel)?.description;
              await analyzePhoto({
                photoId: p.id,
                submissionId: submission.id,
                imageUrl: p.sourcePhotoUrl || p.cloudStoragePath,
                category: p.expectedLabel || p.category,
                subcategory: "General",
                milestoneType: ms,
                expectedLabel: p.expectedLabel || undefined,
                labelDescription: labelDesc,
              });
            } catch (e) {
              console.error("Analyze error for photo", p.id, e);
            }
          })
        );
      }
      await updateSubmissionAggregates(submission.id, expectedCategories);
    })();

    return NextResponse.json({
      submissionId: submission.id,
      photoCount: photoRows.length,
      requiredCount: expectedCategories.filter((c: any) => c.is_required).length,
      customerName,
    });
  } catch (e: any) {
    console.error("Ingest error:", e);
    return NextResponse.json({ error: e?.message || "Ingest failed" }, { status: 500 });
  }
}
