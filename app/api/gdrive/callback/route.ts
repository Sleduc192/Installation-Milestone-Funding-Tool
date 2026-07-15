export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { exchangeCode, storeRefreshToken } from "@/lib/gdrive";

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      const error = req.nextUrl.searchParams.get("error") || "No authorization code";
      return new NextResponse(`<html><body><h2>Authorization Failed</h2><p>${error}</p><script>setTimeout(()=>window.close(),3000)</script></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    const redirectUri = process.env.GDRIVE_REDIRECT_URI
      || `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/gdrive/callback`;

    const tokens = await exchangeCode(code, redirectUri);
    if (tokens.refresh_token) {
      await storeRefreshToken(tokens.refresh_token);
    } else {
      return new NextResponse(`<html><body><h2>No refresh token received</h2><p>Try revoking app access at <a href="https://myaccount.google.com/permissions">Google permissions</a> and re-authorizing.</p><script>setTimeout(()=>window.close(),5000)</script></body></html>`, { headers: { "Content-Type": "text/html" } });
    }

    // Redirect back to the Google Drive import page
    const appOrigin = process.env.GDRIVE_REDIRECT_URI
      ? process.env.GDRIVE_REDIRECT_URI.replace(/\/api\/gdrive\/callback$/, "")
      : process.env.NEXTAUTH_URL || "http://localhost:3000";
    return NextResponse.redirect(`${appOrigin}/review-gdrive?connected=1`);
  } catch (e: any) {
    console.error("GDrive callback error:", e);
    return new NextResponse(`<html><body><h2>Error</h2><p>${e?.message}</p></body></html>`, { headers: { "Content-Type": "text/html" } });
  }
}
