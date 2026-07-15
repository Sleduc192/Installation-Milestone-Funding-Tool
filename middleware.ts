import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Real access control for the standalone deployment.
 * (The original Abacus-hosted version had no login wall — anyone proxied
 * through the SubcontractorHub workspace was let in automatically. Now that
 * this is a public site, every page and API route requires a signed-in
 * session, except the login/signup/auth endpoints themselves.)
 */
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/signup", "/api/admin/bootstrap"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api/");
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => pathname.startsWith(p));

  if (isPublicApi) return NextResponse.next();

  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  if (pathname === "/login") {
    return token ? NextResponse.redirect(new URL("/dashboard", req.url)) : NextResponse.next();
  }

  if (!token) {
    if (isApi) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith("/admin") && (token as any).role !== "admin") {
    return isApi
      ? NextResponse.json({ error: "Forbidden" }, { status: 403 })
      : NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Everything except static assets and Next internals.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
