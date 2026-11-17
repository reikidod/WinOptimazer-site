import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.js";

const env = { ALLOWED_ORIGINS: "https://reikidod.github.io" };

test("health endpoint reports service availability", async () => {
  const response = await worker.fetch(new Request("https://api.example.test/health"), env);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    status: "ok",
    service: "winoptimizer-theme-sync"
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


class StatsD1 {
  constructor() { this.sessions = new Set(); this.stats = new Map(); this.active = new Map(); }
  prepare(sql) {
    const db = this; let values = [];
    return {
      bind(...args) { values = args; return this; },
      async run() {
        if (sql.startsWith("DELETE FROM site_daily_sessions")) {
          const [day] = values; for (const key of [...db.sessions]) if (key.split("|")[0] < day) db.sessions.delete(key);
          return { meta: { changes: 0 } };
        }
        if (sql.startsWith("INSERT OR IGNORE INTO site_daily_sessions")) {
          const [day, hash] = values; const key = day + "|" + hash;
          if (db.sessions.has(key)) return { meta: { changes: 0 } };
          db.sessions.add(key); return { meta: { changes: 1 } };
        }
        if (sql.startsWith("INSERT INTO site_daily_stats")) {
          const [day, sessions] = values; const row = db.stats.get(day) || { day, views: 0, sessions: 0 };
          row.views++; row.sessions += Number(sessions); db.stats.set(day, row); return { meta: { changes: 1 } };
        }
        if (sql.startsWith("DELETE FROM site_active_sessions")) {
          const [cutoff] = values; for (const [key, time] of db.active) if (time < cutoff) db.active.delete(key);
          return { meta: { changes: 0 } };
        }
        if (sql.startsWith("INSERT INTO site_active_sessions")) {
          const [key, time] = values; db.active.set(key, time); return { meta: { changes: 1 } };
        }
        throw new Error("Unexpected SQL: " + sql);
      },
      async all() {
        if (sql.startsWith("SELECT day, views, sessions FROM site_daily_stats")) {
          const [start] = values;
          return { results: [...db.stats.values()].filter(row => row.day >= start).sort((a,b) => a.day.localeCompare(b.day)) };
        }
        throw new Error("Unexpected SQL: " + sql);
      },
      async first() {
        if (sql.startsWith("SELECT COUNT(*) AS online FROM site_active_sessions")) {
          const [cutoff] = values; return { online: [...db.active.values()].filter(time => time >= cutoff).length };
        }
        throw new Error("Unexpected SQL: " + sql);
      }
    };
  }
}
const statsSession = "90bd0d8e-8c16-4d3d-9f31-9d0f1e4ccfd6";
test("site statistics count views and unique daily tab sessions", async () => {
  const DB = new StatsD1();
  const makeVisit = () => new Request("https://api.example.test/v1/site/visit", {
    method:"POST", headers:{Origin:"https://reikidod.github.io","Content-Type":"application/json"},
    body:JSON.stringify({sessionId:statsSession})
  });
  await worker.fetch(makeVisit(),{...env,DB});
  await worker.fetch(makeVisit(),{...env,DB});
  const response=await worker.fetch(new Request("https://api.example.test/v1/site/stats?days=7",{headers:{Origin:"https://reikidod.github.io"}}),{...env,DB});
  const data=await response.json();
  assert.equal(response.status,200); assert.equal(data.today.views,2); assert.equal(data.today.sessions,1);
  assert.equal(data.daily.length,7);
});
test("site heartbeat exposes only active tab counts", async () => {
  const DB = new StatsD1();
  const response=await worker.fetch(new Request("https://api.example.test/v1/site/heartbeat",{
    method:"POST",headers:{Origin:"https://reikidod.github.io","Content-Type":"application/json"},
    body:JSON.stringify({sessionId:statsSession})
  }),{...env,DB});
  assert.equal(response.status,202);
  const stats=await worker.fetch(new Request("https://api.example.test/v1/site/stats",{headers:{Origin:"https://reikidod.github.io"}}),{...env,DB});
  assert.equal((await stats.json()).online,1);
});
