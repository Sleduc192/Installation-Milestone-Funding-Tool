export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/gdrive";

export async function GET(req: NextRequest) {
  try {
    const redirectUri = process.env.GDRIVE_REDIRECT_URI
      || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/gdrive/callback`;
    console.log("[gdrive-auth] GDRIVE_REDIRECT_URI env:", process.env.GDRIVE_REDIRECT_URI);
    console.log("[gdrive-auth] NEXTAUTH_URL env:", process.env.NEXTAUTH_URL);
    console.log("[gdrive-auth] Final redirectUri:", redirectUri);
    const authUrl = buildAuthUrl(redirectUri);
    console.log("[gdrive-auth] authUrl:", authUrl);
    return NextResponse.json({ authUrl });
  } catch (e: any) {
    console.error("[gdrive-auth] error:", e);
    return NextResponse.json({ error: e?.message || "Failed to build auth URL" }, { status: 500 });
  }
}
