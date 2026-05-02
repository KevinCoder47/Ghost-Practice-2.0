// ─── Core domain types (mirrored from backend models) ─────────────────────────

export interface Attorney {
  attorney_id: number;
  name: string;
  email: string | null;
  monthly_target_hours: number | null;
}

export interface Matter {
  matter_id: number;
  matter_number: string | null;
  client_name: string | null;
  matter_description: string | null;
}

export interface TimeEntry {
  entry_id: number;
  matter_id: number | null;
  attorney_id: number | null;
  activity_type: string | null;
  narration: string | null;
  duration_units: number | null; // 1 unit = 0.1 h = 6 min
  status: 'pending' | 'confirmed' | 'dismissed';
  created_at: string;
  // Joined fields returned by GET /time-entries
  matter_number?: string | null;
  client_name?: string | null;
  matter_description?: string | null;
  attorney_name?: string | null;
  duration_hours?: number | null;
}

export interface Activity {
  activity_id: number;
  attorney_id: number | null;
  activity_type: string;
  contact_name: string | null;
  subject: string | null;
  raw_duration_minutes: number | null;
  detected_at: string;
}

// ─── API request/response types ────────────────────────────────────────────────

export interface CreateTimeEntryBody {
  matter_id?: number;
  attorney_id: number;
  activity_type: string;
  narration?: string;
  duration_units?: number;
  raw_duration_minutes?: number;
  status?: 'pending' | 'confirmed' | 'dismissed';
}

export interface PatchTimeEntryBody {
  matter_id?: number;
  narration?: string;
  duration_units?: number;
  status?: 'pending' | 'confirmed' | 'dismissed';
}

export interface SuggestionResponse {
  suggested_matter: Matter | null;
  narration: string;
  confidence: 'high' | 'medium' | 'low';
  match_reason: string;
  raw_duration_minutes?: number;
  duration_units?: number;
  duration_hours?: number;
}

// ─── Activity types ────────────────────────────────────────────────────────────

export const ACTIVITY_TYPES = [
  'email',
  'call',
  'meeting',
  'draft',
  'review',
  'research',
  'court',
  'consultation',
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];