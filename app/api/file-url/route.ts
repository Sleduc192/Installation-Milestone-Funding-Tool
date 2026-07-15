export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

// All photo paths are stored as full public URLs (Vercel Blob URLs, or the
// original external URL for anything ingested from Google Drive / a
// SubcontractorHub photopack), so resolving a "path" to a viewable URL is
// just a pass-through. Kept as its own route so the client code and the
// submission-detail component don't need to change.
export async function GET(req: NextRequest) {
  try {
    const path = req.nextUrl?.searchParams?.get("path");
    if (!path) return NextResponse.json({ error: "Path required" }, { status: 400 });

    if (/^https?:\/\//i.test(path)) {
      return NextResponse.json({ url: path });
    }

    return NextResponse.json({ error: "Unresolvable file path: " + path }, { status: 404 });
  } catch (error: any) {
    console.error("File URL error:", error);
    return NextResponse.json({ error: "Failed to get file URL" }, { status: 500 });
  }
}
