import { usePendingEntries } from '../hooks/usePendingEntries';
import { EntryCard } from '../components/EntryCard';
import './Review.css';

// Hardcoded for now — swap with auth context when login exists
const ATTORNEY_ID = undefined; // undefined = all attorneys

export default function Review() {
  const { entries, matters, loading, error, confirm, dismiss, edit, refresh } =
    usePendingEntries(ATTORNEY_ID);

  return (
    <div className="review-page">
      {/* ── Header ── */}
      <header className="review-header">
        <div className="review-header__left">
          <h1 className="review-header__title">Pending Entries</h1>
          {!loading && (
            <span className="review-header__count">
              {entries.length} {entries.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        <button
          className="btn btn--ghost review-header__refresh"
          onClick={refresh}
          disabled={loading}
          aria-label="Refresh pending entries"
        >
          ↻ Refresh
        </button>
      </header>

      {/* ── Body ── */}
      <main className="review-tray">
        {loading && (
          <div className="review-state">
            <div className="spinner" aria-label="Loading…" />
            <p>Loading pending entries…</p>
          </div>
        )}

        {!loading && error && (
          <div className="review-state review-state--error">
            <p className="review-state__icon">⚠</p>
            <p>{error}</p>
            <button className="btn btn--ghost" onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="review-state review-state--empty">
            <p className="review-state__icon">✓</p>
            <p className="review-state__title">All caught up</p>
            <p className="review-state__sub">No pending entries to review.</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <ul className="entry-list" role="list">
            {entries.map((entry) => (
              <li key={entry.entry_id}>
                <EntryCard
                  entry={entry}
                  matters={matters}
                  onConfirm={confirm}
                  onDismiss={dismiss}
                  onEdit={edit}
                />
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}