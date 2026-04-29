-- MB AutoTime database schema
-- Run: psql -d mb_autotime -f database/schema.sql

CREATE TABLE IF NOT EXISTS attorneys (
    attorney_id   SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE,
    monthly_target_hours INT
);

CREATE TABLE IF NOT EXISTS matters (
    matter_id         SERIAL PRIMARY KEY,
    matter_number     TEXT,
    client_name       TEXT,
    matter_description TEXT
);

CREATE TABLE IF NOT EXISTS time_entries (
    entry_id       SERIAL PRIMARY KEY,
    matter_id      INT REFERENCES matters(matter_id) ON DELETE SET NULL,
    attorney_id    INT REFERENCES attorneys(attorney_id) ON DELETE CASCADE,
    activity_type  TEXT,
    narration      TEXT,
    duration_units INT,           -- each unit = 0.1 h = 6 minutes
    status         TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'dismissed')),
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activities (
    activity_id          SERIAL PRIMARY KEY,
    attorney_id          INT REFERENCES attorneys(attorney_id) ON DELETE SET NULL,
    activity_type        TEXT NOT NULL,
    contact_name         TEXT,
    subject              TEXT,
    raw_duration_minutes INT,
    detected_at          TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_time_entries_attorney ON time_entries(attorney_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_matter   ON time_entries(matter_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_status   ON time_entries(status);
CREATE INDEX IF NOT EXISTS idx_time_entries_created  ON time_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_attorney   ON activities(attorney_id);