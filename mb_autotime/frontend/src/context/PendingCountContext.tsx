import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getPendingEntries } from '../services/api';

// FIX: Import the same ATTORNEY_ID constant — or accept it as a prop if you
// later move to auth context. For now mirrors the hardcoded value on other pages.
const ATTORNEY_ID = 1;

interface PendingCountCtx {
  pendingCount: number;
  refreshPendingCount: () => void;
}

const PendingCountContext = createContext<PendingCountCtx>({
  pendingCount: 0,
  refreshPendingCount: () => {},
});

export function PendingCountProvider({ children }: { children: React.ReactNode }) {
  const [pendingCount, setPendingCount] = useState(0);

  const refreshPendingCount = useCallback(() => {
    // FIX: Was calling getTimeEntries({ status: 'pending' }) with no attorney_id,
    // so the badge count reflected ALL attorneys' pending entries combined.
    // Now scoped to the current attorney only.
    getPendingEntries(ATTORNEY_ID)
      .then(entries => setPendingCount(entries.length))
      .catch(() => setPendingCount(0));
  }, []);

  // Fetch on mount
  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  return (
    <PendingCountContext.Provider value={{ pendingCount, refreshPendingCount }}>
      {children}
    </PendingCountContext.Provider>
  );
}

export const usePendingCount = () => useContext(PendingCountContext);