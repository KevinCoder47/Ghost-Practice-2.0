-- Attorneys
INSERT INTO attorneys (name, email, monthly_target_hours) VALUES
('John Smith', 'john@law.com', 160),
('Sarah Lee', 'sarah@law.com', 150),
('David Nkosi', 'david@law.com', 170);

-- Matters
INSERT INTO matters (matter_number, client_name, matter_description) VALUES
('MAT001', 'ABC Corp', 'Contract drafting'),
('MAT002', 'XYZ Ltd', 'Litigation'),
('MAT003', 'Nkosi Inc', 'Property transfer'),
('MAT004', 'Global Bank', 'Compliance'),
('MAT005', 'RetailCo', 'Employment dispute');

-- Activities (20+)
INSERT INTO activities (attorney_id, activity_type, contact_name, subject, raw_duration_minutes) VALUES
(1, 'email', 'Client A', 'Contract update', 12),
(1, 'call', 'Client B', 'Follow-up call', 8),
(2, 'meeting', 'Team', 'Strategy meeting', 45),
(3, 'draft', 'Client C', 'Draft agreement', 30),
(2, 'email', 'Client D', 'Legal advice', 10),
(1, 'call', 'Client E', 'Quick check-in', 6),
(3, 'meeting', 'Client F', 'Consultation', 50),
(2, 'draft', 'Client G', 'Write memo', 25),
(1, 'email', 'Client H', 'Update', 15),
(3, 'call', 'Client I', 'Discussion', 20),
(2, 'meeting', 'Internal', 'Review', 35),
(1, 'draft', 'Client J', 'Prepare doc', 40),
(3, 'email', 'Client K', 'Follow-up', 5),
(2, 'call', 'Client L', 'Advice', 12),
(1, 'meeting', 'Client M', 'Planning', 60),
(3, 'draft', 'Client N', 'Contract', 28),
(2, 'email', 'Client O', 'Check-in', 9),
(1, 'call', 'Client P', 'Clarification', 7),
(3, 'meeting', 'Client Q', 'Discussion', 55),
(2, 'draft', 'Client R', 'Legal doc', 33);