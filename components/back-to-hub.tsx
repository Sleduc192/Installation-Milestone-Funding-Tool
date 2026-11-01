import { headers } from "next/headers";
import { basePath } from "@/lib/base-path";
import { HUB_TRUST_HEADER, readHubTrust } from "@/lib/hub-trust";

/**
 * Shown when this deployment is mounted under the hub, or when the current
 * request carried a valid hub trust token. The link is a plain anchor so the
 * browser leaves this app's basePath and loads the hub root.
 */
export async function BackToHub() {
  const mounted = Boolean(basePath());
  const trusted = await readHubTrust(headers().get(HUB_TRUST_HEADER));
  if (!mounted && !trusted) return null;

  return (
    <div
      className="sticky top-0 z-50 flex items-center gap-3 px-4 py-2 sm:px-6"
      style={{ backgroundColor: "#013384" }}
    >
      {/* Hub root is outside this app. A Next Link would prefix basePath and miss the hub. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a
        href="/"
        className="inline-flex items-center rounded-md px-3 py-1.5 text-sm font-semibold text-white shadow-sm"
        style={{ backgroundColor: "#026ED9" }}
      >
        Back to Hub
      </a>
      <span className="text-sm text-white/80">Seamless Home</span>
    </div>
  );
}
