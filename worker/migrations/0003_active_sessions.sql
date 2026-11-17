CREATE TABLE IF NOT EXISTS site_active_sessions (
  session_hash TEXT PRIMARY KEY,
  last_seen INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_site_active_sessions_last_seen
  ON site_active_sessions(last_seen);
