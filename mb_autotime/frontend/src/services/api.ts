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

export const createTimeEntry = (body: CreateTimeEntryBody): Promise<TimeEntry> =>
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
export const getReports = (): Promise<unknown> => request('/reports');