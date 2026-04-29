-- MB AutoTime seed data
-- Run AFTER schema.sql: psql -d mb_autotime -f database/seed.sql

-- Attorneys
INSERT INTO attorneys (name, email, monthly_target_hours) VALUES
('John Smith',   'john@law.com',   160),
('Sarah Lee',    'sarah@law.com',  150),
('David Nkosi',  'david@law.com',  170)
ON CONFLICT (email) DO NOTHING;

-- Matters
INSERT INTO matters (matter_number, client_name, matter_description) VALUES
('MAT001', 'ABC Corp',    'Contract drafting and review'),
('MAT002', 'XYZ Ltd',     'Commercial litigation'),
('MAT003', 'Nkosi Inc',   'Property transfer and conveyancing'),
('MAT004', 'Global Bank', 'Regulatory compliance advisory'),
('MAT005', 'RetailCo',    'Employment dispute and arbitration');

-- Activities (captured by desktop agent)
INSERT INTO activities (attorney_id, activity_type, contact_name, subject, raw_duration_minutes) VALUES
(1, 'email',   'ABC Corp',        'Contract update query',          12),
(1, 'call',    'XYZ Ltd',         'Follow-up re litigation',         8),
(2, 'meeting', 'Internal team',   'Weekly strategy meeting',        45),
(3, 'draft',   'Nkosi Inc',       'Draft transfer documents',        30),
(2, 'email',   'Global Bank',     'Compliance deadline reminder',    10),
(1, 'call',    'RetailCo',        'Employee dispute check-in',        6),
(3, 'meeting', 'Nkosi Inc',       'Transfer consultation',           50),
(2, 'draft',   'XYZ Ltd',         'Draft legal opinion memo',        25),
(1, 'email',   'ABC Corp',        'Amendment to Schedule A',         15),
(3, 'call',    'Global Bank',     'Compliance discussion',           20),
(2, 'meeting', 'Internal',        'File review session',             35),
(1, 'draft',   'RetailCo',        'Prepare settlement document',     40),
(3, 'email',   'Nkosi Inc',       'Follow-up on transfer docs',       5),
(2, 'call',    'ABC Corp',        'Legal advice on clause 12',       12),
(1, 'meeting', 'XYZ Ltd',         'Litigation planning session',     60),
(3, 'draft',   'RetailCo',        'Employment contract amendments',  28),
(2, 'email',   'Global Bank',     'FICA compliance check-in',         9),
(1, 'call',    'Nkosi Inc',       'Clarification on transfer',        7),
(3, 'meeting', 'XYZ Ltd',         'Pre-trial discussion',            55),
(2, 'draft',   'ABC Corp',        'Shareholder agreement draft',     33);

-- Pending time entries (pre-seeded for review tray demo)
INSERT INTO time_entries (matter_id, attorney_id, activity_type, narration, duration_units, status) VALUES
(1, 1, 'email',   'Attending to correspondence received from ABC Corp re contract update query.',       2,  'pending'),
(2, 1, 'call',    'Telephone conference with XYZ Ltd re follow-up on litigation strategy.',            2,  'pending'),
(3, 3, 'draft',   'Drafting and settling transfer documents in connection with property conveyancing.', 5,  'pending'),
(4, 2, 'meeting', 'Attending consultation with Global Bank re regulatory compliance requirements.',    8,  'pending'),
(5, 1, 'call',    'Telephone conference with RetailCo re employee dispute proceedings.',               1,  'pending'),
(1, 2, 'draft',   'Drafting legal opinion memo re amendment to contract terms.',                       5,  'confirmed'),
(2, 3, 'meeting', 'Attending pre-trial consultation with XYZ Ltd re litigation strategy.',             10, 'confirmed');