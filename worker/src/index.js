const THEMES = new Set([
  "dark", "light", "midnight", "emerald", "ocean", "sunset", "graphite"
]);
const ACCENTS = new Set([
  "blue", "red", "purple", "green", "cyan", "orange", "pink"
]);
const CODE_TTL_SECONDS = 600;
const WEB_SESSION_TTL_SECONDS = 43200;

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}
function fail(message, status = 400) { return json({ error: message }, status); }
function randomToken(bytes = 32) {
  const value = crypto.getRandomValues(new Uint8Array(bytes));
  return Array.from(value, b => b.toString(16).padStart(2, "0")).join("");
}
function randomCode() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join("");
}
async function hash(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
function validId(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(value);
}
function validTheme(value) {
  return value && typeof value.id === "string" && THEMES.has(value.id) &&
    (value.accent == null || (typeof value.accent === "string" && ACCENTS.has(value.accent)));
}
function originAllowed(request, env) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  const allowed = (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).filter(Boolean);
  return allowed.includes(origin);
}
function cors(request, env) {
  const origin = request.headers.get("Origin");
  const headers = { "Vary": "Origin", "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Max-Age": "86400" };
  if (origin && (env.ALLOWED_ORIGINS || "").split(",").map(x => x.trim()).includes(origin))
    headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}
