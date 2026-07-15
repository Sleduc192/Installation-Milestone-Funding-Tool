export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSchToken, downloadSchFile } from "@/lib/scrhub";
import { uploadBufferToBlob } from "@/lib/blob-storage";
import { PDFDocument } from "pdf-lib";

const API = "https://api.virtualsaleportal.com";

interface SiteSurveyAttachment {
  id: number;
  fileName: string;
  label: string;
  cdnUrl: string;
}

/**
 * Find the site survey PDF attachment for a given SCH project.
 */
async function findSiteSurveyAttachment(projectId: number): Promise<SiteSurveyAttachment | null> {
  const token = await getSchToken();
  const url = `${API}/api/projects/attachments/${projectId}?page=1&limit=200&sorting_col=updated_at&sorting_dir=desc`;
  const r = await fetch(url, {
    headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!r.ok) return null;

  const json = await r.json();
  const items: any[] = json?.data ?? [];

  // Find the site survey attachment
  const survey = items.find((item: any) => {
    const label = (item?.label ?? "").toLowerCase();
    const fname = (item?.file_name ?? "").toLowerCase();
    return (
      label.includes("site survey") ||
      label.includes("site_survey") ||
      fname.includes("site_survey") ||
      fname.includes("site survey") ||
      (fname.includes("site") && fname.endsWith(".pdf"))
    );
  });

  if (!survey) return null;

  return {
    id: survey.id,
    fileName: survey.file_name ?? "site_survey.pdf",
    label: survey.label ?? "Site Survey",
    cdnUrl: survey.url ?? "",
  };
}

/**
 * GET /api/sch/site-survey?schProjectId=52169
 * Downloads the site survey PDF from SCH, uploads to S3, returns public URL + page count.
 */
export async function GET(req: NextRequest) {
  try {
    const schProjectId = req.nextUrl.searchParams.get("schProjectId");
    if (!schProjectId) {
      return NextResponse.json({ error: "schProjectId required" }, { status: 400 });
    }

    const projectId = parseInt(schProjectId, 10);
    if (isNaN(projectId)) {
      return NextResponse.json({ error: "Invalid schProjectId" }, { status: 400 });
    }

    // 1. Find the site survey attachment
    const attachment = await findSiteSurveyAttachment(projectId);
    if (!attachment || !attachment.cdnUrl) {
      return NextResponse.json({ error: "No site survey PDF found for this project" }, { status: 404 });
    }

    // 2. Download the PDF from SCH CDN
    console.log(`[site-survey] Downloading PDF: ${attachment.fileName} (attachment ${attachment.id})`);
    const { buffer } = await downloadSchFile(attachment.cdnUrl);
    console.log(`[site-survey] Downloaded ${buffer.length} bytes`);

    // 3. Count pages using pdf-lib
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const pageCount = pdfDoc.getPageCount();
    console.log(`[site-survey] PDF has ${pageCount} pages`);

    // 4. Upload the full PDF to Blob storage as public
    const blobPath = `site-surveys/${projectId}-${Date.now()}.pdf`;
    const { url: pdfUrl } = await uploadBufferToBlob(blobPath, buffer, "application/pdf");
    console.log(`[site-survey] Uploaded to Blob storage: ${pdfUrl}`);

    return NextResponse.json({
      pdfUrl,
      pageCount,
      attachmentId: attachment.id,
      fileName: attachment.fileName,
    });
  } catch (error: any) {
    console.error("[site-survey] Error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to fetch site survey" }, { status: 500 });
  }
}

/**
 * POST /api/sch/site-survey
 * Import selected page images into a submission.
 * Body: { submissionId, photos: [{ cloudStoragePath, category, subcategory, expectedLabel, pageNumber }] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { submissionId, photos } = body;

    if (!submissionId || !photos?.length) {
      return NextResponse.json({ error: "submissionId and photos[] required" }, { status: 400 });
    }

    const results: any[] = [];

    for (const photo of photos) {
      const { cloudStoragePath, category, subcategory, expectedLabel, pageNumber } = photo;

      // Create the photo record
      const record = await prisma.submissionPhoto.create({
        data: {
          submissionId,
          cloudStoragePath,
          isPublic: true,
          originalName: `site_survey_page_${pageNumber ?? "unknown"}.jpg`,
          category: category ?? "General",
          subcategory: subcategory ?? "Standard_Photo",
          expectedLabel: expectedLabel ?? "",
          sourcePhotoUrl: `sch-site-survey://page-${pageNumber}`,
        },
      });

      results.push(record);
    }

    // Update total photo count
    const count = await prisma.submissionPhoto.count({ where: { submissionId } });
    await prisma.photopackSubmission.update({
      where: { id: submissionId },
      data: { totalPhotos: count },
    });

    return NextResponse.json({ imported: results.length, photos: results });
  } catch (error: any) {
    console.error("[site-survey] Import error:", error);
    return NextResponse.json({ error: error?.message ?? "Failed to import" }, { status: 500 });
  }
}
