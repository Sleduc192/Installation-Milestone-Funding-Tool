/**
 * Path prefix for serving this app through the Seamless Home Hub.
 * Set NEXT_PUBLIC_BASE_PATH=/funding on the Vercel project and redeploy.
 * Leave it unset for the standalone deployment, which stays at the domain root.
 */
export function basePath(): string {
  return (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
}

export function withBasePath(path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) return path;
  const base = basePath();
  if (!base || path === base || path.startsWith(`${base}/`)) return path;
  if (path === "/") return base;
  return `${base}${path}`;
}

/** pathname from Next may or may not already include the base path. */
export function stripBasePath(pathname: string): string {
  const base = basePath();
  if (!base) return pathname || "/";
  if (pathname === base) return "/";
  if (pathname.startsWith(`${base}/`)) return pathname.slice(base.length) || "/";
  return pathname || "/";
}
