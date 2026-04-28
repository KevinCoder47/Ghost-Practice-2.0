CREATE TABLE attorneys (
    attorney_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    monthly_target_hours INT
);

CREATE TABLE matters (
    matter_id SERIAL PRIMARY KEY,
    matter_number TEXT,
    client_name TEXT,
    matter_description TEXT
);

CREATE TABLE time_entries (
    entry_id SERIAL PRIMARY KEY,
    matter_id INT REFERENCES matters(matter_id),
    attorney_id INT REFERENCES attorneys(attorney_id),
    activity_type TEXT,
    narration TEXT,
    duration_units INT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE activities (
    activity_id SERIAL PRIMARY KEY,
    attorney_id INT REFERENCES attorneys(attorney_id),
    activity_type TEXT,
    contact_name TEXT,
    subject TEXT,
    raw_duration_minutes INT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);