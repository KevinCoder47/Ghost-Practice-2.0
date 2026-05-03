import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTimeEntries } from '../services/api';
import type { TimeEntry } from '../types';
import './Dashboard.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeekISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff)).toISOString().slice(0, 10);
}

function fmtHours(units: number | null | undefined): string {
  if (units == null) return '0.0';
  return (units * 0.1).toFixed(1);
}

function isToday(iso: string) {
  return iso.slice(0, 10) === todayISO();
}

function isThisWeek(iso: string) {
  return iso.slice(0, 10) >= startOfWeekISO();
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

const DAILY_TARGET = 8;
const WEEKLY_TARGET = 40;

const ACTIVITY_ICONS: Record<string, string> = {
  email: '✉',  call: '📞', meeting: '👥',
  draft: '✍',  review: '🔍', research: '📚',
  court: '⚖',  consultation: '💬',
};

// ─── SVG icons ─────────────────────────────────────────────────────────────────

function IconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
    </svg>
  );
}

function IconInbox() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/>
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z"/>
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="db-skeleton">
      <div className="db-skeleton__hero">
        <div className="skeleton" style={{ height: 24, width: 200, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 56, width: 140, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 8, borderRadius: 20, marginTop: 16 }} />
      </div>
      <div className="db-skeleton__counters">
        {[0, 1].map(i => (
          <div key={i} className="card-surface" style={{ padding: 20, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 28, width: '40%' }} />
            </div>
          </div>
        ))}
      </div>
      <div className="card-surface" style={{ padding: 0, overflow: 'hidden' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <div key={i} style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div className="skeleton" style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 11, width: '70%' }} />
            </div>
            <div className="skeleton" style={{ height: 16, width: 40 }} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTimeEntries()
      .then(setEntries)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Derived metrics
  const todayConfirmed = entries.filter(e => e.status === 'confirmed' && isToday(e.created_at));
  const todayUnits = todayConfirmed.reduce((sum, e) => sum + (e.duration_units ?? 0), 0);
  const todayHours = todayUnits * 0.1;
  const todayPct = Math.min(100, (todayHours / DAILY_TARGET) * 100);

  const weekUnits = entries
    .filter(e => e.status === 'confirmed' && isThisWeek(e.created_at))
    .reduce((sum, e) => sum + (e.duration_units ?? 0), 0);
  const weekHours = weekUnits * 0.1;
  const weekPct = Math.min(100, (weekHours / WEEKLY_TARGET) * 100);

  const pendingCount = entries.filter(e => e.status === 'pending').length;
  const confirmedTodayCount = todayConfirmed.length;

  const recent = [...entries]
    .filter(e => e.status === 'confirmed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="dashboard">
      {/* ── Header ── */}
      <header className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Dashboard</h1>
          <span className="page-header__sub">
            {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long' })}
          </span>
        </div>
        <div className="page-header__actions">
          {!loading && pendingCount > 0 && (
            <Link to="/pending" className="btn btn--ghost btn--sm">
              <IconInbox /> {pendingCount} pending
            </Link>
          )}
          <Link to="/log" className="btn btn--primary btn--sm">
            + Log Time
          </Link>
        </div>
      </header>

      <div className="page-body">
        {loading && <DashboardSkeleton />}

        {!loading && error && (
          <div className="state-screen state-screen--error">
            <p className="state-screen__icon">⚠</p>
            <p className="state-screen__title">Could not load data</p>
            <p className="state-screen__sub">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Greeting ── */}
            <div className="db-greeting">
              <h2 className="db-greeting__text">
                Good {greeting()}, Counsel
              </h2>
              <p className="db-greeting__sub">Here's your billing snapshot for today.</p>
            </div>

            {/* ── Hero grid: big hours card + week card ── */}
            <div className="db-hero-grid">
              {/* Today card — dark accent panel */}
              <div className="db-hero-card db-hero-card--accent">
                <div className="db-hero-card__top">
                  <div>
                    <p className="db-hero-card__label">Today's billable hours</p>
                    <div className="db-hero-card__value-row">
                      <span className="db-hero-card__value">{todayHours.toFixed(1)}</span>
                      <span className="db-hero-card__denom">/ {DAILY_TARGET}h</span>
                    </div>
                    <p className="db-hero-card__sub">
                      {Math.round(todayUnits)} of {DAILY_TARGET * 10} units logged
                    </p>
                  </div>
                  <div className="db-hero-card__icon-wrap">
                    <IconTarget />
                  </div>
                </div>
                <div className="progress-bar" style={{ marginTop: 20 }}>
                  <div className="progress-bar__fill" style={{ width: `${todayPct}%` }} />
                </div>
                <p className="db-hero-card__pct">{Math.round(todayPct)}% of daily target</p>
              </div>

              {/* Week card */}
              <div className="card-surface db-week-card">
                <p className="db-week-card__label">This week</p>
                <div className="db-week-card__value-row">
                  <span className="db-week-card__value">{weekHours.toFixed(1)}h</span>
                  <span className="db-week-card__denom">/ {WEEKLY_TARGET}h</span>
                </div>
                <div className="progress-bar" style={{ marginTop: 16 }}>
                  <div className="progress-bar__fill" style={{ width: `${weekPct}%` }} />
                </div>
                <p className="db-week-card__pct">{Math.round(weekPct)}% of weekly target</p>
              </div>
            </div>

            {/* ── Counter cards ── */}
            <div className="db-counters">
              <Link to="/pending" className="card-surface db-counter db-counter--link">
                <div className="db-counter__icon-wrap db-counter__icon-wrap--gold">
                  <IconInbox />
                </div>
                <div className="db-counter__body">
                  <p className="db-counter__label">Pending entries</p>
                  <p className="db-counter__value">{pendingCount}</p>
                </div>
                <span className="db-counter__arrow"><IconArrowRight /></span>
              </Link>

              <div className="card-surface db-counter">
                <div className="db-counter__icon-wrap db-counter__icon-wrap--confirm">
                  <IconCheck />
                </div>
                <div className="db-counter__body">
                  <p className="db-counter__label">Confirmed today</p>
                  <p className="db-counter__value">{confirmedTodayCount}</p>
                </div>
              </div>
            </div>

            {/* ── Recent activity ── */}
            <div className="card-surface db-recent">
              <div className="db-recent__header">
                <div className="db-recent__header-left">
                  <IconClock />
                  <h2 className="db-recent__title">Recent activity</h2>
                </div>
                <Link to="/report" className="db-recent__view-all">View all</Link>
              </div>

              {recent.length === 0 ? (
                <div className="state-screen state-screen--empty" style={{ padding: '40px 24px' }}>
                  <p className="state-screen__title">No confirmed entries yet</p>
                  <p className="state-screen__sub">Approve entries from the Pending Tray.</p>
                </div>
              ) : (
                <ul className="db-recent__list">
                  {recent.map(e => (
                    <li key={e.entry_id} className="db-recent__item">
                      <span className="db-recent__icon" aria-hidden="true">
                        {ACTIVITY_ICONS[e.activity_type ?? ''] ?? '⬡'}
                      </span>
                      <div className="db-recent__item-body">
                        <p className="db-recent__item-title">
                          {e.activity_type ?? 'Activity'}
                          {e.matter_number ? ` · ${e.matter_number}` : ''}
                        </p>
                        <p className="db-recent__item-sub">
                          {e.narration ?? <em>No narration</em>}
                        </p>
                      </div>
                      <div className="db-recent__item-meta">
                        <p className="db-recent__item-hours">{fmtHours(e.duration_units)}h</p>
                        <p className="db-recent__item-date">
                          {new Date(e.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}