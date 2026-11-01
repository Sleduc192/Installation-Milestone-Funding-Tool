/**
 * Seamless Home Hub trust token.
 *
 * The hub signs the signed-in Google user on every rewritten request so this
 * app can skip its own login wall. Paste the same secret into HUB_TRUST_SECRET
 * on both projects. Do not commit the value.
 *
 * Header: `x-hub-trust`
 * Value:  `v1.` + base64url(json) + `.` + base64url(HMAC-SHA256(secret, "v1." + base64url(json)))
 * JSON:    {"email":"<email>","name":"<name>","exp":<unix seconds>}
 * `exp` is a short lifetime (the hub should use about 60 seconds). This app
 * accepts a token that is not yet expired, with 60 seconds of clock skew, and
 * rejects one whose expiry is more than 5 minutes in the future.
 *
 * Deployment Protection is not checked here. On the funding project, create a
 * Protection Bypass for Automation secret (Vercel sets
 * VERCEL_AUTOMATION_BYPASS_SECRET). The hub sends that value as
 * `x-vercel-protection-bypass` when it rewrites to this app.
 */

export const HUB_TRUST_HEADER = "x-hub-trust";

const MAX_SKEW_SECONDS = 60;
const MAX_TTL_SECONDS = 5 * 60;

export interface HubUser {
  email: string;
  name: string;
}

export async function signHubTrust(
  user: HubUser,
  exp: number,
  secret: string
): Promise<string> {
  const key = secret.trim();
  const payload = JSON.stringify({
    email: user.email,
    name: user.name,
    exp,
  });
  const payloadPart = base64UrlEncode(new TextEncoder().encode(payload));
  const signed = `v1.${payloadPart}`;
  const mac = await hmacSha256(key, signed);
  return `${signed}.${base64UrlEncode(mac)}`;
}

export type HubTrustReason =
  | "ok"
  | "no-secret"
  | "no-header"
  | "malformed"
  | "bad-signature"
  | "expired"
  | "bad-claims";

/**
 * Same check as readHubTrust, plus a reason safe to log.
 * The reason never includes the token or the secret.
 */
export async function inspectHubTrust(
  headerValue: string | null | undefined,
  opts?: { secret?: string; now?: number }
): Promise<{ user: HubUser | null; reason: HubTrustReason }> {
  // Dynamic lookup so the bundler does not inline a missing build-time value.
  const fromEnv = process.env["HUB_TRUST_SECRET"];
  const secret = (opts?.secret ?? fromEnv ?? "").trim();
  if (!secret) return { user: null, reason: "no-secret" };
  if (!headerValue) return { user: null, reason: "no-header" };

  const match = headerValue.trim().match(/^v1\.([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!match) return { user: null, reason: "malformed" };

  let provided: Uint8Array;
  let payloadRaw: string;
  try {
    provided = base64UrlDecode(match[2]);
    payloadRaw = new TextDecoder().decode(base64UrlDecode(match[1]));
  } catch {
    return { user: null, reason: "malformed" };
  }

  const signed = `v1.${match[1]}`;
  const macSigned = await hmacSha256(secret, signed);
  const macPayload = await hmacSha256(secret, payloadRaw);
  const signatureOk =
    fixedTimeEqual(macSigned, provided) ||
    fixedTimeEqual(macPayload, provided) ||
    hexEquals(macSigned, match[2]) ||
    hexEquals(macPayload, match[2]);
  if (!signatureOk) return { user: null, reason: "bad-signature" };

  let parsed: { email?: unknown; name?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(payloadRaw);
  } catch {
    return { user: null, reason: "bad-claims" };
  }

  if (typeof parsed.email !== "string" || (typeof parsed.name !== "string" && parsed.name != null)) {
    return { user: null, reason: "bad-claims" };
  }
  let exp = typeof parsed.exp === "number" ? parsed.exp : Number(parsed.exp);
  if (!Number.isFinite(exp)) return { user: null, reason: "bad-claims" };
  // Some signers pass Date.now() milliseconds instead of unix seconds.
  if (exp > 10_000_000_000) exp = Math.floor(exp / 1000);

  const email = parsed.email.trim();
  const name = (typeof parsed.name === "string" ? parsed.name : "").trim();
  if (!isEmail(email) || email.length > 320 || name.length > 200) return { user: null, reason: "bad-claims" };
  if (/[\u0000-\u001f]/.test(name)) return { user: null, reason: "bad-claims" };

  const nowSeconds = Math.floor((opts?.now ?? Date.now()) / 1000);
  if (exp < nowSeconds - MAX_SKEW_SECONDS) return { user: null, reason: "expired" };
  if (exp > nowSeconds + MAX_TTL_SECONDS) return { user: null, reason: "expired" };

  return { user: { email, name }, reason: "ok" };
}

export async function readHubTrust(
  headerValue: string | null | undefined,
  opts?: { secret?: string; now?: number }
): Promise<HubUser | null> {
  const result = await inspectHubTrust(headerValue, opts);
  return result.user;
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function hmacSha256(secret: string, data: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const buf = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(buf);
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid base64url");
  const padded = value + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

function fixedTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function hexEquals(mac: Uint8Array, presented: string): boolean {
  if (!/^[0-9a-fA-F]+$/.test(presented) || presented.length !== mac.length * 2) return false;
  const bytes = new Uint8Array(mac.length);
  for (let i = 0; i < mac.length; i++) bytes[i] = Number.parseInt(presented.slice(i * 2, i * 2 + 2), 16);
  return fixedTimeEqual(mac, bytes);
}
