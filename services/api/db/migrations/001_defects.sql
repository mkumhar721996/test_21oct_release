CREATE TABLE IF NOT EXISTS defects (
  id            uuid PRIMARY KEY,
  title         text NOT NULL,
  severity      text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  area          text NOT NULL DEFAULT '',
  steps         text NOT NULL DEFAULT '',
  attachment_id text,
  status        text NOT NULL DEFAULT 'open',
  reporter_id   text NOT NULL,
  reported_at   timestamptz NOT NULL DEFAULT now()
);
