export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Client-side direct-to-Blob upload handshake.
// The browser calls @vercel/blob/client's upload(), which POSTs here twice:
// once to get a short-lived client token, then (after the upload completes)
// to report completion. The actual file bytes never pass through this route
// or any other serverless function — they go straight from the browser to
// Vercel Blob storage, so there's no request-body size limit to worry about.
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {
        // no-op: the client registers the photo against the submission itself
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Upload authorization failed" }, { status: 400 });
  }
}
