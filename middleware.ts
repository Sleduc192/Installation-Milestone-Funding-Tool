import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { stripBasePath, withBasePath } from "@/lib/base-path";
import { HUB_TRUST_HEADER, inspectHubTrust } from "@/lib/hub-trust";
import { publicUrl } from "@/lib/public-url";

/**
 * Login wall for the standalone site, plus hub trust.
 * A request rewritten by the Seamless Home Hub carries `x-hub-trust`. When
 * that token verifies, the visitor is let in without the funding-tool login.
 * Direct visits still need a NextAuth session.
 *
 * The matcher must include "/" . With basePath `/funding`, Next prefixes
 * matchers, and a pattern that starts with `/(` does not match the bare
 * `/funding` URL. That path then skipped this check entirely.
 */
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/signup", "/api/admin/bootstrap"];

function redirectTo(path: string): URL {
  return new URL(publicUrl(withBasePath(path.startsWith("/") ? path : `/${path}`)));
}

function redirectResponse(url: URL): NextResponse {
  // Set Location ourselves. NextResponse.redirect is still used so the status
  // is a real redirect, and the URL already contains /funding.
  const response = NextResponse.redirect(url);
  response.headers.set("Location", url.toString());
  return response;
}

export async function middleware(req: NextRequest) {
  const pathname = stripBasePath(req.nextUrl.pathname);
  const isApi = pathname.startsWith("/api/");
  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicApi) return NextResponse.next();

  const trust = await inspectHubTrust(req.headers.get(HUB_TRUST_HEADER));
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  const authed = Boolean(token) || Boolean(trust.user);

  if (!trust.user && trust.reason !== "no-header") {
    console.warn(`[hub-trust] rejected (${trust.reason})`);
  }

  if (pathname === "/login") {
    return authed ? redirectResponse(redirectTo("/dashboard")) : NextResponse.next();
  }

  if (!authed) {
    if (trust.reason === "no-header" && process.env.NEXT_PUBLIC_BASE_PATH) {
      console.warn("[hub-trust] no x-hub-trust header on an unauthenticated request");
    }
    if (isApi) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const loginUrl = redirectTo("/login");
    loginUrl.searchParams.set("callbackUrl", withBasePath(pathname || "/"));
    return redirectResponse(loginUrl);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (token && (token as { role?: string }).role !== "admin" && !trust.user) {
      return isApi
        ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
        : redirectResponse(redirectTo("/dashboard"));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
