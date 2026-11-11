PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  theme_id TEXT NOT NULL,
  accent_id TEXT NOT NULL DEFAULT 'blue',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE TABLE IF NOT EXISTS pairings (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL,
  code_hash TEXT NOT NULL UNIQUE,
  poll_secret_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  claimed_at INTEGER,
  claim_id TEXT,
  token_ciphertext TEXT
);

CREATE INDEX IF NOT EXISTS idx_pairings_expiry ON pairings(expires_at);
CREATE INDEX IF NOT EXISTS idx_pairings_device ON pairings(device_id);

CREATE TABLE IF NOT EXISTS web_sessions (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

CREATE INDEX IF NOT EXISTS idx_web_sessions_device ON web_sessions(device_id);
CREATE INDEX IF NOT EXISTS idx_web_sessions_expiry ON web_sessions(expires_at);

CREATE TABLE IF NOT EXISTS rate_limits (
  key_hash TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  request_count INTEGER NOT NULL
);
