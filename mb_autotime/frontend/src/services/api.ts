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

  // Return raw text for endpoints that don't send JSON
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return res.json() as Promise<T>;
  }
  return res.text() as unknown as Promise<T>;
}

// ── Health ────────────────────────────────────────────────────────────────────
export const getHealth = (): Promise<string> => request<string>('/');

// ── Time Entries ──────────────────────────────────────────────────────────────
export const getTimeEntries = (): Promise<unknown> =>
  request('/time-entries');

// ── Activities ────────────────────────────────────────────────────────────────
export const getActivities = (): Promise<unknown> =>
  request('/activities');

// ── Matters ───────────────────────────────────────────────────────────────────
export const getMatters = (): Promise<unknown> =>
  request('/matters');

// ── Reports ───────────────────────────────────────────────────────────────────
export const getReports = (): Promise<unknown> =>
  request('/reports');