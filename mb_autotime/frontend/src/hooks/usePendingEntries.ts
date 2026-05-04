import { useState, useEffect, useCallback } from 'react';
import type { TimeEntry, PatchTimeEntryBody, Matter } from '../types';
import {
  getPendingEntries,
  confirmEntry,
  dismissEntry,
  patchTimeEntry,
  getMatters,
} from '../services/api';
import { usePendingCount } from '../context/PendingCountContext';

interface UsePendingEntriesReturn {
  entries: TimeEntry[];
  matters: Matter[];
  loading: boolean;
  error: string | null;
  confirm: (id: number) => Promise<void>;
  dismiss: (id: number) => Promise<void>;
  edit: (id: number, body: PatchTimeEntryBody) => Promise<void>;
  refresh: () => void;
}

export function usePendingEntries(attorney_id?: number): UsePendingEntriesReturn {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [matters, setMatters] = useState<Matter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const { refreshPendingCount } = usePendingCount();

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Remove an entry from local state immediately for snappy UX,
  // without waiting for a refetch.
  const removeEntry = useCallback((id: number) => {
    setEntries((prev) => prev.filter((e) => e.entry_id !== id));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([getPendingEntries(attorney_id), getMatters()])
      .then(([pendingEntries, allMatters]) => {
        if (cancelled) return;
        setEntries(pendingEntries);
        setMatters(allMatters);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [attorney_id, tick]);

  const confirm = useCallback(
    async (id: number) => {
      await confirmEntry(id);
      removeEntry(id);
      refreshPendingCount();
    },
    [removeEntry, refreshPendingCount]
  );

  const dismiss = useCallback(
    async (id: number) => {
      await dismissEntry(id);
      removeEntry(id);
      refreshPendingCount();
    },
    [removeEntry, refreshPendingCount]
  );

  const edit = useCallback(
    async (id: number, body: PatchTimeEntryBody) => {
      // Patch the fields, then confirm in one shot
      const patched = await patchTimeEntry(id, body);
      // If status was explicitly set (e.g. confirmed), remove from tray
      if (patched.status !== 'pending') {
        removeEntry(id);
      } else {
        // Update in-place so the card reflects edits
        setEntries((prev) =>
          prev.map((e) => (e.entry_id === id ? { ...e, ...patched } : e))
        );
      }
    },
    [removeEntry]
  );

  return { entries, matters, loading, error, confirm, dismiss, edit, refresh };
}