import type {
  TimeEntry,
  Activity,
  Matter,
  CreateTimeEntryBody,
  PatchTimeEntryBody,
  SuggestionResponse,
} from '../types';

const API_URL = import.meta.env.VITE_API_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API error ${res.status}: ${body}`);
  }

  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as Promise<T>;
}

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = (): Promise<string> => request<string>('/');

// ── Time Entries ──────────────────────────────────────────────────────────────
export const getTimeEntries = (params?: {
  attorney_id?: number;
  status?: 'pending' | 'confirmed' | 'dismissed';
}): Promise<TimeEntry[]> => {
  const qs = new URLSearchParams();
  if (params?.attorney_id != null) qs.set('attorney_id', String(params.attorney_id));
  if (params?.status) qs.set('status', params.status);
  const query = qs.toString() ? `?${qs.toString()}` : '';
  return request<TimeEntry[]>(`/time-entries${query}`);
};

export const getPendingEntries = (attorney_id?: number): Promise<TimeEntry[]> =>
  getTimeEntries({ status: 'pending', attorney_id });

export const getTimeEntryById = (id: number): Promise<TimeEntry> =>
  request<TimeEntry>(`/time-entries/${id}`);

export const createTimeEntry = (
  body: CreateTimeEntryBody & { work_date?: string }
): Promise<TimeEntry> =>
  request<TimeEntry>('/time-entries', {
    method: 'POST',
    body: JSON.stringify(body),
  });

export const patchTimeEntry = (
  id: number,
  body: PatchTimeEntryBody
): Promise<TimeEntry> =>
  request<TimeEntry>(`/time-entries/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });

export const confirmEntry = (id: number): Promise<TimeEntry> =>
  patchTimeEntry(id, { status: 'confirmed' });

export const dismissEntry = (id: number): Promise<TimeEntry> =>
  patchTimeEntry(id, { status: 'dismissed' });

export const deleteTimeEntry = (id: number): Promise<void> =>
  request<void>(`/time-entries/${id}`, { method: 'DELETE' });

// ── Activities ────────────────────────────────────────────────────────────────
export const getActivities = (attorney_id?: number): Promise<Activity[]> => {
  const qs = attorney_id != null ? `?attorney_id=${attorney_id}` : '';
  return request<Activity[]>(`/activities${qs}`);
};

export const suggestEntry = (body: {
  activity_type: string;
  contact_name: string;
  subject?: string;
  raw_duration_minutes?: number;
  attorney_id?: number;
}): Promise<SuggestionResponse> =>
  request<SuggestionResponse>('/activities/suggest', {
    method: 'POST',
    body: JSON.stringify(body),
  });

// ── Matters ───────────────────────────────────────────────────────────────────
export const getMatters = (): Promise<Matter[]> =>
  request<Matter[]>('/matters');

// ── Reports ───────────────────────────────────────────────────────────────────

export interface ProductivityRow {
  attorney_id: number;
  name: string;
  monthly_target_hours: number | null;
  confirmed_units: number;
  confirmed_hours: number;
  pending_entries: number;
  pct_of_target: number;
}

export interface DailyRow {
  date: string;
  entry_count: number;
  total_hours: number;
  confirmed: number;
  pending: number;
  dismissed: number;
}

export const getProductivityReport = (): Promise<ProductivityRow[]> =>
  request<ProductivityRow[]>('/reports/productivity');

export const getDailyReport = (attorney_id: number): Promise<DailyRow[]> =>
  request<DailyRow[]>(`/reports/daily/${attorney_id}`);

// ── Billing Rates ─────────────────────────────────────────────────────────────

const DEFAULT_RATE = 350; // ZAR fallback

/**
 * Fetch the billing rate for a specific matter.
 * Falls back to attorney rate, then to R350/hr.
 */
export async function getBillingRate(
  matter_id: number | null,
  attorney_id: number
): Promise<number> {
  // Try matter-level rate first
  if (matter_id != null) {
    try {
      const matters = await getMatters();
      const matter = matters.find((m) => m.matter_id === matter_id);
      if (matter && 'billing_rate' in matter && typeof (matter as any).billing_rate === 'number') {
        return (matter as any).billing_rate as number;
      }
    } catch {
      // fall through
    }
  }

  // Try attorney-level rate
  try {
    const attorney = await request<any>(`/attorneys/${attorney_id}`);
    if (typeof attorney?.hourly_rate === 'number') {
      return attorney.hourly_rate as number;
    }
  } catch {
    // fall through
  }

  return DEFAULT_RATE;
}

/**
 * Fetch billing rates for all matters in a confirmed entries list.
 * Returns a map of matter_id (or 'none') → ZAR rate.
 * Uses a single attorney rate lookup and falls back to R350.
 */
export async function getBillingRateMap(
  entries: TimeEntry[],
  attorney_id: number
): Promise<Map<string, number>> {
  const rateMap = new Map<string, number>();

  // Fetch attorney rate once
  let attorneyRate = DEFAULT_RATE;
  try {
    const attorney = await request<any>(`/attorneys/${attorney_id}`);
    if (typeof attorney?.hourly_rate === 'number') {
      attorneyRate = attorney.hourly_rate;
    }
  } catch {
    // use default
  }

  // Fetch matters once and build matter_id → billing_rate
  let matterRates = new Map<number, number>();
  try {
    const matters = await getMatters();
    for (const m of matters) {
      if ('billing_rate' in m && typeof (m as any).billing_rate === 'number') {
        matterRates.set(m.matter_id, (m as any).billing_rate as number);
      }
    }
  } catch {
    // use attorney rate for all
  }

  // Build the map keyed by String(matter_id ?? 'none')
  const seenKeys = new Set<string>();
  for (const e of entries) {
    const key = String(e.matter_id ?? 'none');
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);

    if (e.matter_id != null && matterRates.has(e.matter_id)) {
      rateMap.set(key, matterRates.get(e.matter_id)!);
    } else {
      rateMap.set(key, attorneyRate);
    }
  }

  return rateMap;
}

// ── Simulate Activity ─────────────────────────────────────────────────────────
/**
 * Calls POST /activities/simulate — the dedicated simulate endpoint.
 * Generates a suggestion and immediately persists a pending time entry.
 */
export const simulateActivity = async (params: {
  activity_type: string;
  contact_name: string;
  subject?: string;
  raw_duration_minutes?: number;
  attorney_id: number;
}): Promise<TimeEntry> => {
  const result = await request<{ entry: TimeEntry; suggestion: SuggestionResponse }>(
    '/activities/simulate',
    {
      method: 'POST',
      body: JSON.stringify({
        attorney_id: params.attorney_id,
        activity_type: params.activity_type,
        contact_name: params.contact_name,
        subject: params.subject,
        raw_duration_minutes: params.raw_duration_minutes,
      }),
    }
  );
  return result.entry;
};