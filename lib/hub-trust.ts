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
  const payload = JSON.stringify({
    email: user.email,
    name: user.name,
    exp,
  });
  const payloadPart = base64UrlEncode(new TextEncoder().encode(payload));
  const signed = `v1.${payloadPart}`;
  const mac = await hmacSha256(secret, signed);
  return `${signed}.${base64UrlEncode(mac)}`;
}

export async function readHubTrust(
  headerValue: string | null | undefined,
  opts?: { secret?: string; now?: number }
): Promise<HubUser | null> {
  const secret = opts?.secret ?? process.env.HUB_TRUST_SECRET;
  if (!secret || !headerValue) return null;

  const parts = headerValue.split(".");
  if (parts.length !== 3 || parts[0] !== "v1" || !parts[1] || !parts[2]) return null;

  const signed = `v1.${parts[1]}`;
  let provided: Uint8Array;
  let payloadRaw: string;
  try {
    provided = base64UrlDecode(parts[2]);
    payloadRaw = new TextDecoder().decode(base64UrlDecode(parts[1]));
  } catch {
    return null;
  }

  const expected = await hmacSha256(secret, signed);
  if (!fixedTimeEqual(expected, provided)) return null;

  let parsed: { email?: unknown; name?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(payloadRaw);
  } catch {
    return null;
  }

  if (typeof parsed.email !== "string" || typeof parsed.name !== "string") return null;
  if (typeof parsed.exp !== "number" || !Number.isFinite(parsed.exp)) return null;

  const email = parsed.email.trim();
  const name = parsed.name.trim();
  if (!isEmail(email) || email.length > 320 || name.length > 200) return null;
  if (/[\u0000-\u001f]/.test(name)) return null;

  const nowSeconds = Math.floor((opts?.now ?? Date.now()) / 1000);
  if (parsed.exp < nowSeconds - MAX_SKEW_SECONDS) return null;
  if (parsed.exp > nowSeconds + MAX_TTL_SECONDS) return null;

  return { email, name };
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
