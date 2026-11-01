import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { stripBasePath } from "@/lib/base-path";
import { HUB_TRUST_HEADER, readHubTrust } from "@/lib/hub-trust";
import { publicUrl } from "@/lib/public-url";

/**
 * Login wall for the standalone site, plus hub trust.
 * A request rewritten by the Seamless Home Hub carries `x-hub-trust`. When
 * that token verifies, the visitor is let in without the funding-tool login.
 * Direct visits still need a NextAuth session.
 * /admin pages for hub visitors are checked again in the admin layout, because
 * the hub token does not include this app's role.
 */
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/signup", "/api/admin/bootstrap"];

function redirectTo(path: string, req: NextRequest): URL {
  if (process.env.NEXTAUTH_URL) return new URL(publicUrl(path));
  const url = req.nextUrl.clone();
  const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  url.pathname =
    base && normalized !== base && !normalized.startsWith(`${base}/`) ? `${base}${normalized}` : normalized;
  url.search = "";
  return url;
}

export async function middleware(req: NextRequest) {
  const pathname = stripBasePath(req.nextUrl.pathname);
  const isApi = pathname.startsWith("/api/");
  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicApi) return NextResponse.next();

  const [token, hubUser] = await Promise.all([
    getToken({ req, secret: process.env.NEXTAUTH_SECRET }),
    readHubTrust(req.headers.get(HUB_TRUST_HEADER)),
  ]);
  const authed = Boolean(token) || Boolean(hubUser);

  if (pathname === "/login") {
    return authed ? NextResponse.redirect(redirectTo("/dashboard", req)) : NextResponse.next();
  }

  if (!authed) {
    if (isApi) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const loginUrl = redirectTo("/login", req);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (token && (token as { role?: string }).role !== "admin" && !hubUser) {
      return isApi
        ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
        : NextResponse.redirect(redirectTo("/dashboard", req));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
