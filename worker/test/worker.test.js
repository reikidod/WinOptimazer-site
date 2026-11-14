import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = { ALLOWED_ORIGINS: "https://reikidod.github.io" };

test("health endpoint reports service availability", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/health"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "winoptimizer-theme-sync-api"
  });
});

test("health response includes no-store and security headers", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/health"), env);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("preflight only grants the configured website origin", async () => {
  const allowed = await worker.fetch(new Request("https://api.example.test/v1/theme", {
    method: "OPTIONS",
    headers: { Origin: "https://reikidod.github.io" }
  }), env);
  assert.equal(allowed.status, 204);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "https://reikidod.github.io");

  const denied = await worker.fetch(new Request("https://api.example.test/v1/theme", {
    method: "OPTIONS",
    headers: { Origin: "https://attacker.example" }
  }), env);
  assert.equal(denied.status, 403);
});

test("theme endpoint rejects missing bearer token", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/v1/theme"), env);
  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), { error: "Unauthorized" });
});

test("unknown routes return 404", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/not-found"), env);
  assert.equal(response.status, 404);
});
