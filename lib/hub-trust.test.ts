import assert from "node:assert/strict";
import test from "node:test";
import { inspectHubTrust, readHubTrust, signHubTrust } from "./hub-trust";

const secret = "test-hub-secret";
const now = Date.parse("2026-11-01T20:00:00Z");

test("a token signed with the shared secret is accepted", async () => {
  const exp = Math.floor(now / 1000) + 60;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "Ada Lovelace" }, exp, secret);
  const user = await readHubTrust(token, { secret, now });
  assert.deepEqual(user, { email: "ada@seamlesshome.com", name: "Ada Lovelace" });
});

test("tampering with the payload is rejected", async () => {
  const exp = Math.floor(now / 1000) + 60;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "Ada" }, exp, secret);
  const [version, payload, sig] = token.split(".");
  const flipped = payload.slice(0, -1) + (payload.endsWith("A") ? "B" : "A");
  const user = await readHubTrust(`${version}.${flipped}.${sig}`, { secret, now });
  assert.equal(user, null);
});

test("the wrong secret is rejected", async () => {
  const exp = Math.floor(now / 1000) + 60;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "Ada" }, exp, secret);
  assert.equal(await readHubTrust(token, { secret: "other", now }), null);
});

test("an expired token is rejected", async () => {
  const exp = Math.floor(now / 1000) - 120;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "Ada" }, exp, secret);
  assert.equal(await readHubTrust(token, { secret, now }), null);
});

test("a token that lives too long is rejected", async () => {
  const exp = Math.floor(now / 1000) + 60 * 10;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "Ada" }, exp, secret);
  assert.equal(await readHubTrust(token, { secret, now }), null);
});

test("missing header or secret fails closed", async () => {
  assert.equal(await readHubTrust(null, { secret, now }), null);
  const exp = Math.floor(now / 1000) + 60;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "Ada" }, exp, secret);
  assert.equal(await readHubTrust(token, { secret: "", now }), null);
});

test("a secret with surrounding whitespace still matches", async () => {
  const exp = Math.floor(now / 1000) + 60;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "Ada" }, exp, secret);
  const user = await readHubTrust(token, { secret: `  ${secret}\n`, now });
  assert.equal(user?.email, "ada@seamlesshome.com");
});

test("an expiry in milliseconds is accepted", async () => {
  const expMs = now + 60_000;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "Ada" }, expMs, secret);
  const result = await inspectHubTrust(token, { secret, now });
  assert.equal(result.reason, "ok");
  assert.equal(result.user?.email, "ada@seamlesshome.com");
});

test("a missing header is reported without throwing", async () => {
  const result = await inspectHubTrust(null, { secret, now });
  assert.equal(result.reason, "no-header");
  assert.equal(result.user, null);
});

test("unicode names round-trip", async () => {
  const exp = Math.floor(now / 1000) + 30;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "José Niño" }, exp, secret);
  const user = await readHubTrust(token, { secret, now });
  assert.equal(user?.name, "José Niño");
});
