CREATE TABLE IF NOT EXISTS site_daily_stats (
  day TEXT PRIMARY KEY,
  views INTEGER NOT NULL DEFAULT 0,
  sessions INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS site_daily_sessions (
  day TEXT NOT NULL,
  session_hash TEXT NOT NULL,
  PRIMARY KEY (day, session_hash)
);

CREATE INDEX IF NOT EXISTS idx_site_daily_sessions_day
  ON site_daily_sessions(day);
