import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const origin = "https://reikidod.github.io";
const env = { ALLOWED_ORIGINS: origin };

class FakeD1 {
  constructor() {
    this.sessions = new Set();
    this.stats = new Map();
  }

  prepare(sql) {
    const database = this;
    let values = [];

    return {
      bind(...args) {
        values = args;
        return this;
      },
      async run() {
        if (sql.startsWith("DELETE FROM site_daily_sessions")) {
          const [minimumDay] = values;
          for (const key of [...database.sessions]) {
            if (key.split("|")[0] < minimumDay)
              database.sessions.delete(key);
          }
          return { meta: { changes: 0 } };
        }

        if (sql.startsWith("INSERT OR IGNORE INTO site_daily_sessions")) {
          const [day, hash] = values;
          const key = day + "|" + hash;
          if (database.sessions.has(key))
            return { meta: { changes: 0 } };
          database.sessions.add(key);
          return { meta: { changes: 1 } };
        }

        if (sql.startsWith("INSERT INTO site_daily_stats")) {
          const [day, views, sessions] = values;
          const row = database.stats.get(day) || { day, views: 0, sessions: 0 };
          row.views += Number(views);
          row.sessions += Number(sessions);
          database.stats.set(day, row);
          return { meta: { changes: 1 } };
        }

        throw new Error("Unexpected SQL in test: " + sql);
      },
      async all() {
        if (sql.startsWith("SELECT day, views, sessions FROM site_daily_stats")) {
          const [startDay] = values;
          return {
            results: [...database.stats.values()]
              .filter(row => row.day >= startDay)
              .sort((a, b) => a.day.localeCompare(b.day))
          };
        }

        throw new Error("Unexpected SQL in test: " + sql);
      }
    };
  }
}

function visitRequest(sessionId, requestOrigin = origin) {
  return new Request("https://stats.example.test/v1/site/visit", {
    method: "POST",
    headers: {
      Origin: requestOrigin,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ sessionId })
  });
}

test("health endpoint reports the site statistics service", async () => {
  const response = await worker.fetch(
    new Request("https://stats.example.test/health"),
    env
  );
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "winoptimizer-site-statistics"
  });
});

test("health response includes no-store and security headers", async () => {
  const response = await worker.fetch(new Request("https://stats.example.test/health"), env);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("referrer-policy"), "no-referrer");
});

test("CORS only grants the configured website origin", async () => {
  const allowed = await worker.fetch(new Request("https://stats.example.test/v1/site/stats", {
    headers: { Origin: origin }
  }), { ...env, DB: new FakeD1() });
  assert.equal(allowed.headers.get("access-control-allow-origin"), origin);

  const denied = await worker.fetch(new Request("https://stats.example.test/v1/site/stats", {
    headers: { Origin: "https://attacker.example" }
  }), env);
  assert.equal(denied.status, 403);
});

test("visit endpoint rejects invalid session identifiers", async () => {
  const response = await worker.fetch(visitRequest("not-a-guid"), { ...env, DB: new FakeD1() });
  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { error: "A valid tab sessionId is required" });
});

test("one tab session counts once per day while each page load counts as a view", async () => {
  const DB = new FakeD1();
  const sessionId = "90bd0d8e-8c16-4d3d-9f31-9d0f1e4ccfd6";

  const first = await worker.fetch(visitRequest(sessionId), { ...env, DB });
  const second = await worker.fetch(visitRequest(sessionId), { ...env, DB });
  const otherTab = await worker.fetch(
    visitRequest("a0bd0d8e-8c16-4d3d-9f31-9d0f1e4ccfd6"),
    { ...env, DB }
  );

  assert.equal(first.status, 202);
  assert.equal(second.status, 202);
  assert.equal(otherTab.status, 202);

  const stats = await worker.fetch(
    new Request("https://stats.example.test/v1/site/stats?days=7", {
      headers: { Origin: origin }
    }),
    { ...env, DB }
  );
  const payload = await stats.json();
  assert.equal(payload.today.views, 3);
  assert.equal(payload.today.sessions, 2);
  assert.equal(payload.totals.views, 3);
  assert.equal(payload.totals.sessions, 2);
  assert.equal(payload.daily.length, 7);
});

test("statistics endpoint is unavailable without the D1 binding", async () => {
  const response = await worker.fetch(
    new Request("https://stats.example.test/v1/site/stats"),
    env
  );
  assert.equal(response.status, 503);
});
