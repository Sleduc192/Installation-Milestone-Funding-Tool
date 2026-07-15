// Vercel Blob storage helpers — replaces the old AWS S3 layer.
// All stored paths are the full public Vercel Blob URL, so no separate
// "resolve path -> URL" step is needed (see app/api/file-url/route.ts).

import { put, del } from "@vercel/blob";

/**
 * Server-side upload of an already-fetched file (e.g. photos pulled from
 * Google Drive or a SubcontractorHub photopack). Returns the public URL,
 * which is stored directly as `cloudStoragePath`.
 */
export async function uploadBufferToBlob(
  pathname: string,
  data: Buffer | Uint8Array | ArrayBuffer,
  contentType?: string
): Promise<{ url: string }> {
  const blob = await put(pathname, data as any, {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return { url: blob.url };
}

export async function deleteBlob(url: string) {
  try {
    await del(url);
  } catch (e: any) {
    console.error("Blob delete error:", e?.message);
  }
}
