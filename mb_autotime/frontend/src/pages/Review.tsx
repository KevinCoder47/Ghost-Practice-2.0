import { usePendingEntries } from '../hooks/usePendingEntries';
import { EntryCard } from '../components/EntryCard';
import './Review.css';

const ATTORNEY_ID = undefined;

// ─── Skeleton card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="entry-card entry-card--skeleton">
      <div className="entry-card__header">
        <div className="entry-card__type">
          <div className="skeleton" style={{ width: 28, height: 28, borderRadius: 6 }} />
          <div className="skeleton" style={{ width: 60, height: 12, borderRadius: 4 }} />
        </div>
        <div className="skeleton" style={{ width: 48, height: 22, borderRadius: 20 }} />
      </div>
      <div className="entry-card__body">
        <div className="skeleton" style={{ width: '45%', height: 13, borderRadius: 4, marginBottom: 10 }} />
        <div className="skeleton" style={{ width: '100%', height: 13, borderRadius: 4, marginBottom: 6 }} />
        <div className="skeleton" style={{ width: '80%', height: 13, borderRadius: 4 }} />
      </div>
      <div className="entry-card__actions">
        <div className="skeleton" style={{ width: 90, height: 34, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 72, height: 34, borderRadius: 6 }} />
        <div className="skeleton" style={{ width: 84, height: 34, borderRadius: 6 }} />
      </div>
    </div>
  );
}

// ─── SVG icons ─────────────────────────────────────────────────────────────────

function IconInboxEmpty() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  );
}

// ─── Review page ───────────────────────────────────────────────────────────────

export default function Review() {
  const { entries, matters, loading, error, confirm, dismiss, edit, refresh } =
    usePendingEntries(ATTORNEY_ID);

  return (
    <div className="review-page">
      {/* ── Header ── */}
      <header className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Pending Tray</h1>
          {!loading && (
            <span className="badge badge--gold">
              {entries.length} {entries.length === 1 ? 'item' : 'items'}
            </span>
          )}
        </div>
        <div className="page-header__actions">
          <button
            className="btn btn--ghost btn--sm"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh pending entries"
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="review-tray">
        {/* Loading skeleton */}
        {loading && (
          <div className="entry-list">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="state-screen state-screen--error">
            <p className="state-screen__icon">⚠</p>
            <p className="state-screen__title">Failed to load</p>
            <p className="state-screen__sub">{error}</p>
            <button className="btn btn--ghost btn--sm" onClick={refresh}>
              Try again
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && entries.length === 0 && (
          <div className="review-empty">
            <div className="review-empty__icon-wrap">
              <IconInboxEmpty />
            </div>
            <h3 className="review-empty__title">You're all caught up!</h3>
            <p className="review-empty__sub">
              No pending entries. New AI-drafted entries will appear here as your activity is captured.
            </p>
          </div>
        )}

        {/* Entry list */}
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