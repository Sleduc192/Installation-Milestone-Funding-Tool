export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getWorkspaceUser } from "@/lib/workspace-auth";
import { extractFolderId, listAllImages, downloadFile, getFolderName } from "@/lib/gdrive";
import { uploadBufferToBlob } from "@/lib/blob-storage";
import { analyzePhoto, updateSubmissionAggregates } from "@/lib/analyze-photo";
import { LR_PHOTOPACK_BUCKETS } from "@/lib/lr-photopack-mapping";

/**
 * Try to map a Google Drive subfolder name to the closest SCH / LR label.
 * SCH labels look like: "Roof Overview", "IQ Combiner Interior", "Main Panel Breaker", etc.
 * GDrive subfolders might be: "R1", "R2_Rail_EGC", "Electrical", "Roof Mount", "PS4", etc.
 * We try matching by LR code (R1, E1, PS4) first, then by keyword matching.
 */
function mapFolderToLabel(folderName: string): { label: string; description: string } | null {
  if (!folderName) return null;
  const norm = folderName.trim();
  const upper = norm.toUpperCase().replace(/[\s_-]+/g, "");

  // 1) Direct LR code match (e.g. "R1", "E4", "PS5", "SC1")
  for (const bucket of LR_PHOTOPACK_BUCKETS) {
    for (const sub of bucket.subCategories) {
      const code = sub.lrCode.toUpperCase().replace(/[\s_-]+/g, "");
      if (upper === code || upper.startsWith(code + "_") || upper.startsWith(code + "-")) {
        return { label: sub.lrLabel, description: sub.lrRequirements };
      }
    }
  }

  // 2) Keyword matching against lrLabel
  const lowerNorm = norm.toLowerCase().replace(/[_-]+/g, " ");
  for (const bucket of LR_PHOTOPACK_BUCKETS) {
    for (const sub of bucket.subCategories) {
      const labelLower = sub.lrLabel.toLowerCase();
      // Check if the folder name contains significant keywords from the label
      if (lowerNorm.includes(labelLower) || labelLower.includes(lowerNorm)) {
        return { label: sub.lrLabel, description: sub.lrRequirements };
      }
    }
  }

  // 3) Partial keyword matching for common terms
  const keywordMap: Record<string, string> = {
    "attachment": "R1", "flashing": "R1", "sealant": "R1",
    "rail": "R2", "egc": "R2", "optimizer": "R2", "microinverter": "R2", "wire management": "R2",
    "complete array": "R3", "array": "R3", "pullback": "R3",
    "under array": "R4", "under panel": "R4",
    "tilt": "R5", "angle": "R5",
    "junction": "R6", "j-box": "R6", "jbox": "R6",
    "inverter": "E1", "combiner": "E1", "iq combiner": "E1",
    "disconnect": "E2", "ac disconnect": "E2",
    "main panel": "E3", "breaker": "E3", "electrical panel": "E3",
    "interconnection": "E4", "ipc": "E4", "poi": "E4",
    "bos": "E5", "balance of system": "E5",
    "production ct": "E6", "production meter": "E6",
    "consumption ct": "E7", "consumption meter": "E7", "ct": "E7",
    "conduit": "E8",
    "rapid shutdown": "E9", "rsd": "E9",
    "module label": "PS4", "panel label": "PS4", "module serial": "PS5",
    "serial": "PS5", "serial number": "PS5",
    "sticker sheet": "PS8", "string diagram": "PS8", "sticker map": "PS8",
    "site damage": "PS6", "pre-existing": "PS6",
    "monitoring": "SC1", "commissioning": "SC1",
    "battery": "S1", "storage": "S1", "powerwall": "S1",
    "gateway": "S5", "transfer switch": "S6",
    "mci": "PS3",
    "roof": "R3", "electrical": "E3", "site": "PS4",
  };

  for (const [keyword, code] of Object.entries(keywordMap)) {
    if (lowerNorm.includes(keyword)) {
      for (const bucket of LR_PHOTOPACK_BUCKETS) {
        for (const sub of bucket.subCategories) {
          if (sub.lrCode === code) {
            return { label: sub.lrLabel, description: sub.lrRequirements };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Build expectedCategories array from LR_PHOTOPACK_BUCKETS (matches SubHub label format)
 */
function buildExpectedCategories(milestoneType: string) {
  const STORAGE_CODES = new Set(["S1", "S2", "S3", "S5", "S6"]);
  const cats: any[] = [];
  for (const bucket of LR_PHOTOPACK_BUCKETS) {
    for (const sub of bucket.subCategories) {
      const isStorage = STORAGE_CODES.has(sub.lrCode);
      cats.push({
        name: sub.lrLabel,
        description: sub.lrRequirements,
        is_required: !sub.isConditional,
        is_required_solar: !sub.isConditional && !isStorage,
        is_required_battery: isStorage,
        is_required_solar_and_battery: isStorage,
        sort_order: cats.length,
      });
    }
  }
  return cats;
}

/**
 * Background worker: downloads images from GDrive, uploads to S3,
 * creates photo records, then runs AI analysis.
 * Uses a high-concurrency PIPELINE approach:
 * - Downloads 10 photos at a time from GDrive→S3
 * - Runs 2 parallel AI analysis workers, each processing 5 photos concurrently
 * - Analysis starts immediately as downloads complete (no waiting)
 * - Total effective AI concurrency: 10 photos analyzed simultaneously
 */
async function processGdriveImport(
  submissionId: string,
  images: { id: string; name: string; mimeType: string; folderName?: string }[],
  milestoneType: string,
  expectedCategories: any[]
) {
  const DOWNLOAD_BATCH = 10;
  const ANALYZE_BATCH = 5; // per worker
  const NUM_WORKERS = 2;   // 2 workers × 5 = 10 concurrent analyses
  const photoRows: any[] = [];

  // Thread-safe queue for analysis
  const analyzeQueue: any[] = [];
  let downloadsDone = false;
  let analyzedCount = 0;

  // Analysis worker — each worker pulls batches from the shared queue
  const createAnalyzeWorker = (workerId: number) => async () => {
    while (true) {
      const batch: any[] = analyzeQueue.splice(0, ANALYZE_BATCH);
      if (batch.length === 0) {
        if (downloadsDone && analyzeQueue.length === 0) break;
        await new Promise((r) => setTimeout(r, 300));
        continue;
      }
      await Promise.allSettled(
        batch.map(async (p: any) => {
          try {
            const labelDesc = p._labelDesc
              || expectedCategories.find((c: any) => c.name === p.expectedLabel)?.description;
            await analyzePhoto({
              photoId: p.id,
              submissionId,
              imageUrl: p.sourcePhotoUrl || p.cloudStoragePath,
              category: p.expectedLabel || p.category,
              subcategory: "General",
              milestoneType,
              expectedLabel: p.expectedLabel || undefined,
              labelDescription: labelDesc,
            });
          } catch (e) {
            console.error(`[gdrive-w${workerId}] analyze error for photo`, p.id, e);
          }
        })
      );
      analyzedCount += batch.length;
      await prisma.photopackSubmission.update({
        where: { id: submissionId },
        data: { categoriesComplete: analyzedCount },
      }).catch(() => {});
    }
  };

  try {
    // Start multiple AI analysis workers in parallel with downloads
    const workerPromises = Array.from({ length: NUM_WORKERS }, (_, i) => createAnalyzeWorker(i)());

    // Download phase — download in larger batches and feed into analyze queue
    for (let i = 0; i < images.length; i += DOWNLOAD_BATCH) {
      const batch = images.slice(i, i + DOWNLOAD_BATCH);
      const results = await Promise.allSettled(
        batch.map(async (img) => {
          const { buffer, contentType } = await downloadFile(img.id);
          const safeName = img.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 200);
          const blobPath = `gdrive/${submissionId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${safeName}`;
          const { url: publicUrl } = await uploadBufferToBlob(blobPath, buffer, contentType);

          const mapped = mapFolderToLabel(img.folderName || "");
          const label = mapped?.label || img.folderName || "Others";
          const labelDesc = mapped?.description || "";

          const photo = await prisma.submissionPhoto.create({
            data: {
              submissionId,
              cloudStoragePath: publicUrl,
              isPublic: true,
              originalName: img.name,
              sourcePhotoUrl: publicUrl,
              expectedLabel: label,
              category: label,
              subcategory: "General",
            },
          });
          return { ...photo, _labelDesc: labelDesc };
        })
      );
      for (const r of results) {
        if (r.status === "fulfilled") {
          photoRows.push(r.value);
          analyzeQueue.push(r.value);
        }
      }
    }

    // All downloads done — signal workers
    downloadsDone = true;
    await prisma.photopackSubmission.update({
      where: { id: submissionId },
      data: { totalPhotos: photoRows.length, status: "analyzing" },
    }).catch(() => {});
    console.log(`[gdrive-bg] Downloaded ${photoRows.length}/${images.length} images for ${submissionId}`);

    // Wait for all analysis workers to finish
    await Promise.all(workerPromises);

    await updateSubmissionAggregates(submissionId, expectedCategories);
    console.log(`[gdrive-bg] AI analysis complete for ${submissionId}: ${analyzedCount} analyzed`);
  } catch (e: any) {
    console.error(`[gdrive-bg] FATAL error for ${submissionId}:`, e?.message);
    downloadsDone = true;
    await prisma.photopackSubmission.update({
      where: { id: submissionId },
      data: { status: "rejected", totalPhotos: photoRows.length },
    }).catch(() => {});
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("[gdrive-ingest] Starting ingest request");
    const user = await getWorkspaceUser();
    const body = await req.json();
    const { folderUrl, milestoneType, customerName: inputName } = body ?? {};
    console.log("[gdrive-ingest] folderUrl:", folderUrl, "milestone:", milestoneType);

    const folderId = extractFolderId(folderUrl || "");
    if (!folderId) {
      return NextResponse.json({ error: "Invalid Google Drive folder URL or ID" }, { status: 400 });
    }

    // Quick validation: get folder name and list images
    const folderName = await getFolderName(folderId);
    const customerName = inputName || folderName;
    const images = await listAllImages(folderId);
    console.log("[gdrive-ingest] Found", images.length, "images in", folderName);

    if (images.length === 0) {
      return NextResponse.json({ error: "No image files found in that folder. Make sure it contains photos." }, { status: 404 });
    }

    // Build expectedCategories from LR mapping (same structure as SubHub labels)
    const ms = milestoneType || "Install";
    const expectedCategories = buildExpectedCategories(ms);

    // Create submission with proper expectedCategories (matching SubHub flow)
    const submission = await prisma.photopackSubmission.create({
      data: {
        customerName,
        installerName: "Google Drive Import",
        milestoneType: ms,
        status: "importing",
        userId: user.id,
        sourceUrl: folderUrl,
        externalId: folderId,
        expectedCategories,
        categoriesRequired: expectedCategories.filter((c: any) => c.is_required).length,
        totalPhotos: images.length,
        categoriesComplete: 0,
      },
    });

    // Fire-and-forget: process in background
    processGdriveImport(submission.id, images, ms, expectedCategories).catch((e) =>
      console.error("[gdrive-bg] Unhandled:", e)
    );

    // Return immediately
    return NextResponse.json({
      submissionId: submission.id,
      photoCount: images.length,
      customerName,
      folderName,
    });
  } catch (e: any) {
    console.error("[gdrive-ingest] ERROR:", e?.message, e?.stack?.slice(0, 500));
    return NextResponse.json({ error: e?.message || "Google Drive ingest failed" }, { status: 500 });
  }
}
