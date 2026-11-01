import { basePath } from "@/lib/base-path";

/**
 * Absolute URL for redirects and OAuth callbacks.
 * NEXTAUTH_URL is the public origin and, when mounted in the hub, includes
 * the base path (https://seamless-hub-pi.vercel.app/funding).
 */
export function publicUrl(path: string): string {
  const configured = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const url = new URL(configured);
  // NextAuth treats a non-root NEXTAUTH_URL path as its own base path.
  // When this app is mounted, that value is `/funding/api/auth`. Page URLs
  // live under `/funding`, so drop the auth suffix before joining.
  let configuredPath = url.pathname.replace(/\/$/, "");
  if (configuredPath.endsWith("/api/auth")) {
    configuredPath = configuredPath.slice(0, -"/api/auth".length);
  }
  const prefix = configuredPath || basePath();
  let p = path.startsWith("/") ? path : `/${path}`;
  if (p === "/") p = "";
  if (prefix && (p === prefix || p.startsWith(`${prefix}/`))) {
    return `${url.origin}${p || prefix}`;
  }
  if (!p) return `${url.origin}${prefix}/`;
  return `${url.origin}${prefix}${p}`;
}
