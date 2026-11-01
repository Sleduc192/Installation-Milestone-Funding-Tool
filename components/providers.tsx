"use client";

import { SessionProvider } from "next-auth/react";
import { basePath } from "@/lib/base-path";
import { installBasePathFetch } from "@/lib/install-base-path-fetch";

installBasePathFetch();

export function Providers({ children }: { children: React.ReactNode }) {
  const prefix = basePath();
  return <SessionProvider basePath={prefix ? `${prefix}/api/auth` : undefined}>{children}</SessionProvider>;
}
