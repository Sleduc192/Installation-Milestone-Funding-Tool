"use client";

import { withBasePath } from "@/lib/base-path";

/**
 * Next.js prefixes <Link> and router calls with basePath, but not fetch().
 * API calls in this app are root-relative (`/api/...`), so under /funding they
 * must be rewritten or they hit the hub instead of this app.
 */
export function installBasePathFetch(): void {
  if (typeof window === "undefined") return;
  const marked = window as Window & { __fundingBasePathFetch?: boolean };
  if (marked.__fundingBasePathFetch) return;

  const original = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    if (typeof input === "string") return original(withBasePath(input), init);
    if (input instanceof URL && input.origin === window.location.origin) {
      const next = new URL(input.href);
      next.pathname = withBasePath(input.pathname);
      return original(next, init);
    }
    return original(input, init);
  };
  marked.__fundingBasePathFetch = true;
}
