function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers
    }
  });
}

function fail(message, status = 400) {
  return json({ error: message }, status);
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
}

function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  return !origin || allowedOrigins(env).includes(origin);
}

function cors(request, env) {
  const origin = request.headers.get("Origin");
  const headers = {
    "Vary": "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400"
  };

  if (origin && allowedOrigins(env).includes(origin))
    headers["Access-Control-Allow-Origin"] = origin;

  return headers;
}

function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

function dayOffset(day, offset) {
  const date = new Date(day + "T00:00:00.000Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function validSessionId(value) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function hashSession(day, sessionId) {
  const input = new TextEncoder().encode(day + ":" + sessionId);
  const digest = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, "0")).join("");
}

async function readBody(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 1024) throw new Error("Request body too large");
  return request.json();
}

async function recordVisit(request, env) {
  if (!env.DB)
    return fail("Statistics database is not configured", 503);

  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.toLowerCase().includes("application/json"))
    return fail("Content-Type must be application/json", 415);

  let input;
  try {
    input = await readBody(request);
  } catch {
    return fail("Invalid JSON body");
  }

  if (!validSessionId(input.sessionId))
    return fail("A valid tab sessionId is required");

  const day = todayUtc();
  const sessionHash = await hashSession(day, input.sessionId);

  // Keep only today's one-way session hashes. Historical reporting uses daily aggregates.
  await env.DB.prepare("DELETE FROM site_daily_sessions WHERE day < ?")
    .bind(day)
    .run();

  const inserted = await env.DB.prepare(
    "INSERT OR IGNORE INTO site_daily_sessions (day, session_hash) VALUES (?, ?)"
  ).bind(day, sessionHash).run();

  const isNewSession = Number(inserted.meta?.changes || 0) > 0;

  await env.DB.prepare(
    "INSERT INTO site_daily_stats (day, views, sessions) VALUES (?, 1, ?) " +
    "ON CONFLICT(day) DO UPDATE SET " +
    "views = site_daily_stats.views + 1, " +
    "sessions = site_daily_stats.sessions + excluded.sessions"
  ).bind(day, isNewSession ? 1 : 0).run();

  return json({ accepted: true, day }, 202);
}

async function readStatistics(url, env) {
  if (!env.DB)
    return fail("Statistics database is not configured", 503);

  const requestedDays = Number(url.searchParams.get("days") || 30);
  const daysCount = Number.isFinite(requestedDays)
    ? Math.max(1, Math.min(90, Math.trunc(requestedDays)))
    : 30;

  const today = todayUtc();
  const startDay = dayOffset(today, -(daysCount - 1));
  const result = await env.DB.prepare(
    "SELECT day, views, sessions FROM site_daily_stats WHERE day >= ? ORDER BY day ASC"
  ).bind(startDay).all();

  const byDay = new Map(
    (result.results || []).map(row => [
      row.day,
      { day: row.day, views: Number(row.views) || 0, sessions: Number(row.sessions) || 0 }
    ])
  );

  const daily = Array.from({ length: daysCount }, (_, index) => {
    const day = dayOffset(startDay, index);
    return byDay.get(day) || { day, views: 0, sessions: 0 };
  });

  const totalViews = daily.reduce((sum, row) => sum + row.views, 0);
  const totalSessions = daily.reduce((sum, row) => sum + row.sessions, 0);
  const todayRow = byDay.get(today) || { day: today, views: 0, sessions: 0 };

  return json({
    days: daysCount,
    today: todayRow,
    totals: { views: totalViews, sessions: totalSessions },
    daily
  });
}

async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";

  if (!originAllowed(request, env))
    return fail("Origin not allowed", 403);

  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors(request, env) });

  if (request.method === "GET" && path === "/health")
    return json({ status: "ok", service: "winoptimizer-site-statistics" });

  if (request.method === "POST" && path === "/v1/site/visit")
    return recordVisit(request, env);

  if (request.method === "GET" && path === "/v1/site/stats")
    return readStatistics(url, env);

  return fail("Not found", 404);
}

export default {
  async fetch(request, env) {
    try {
      const response = await handle(request, env);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors(request, env)))
        headers.set(key, value);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "no-referrer");
      headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return fail("Internal server error", 500);
    }
  }
};
