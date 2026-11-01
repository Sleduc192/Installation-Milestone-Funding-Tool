import assert from "node:assert/strict";
import test from "node:test";
import { readHubTrust, signHubTrust } from "./hub-trust";

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

test("unicode names round-trip", async () => {
  const exp = Math.floor(now / 1000) + 30;
  const token = await signHubTrust({ email: "ada@seamlesshome.com", name: "José Niño" }, exp, secret);
  const user = await readHubTrust(token, { secret, now });
  assert.equal(user?.name, "José Niño");
});
