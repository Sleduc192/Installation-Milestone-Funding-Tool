import assert from "node:assert/strict";
import test from "node:test";
import { basePath, stripBasePath, withBasePath } from "./base-path";
import { publicUrl } from "./public-url";

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous: Record<string, string | undefined> = {};
  for (const key of Object.keys(values)) {
    previous[key] = process.env[key];
    if (values[key] === undefined) delete process.env[key];
    else process.env[key] = values[key];
  }
  try {
    fn();
  } finally {
    for (const key of Object.keys(previous)) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
}

test("base path helpers are no-ops when unset", () => {
  withEnv({ NEXT_PUBLIC_BASE_PATH: undefined }, () => {
    assert.equal(basePath(), "");
    assert.equal(withBasePath("/api/me"), "/api/me");
    assert.equal(stripBasePath("/dashboard"), "/dashboard");
  });
});

test("base path prefixes root-relative paths once", () => {
  withEnv({ NEXT_PUBLIC_BASE_PATH: "/funding" }, () => {
    assert.equal(withBasePath("/"), "/funding");
    assert.equal(withBasePath("/api/me"), "/funding/api/me");
    assert.equal(withBasePath("/funding/api/me"), "/funding/api/me");
    assert.equal(withBasePath("https://example.com/api"), "https://example.com/api");
    assert.equal(stripBasePath("/funding/dashboard"), "/dashboard");
    assert.equal(stripBasePath("/funding"), "/");
    assert.equal(stripBasePath("/dashboard"), "/dashboard");
  });
});

test("public URL includes the hub base path from NEXTAUTH_URL", () => {
  withEnv(
    {
      NEXTAUTH_URL: "https://seamless-hub-pi.vercel.app/funding/api/auth",
      NEXT_PUBLIC_BASE_PATH: "/funding",
    },
    () => {
      assert.equal(publicUrl("/dashboard"), "https://seamless-hub-pi.vercel.app/funding/dashboard");
      assert.equal(
        publicUrl("/api/gdrive/callback"),
        "https://seamless-hub-pi.vercel.app/funding/api/gdrive/callback"
      );
      assert.equal(publicUrl("/funding/login"), "https://seamless-hub-pi.vercel.app/funding/login");
    }
  );
});

test("public URL stays on the standalone origin when no base path is set", () => {
  withEnv({ NEXTAUTH_URL: "https://installation-milestone-funding-tool.vercel.app", NEXT_PUBLIC_BASE_PATH: undefined }, () => {
    assert.equal(
      publicUrl("/review-gdrive"),
      "https://installation-milestone-funding-tool.vercel.app/review-gdrive"
    );
  });
});