async function body(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > 4096) throw new Error("Request body too large");
  return await request.json();
}
async function bearer(request, env) {
  const value = request.headers.get("Authorization") || "";
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(value);
  if (!match) return null;
  const tokenHash = await hash(match[1]);
  const device = await env.DB.prepare(
    "SELECT id, theme_id, accent_id, updated_at FROM devices WHERE token_hash = ? AND revoked_at IS NULL"
  ).bind(tokenHash).first();
  if (device) return { kind: "device", id: device.id, theme: device };
  const session = await env.DB.prepare(
    "SELECT device_id, expires_at FROM web_sessions WHERE token_hash = ? AND revoked_at IS NULL"
  ).bind(tokenHash).first();
  if (session && session.expires_at > Math.floor(Date.now() / 1000))
    return { kind: "web", id: session.device_id };
  return null;
}
async function getTheme(env, deviceId) {
  const row = await env.DB.prepare(
    "SELECT theme_id, accent_id, updated_at FROM devices WHERE id = ? AND revoked_at IS NULL"
  ).bind(deviceId).first();
  return row ? { id: row.theme_id, accent: row.accent_id, updatedAt: row.updated_at } : null;
}
async function handle(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(request, env) });
  if (!originAllowed(request, env)) return fail("Origin not allowed", 403);

  if (request.method === "GET" && path === "/health")
    return json({ status: "ok", service: "winoptimizer-theme-sync" });

  if (request.method === "POST" && path === "/v1/pairings") {
    let input;
    try { input = await body(request); } catch { return fail("Invalid JSON body"); }
    if (!validId(input.deviceId) || typeof input.pollSecret !== "string" ||
        !/^[a-f0-9]{64}$/i.test(input.pollSecret)) return fail("Invalid deviceId or pollSecret");
    const code = randomCode();
    const pairingId = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "INSERT INTO pairings (id, device_id, code_hash, poll_secret_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(pairingId, input.deviceId, await hash(code), await hash(input.pollSecret), now + CODE_TTL_SECONDS, now).run();
    return json({ pairingId, code, expiresIn: CODE_TTL_SECONDS });
  }

  if (request.method === "POST" && path === "/v1/pairings/claim") {
    let input;
    try { input = await body(request); } catch { return fail("Invalid JSON body"); }
    const code = typeof input.code === "string" ? input.code.toUpperCase().replace(/[^A-Z0-9]/g, "") : "";
    if (!/^[A-HJ-NP-Z2-9]{8}$/.test(code)) return fail("Invalid or expired pairing code", 404);
    const now = Math.floor(Date.now() / 1000);
    const pairing = await env.DB.prepare(
      "SELECT id, device_id FROM pairings WHERE code_hash = ? AND expires_at > ? AND claimed_at IS NULL"
    ).bind(await hash(code), now).first();
    if (!pairing) return fail("Invalid or expired pairing code", 404);

    const initialTheme = input.theme || { id: "dark", accent: "blue" };
    if (!validTheme(initialTheme)) return fail("Unsupported theme");
    const deviceToken = randomToken();
    const webToken = randomToken();
    const webSessionId = crypto.randomUUID();
    const result = await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO devices (id, token_hash, theme_id, accent_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET token_hash=excluded.token_hash, theme_id=excluded.theme_id, accent_id=excluded.accent_id, revoked_at=NULL, updated_at=excluded.updated_at"
      ).bind(pairing.device_id, await hash(deviceToken), initialTheme.id, initialTheme.accent || "blue", now, now),
      env.DB.prepare("UPDATE pairings SET claimed_at = ?, token_ciphertext = ? WHERE id = ? AND claimed_at IS NULL").bind(now, await encryptToken(deviceToken, env.TOKEN_ENCRYPTION_KEY), pairing.id),
      env.DB.prepare(
        "INSERT INTO web_sessions (id, device_id, token_hash, expires_at, created_at) VALUES (?, ?, ?, ?, ?)"
      ).bind(webSessionId, pairing.device_id, await hash(webToken), now + WEB_SESSION_TTL_SECONDS, now)
    ]);
    if (result[1].meta?.changes !== 1) return fail("Pairing code already used", 409);
    return json({ linked: true, webToken, expiresIn: WEB_SESSION_TTL_SECONDS });
  }

  if (request.method === "POST" && path === "/v1/pairings/poll") {
    let input;
    try { input = await body(request); } catch { return fail("Invalid JSON body"); }
    if (!validId(input.pairingId) || typeof input.pollSecret !== "string" ||
        !/^[a-f0-9]{64}$/i.test(input.pollSecret)) return fail("Invalid pairing credentials");
    const pairing = await env.DB.prepare(
      "SELECT p.device_id, p.claimed_at, p.expires_at, d.token_hash FROM pairings p LEFT JOIN devices d ON d.id = p.device_id AND d.revoked_at IS NULL WHERE p.id = ? AND p.poll_secret_hash = ?"
    ).bind(input.pairingId, await hash(input.pollSecret)).first();
    if (!pairing || pairing.expires_at <= Math.floor(Date.now() / 1000)) return fail("Pairing expired", 404);
    if (!pairing.claimed_at || !pairing.token_hash) return json({ status: "pending" }, 202);
    if (!env.TOKEN_ENCRYPTION_KEY) return fail("Token delivery is not configured", 503);
    const envelope = await env.DB.prepare("UPDATE pairings SET token_ciphertext = NULL WHERE id = ? AND poll_secret_hash = ? AND token_ciphertext IS NOT NULL RETURNING token_ciphertext")
      .bind(input.pairingId, await hash(input.pollSecret)).first();
    if (!envelope?.token_ciphertext) return fail("Token already delivered; restart pairing if it was lost", 409);
    const deviceToken = await decryptToken(envelope.token_ciphertext, env.TOKEN_ENCRYPTION_KEY);
    return json({ status: "linked", deviceToken, theme: await getTheme(env, pairing.device_id) });
  }

  if (path === "/v1/theme" && (request.method === "GET" || request.method === "PUT")) {
    const auth = await bearer(request, env);
    if (!auth) return fail("Unauthorized", 401);
    if (request.method === "GET") {
      const theme = await getTheme(env, auth.id);
      return theme ? json(theme) : fail("Device not found", 404);
    }
    let input;
    try { input = await body(request); } catch { return fail("Invalid JSON body"); }
    if (!validTheme(input)) return fail("Unsupported theme or accent");
    const now = Math.floor(Date.now() / 1000);
    await env.DB.prepare(
      "UPDATE devices SET theme_id = ?, accent_id = ?, updated_at = ? WHERE id = ? AND revoked_at IS NULL"
    ).bind(input.id, input.accent || "blue", now, auth.id).run();
    return json({ id: input.id, accent: input.accent || "blue", updatedAt: now });
  }

  if (request.method === "POST" && path === "/v1/device/revoke") {
    const auth = await bearer(request, env);
    if (!auth || auth.kind !== "device") return fail("Device token required", 401);
    const now = Math.floor(Date.now() / 1000);
    await env.DB.batch([
      env.DB.prepare("UPDATE devices SET revoked_at = ? WHERE id = ?").bind(now, auth.id),
      env.DB.prepare("UPDATE web_sessions SET revoked_at = ? WHERE device_id = ?").bind(now, auth.id)
    ]);
    return json({ revoked: true });
  }

  return fail("Not found", 404);
}
async function encryptToken(token, secret) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["encrypt"]);
  const encrypted = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token)));
  const hex = value => Array.from(value, b => b.toString(16).padStart(2, "0")).join("");
  return hex(iv) + "." + hex(encrypted);
}
async function decryptToken(ciphertext, secret) {
  const [ivHex, dataHex] = ciphertext.split(".");
  const fromHex = value => Uint8Array.from(value.match(/.{2}/g) || [], pair => parseInt(pair, 16));
  const keyBytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  const key = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromHex(ivHex) }, key, fromHex(dataHex));
  return new TextDecoder().decode(plain);
}
export default {
  async fetch(request, env) {
    try {
      const response = await handle(request, env);
      const headers = new Headers(response.headers);
      for (const [key, value] of Object.entries(cors(request, env))) headers.set(key, value);
      headers.set("X-Content-Type-Options", "nosniff");
      headers.set("Referrer-Policy", "no-referrer");
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return fail("Internal server error", 500);
    }
  }
};
