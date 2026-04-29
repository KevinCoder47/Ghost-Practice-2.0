// ─── Database row shapes ───────────────────────────────────────────────────────

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
  duration_units: number | null; // in 6-min units (0.1 h each)
  status: 'pending' | 'confirmed' | 'dismissed';
  created_at: Date;
}

export interface Activity {
  activity_id: number;
  attorney_id: number | null;
  activity_type: string;
  contact_name: string | null;
  subject: string | null;
  raw_duration_minutes: number | null;
  detected_at: Date;
}

// ─── Request / Response shapes ─────────────────────────────────────────────────

export interface CreateTimeEntryBody {
  matter_id?: number;
  attorney_id: number;
  activity_type: string;
  narration?: string;
  duration_units?: number;       // If provided, skips rounding
  raw_duration_minutes?: number; // Source for rounding if duration_units not given
  status?: 'pending' | 'confirmed' | 'dismissed';
}

export interface PatchTimeEntryBody {
  matter_id?: number;
  narration?: string;
  duration_units?: number;
  status?: 'pending' | 'confirmed' | 'dismissed';
}

export interface SuggestionRequest {
  activity_type: string;
  contact_name: string;
  subject?: string;
  attorney_id?: number;
}

export interface SuggestionResponse {
  suggested_matter: Matter | null;
  narration: string;
  confidence: 'high' | 'medium' | 'low';
  match_reason: string;
}

// ─── Activity types recognised by the system ──────────────────────────────────

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