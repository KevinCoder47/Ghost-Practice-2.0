import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getTimeEntries } from '../services/api';
import type { TimeEntry } from '../types';
import './Dashboard.css';

// ─── Constants ────────────────────────────────────────────────────────────────

// FIX: Centralise attorney — swap to auth context when multi-user auth is added
const ATTORNEY_ID = 1;
const DAILY_TARGET = 8;
const WEEKLY_TARGET = 40;

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

// Maps activity type → icon class + emoji
const ACTIVITY_ICON_MAP: Record<string, { cls: string; emoji: string }> = {
  meeting:      { cls: 'db-recent__icon--meeting',  emoji: '👥' },
  consultation: { cls: 'db-recent__icon--meeting',  emoji: '💬' },
  call:         { cls: 'db-recent__icon--call',     emoji: '📞' },
  email:        { cls: 'db-recent__icon--email',    emoji: '✉' },
  draft:        { cls: 'db-recent__icon--document', emoji: '✍' },
  review:       { cls: 'db-recent__icon--document', emoji: '📄' },
  research:     { cls: 'db-recent__icon--document', emoji: '📋' },
  court:        { cls: 'db-recent__icon--meeting',  emoji: '⚖' },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconTarget() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <circle cx="12" cy="12" r="6"/>
      <circle cx="12" cy="12" r="2"/>
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

function IconCheckCircle() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  );
}

function IconClock() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/>
      <polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="db-skeleton">
      <div className="db-skeleton__hero">
        <div className="skeleton" style={{ height: 16, width: 160, marginBottom: 12 }} />
        <div className="skeleton" style={{ height: 52, width: 130, marginBottom: 8 }} />
        <div className="skeleton" style={{ height: 6, borderRadius: 20, marginTop: 20 }} />
      </div>
      <div className="db-skeleton__counters">
        {[0, 1].map(i => (
          <div key={i} style={{
            background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14,
            padding: 20, display: 'flex', gap: 14, alignItems: 'center',
          }}>
            <div className="skeleton" style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 12, width: '60%', marginBottom: 8 }} />
              <div className="skeleton" style={{ height: 28, width: '35%' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{
            padding: '14px 24px', borderBottom: '1px solid #f9fafb',
            display: 'flex', gap: 12, alignItems: 'center',
          }}>
            <div className="skeleton" style={{ width: 34, height: 34, borderRadius: 9, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div className="skeleton" style={{ height: 12, width: '40%', marginBottom: 6 }} />
              <div className="skeleton" style={{ height: 11, width: '65%' }} />
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="skeleton" style={{ height: 14, width: 36, marginBottom: 4 }} />
              <div className="skeleton" style={{ height: 10, width: 30 }} />
            </div>
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
    // FIX: Filter by attorney_id so metrics only reflect the logged-in attorney,
    // not every attorney in the database.
    getTimeEntries({ attorney_id: ATTORNEY_ID })
      .then(setEntries)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Derived metrics ──────────────────────────────────────────────────────────

  const todayConfirmed = entries.filter(
    e => e.status === 'confirmed' && isToday(e.created_at)
  );
  const todayUnits = todayConfirmed.reduce((sum, e) => sum + (e.duration_units ?? 0), 0);
  const todayHours = todayUnits * 0.1;
  const todayPct   = Math.min(100, (todayHours / DAILY_TARGET) * 100);

  const weekUnits = entries
    .filter(e => e.status === 'confirmed' && isThisWeek(e.created_at))
    .reduce((sum, e) => sum + (e.duration_units ?? 0), 0);
  const weekHours = weekUnits * 0.1;
  const weekPct   = Math.min(100, (weekHours / WEEKLY_TARGET) * 100);

  const pendingCount       = entries.filter(e => e.status === 'pending').length;
  const confirmedTodayCount = todayConfirmed.length;

  const recent = [...entries]
    .filter(e => e.status === 'confirmed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 6);

  return (
    <div className="dashboard">
      {/* ── Greeting header ── */}
      <div className="db-inner-header">
        <h2 className="db-greeting__text">Good {greeting()}, Kevin</h2>
        <p className="db-greeting__sub">Here's your billing snapshot for today.</p>
      </div>

      <div className="db-body">
        {loading && <DashboardSkeleton />}

        {!loading && error && (
          <div style={{
            background: '#fff', border: '1px solid #fecaca', borderRadius: 14,
            padding: '40px 32px', textAlign: 'center', color: '#6b7280',
          }}>
            <p style={{ fontSize: '2rem', marginBottom: 8 }}>⚠</p>
            <p style={{ fontWeight: 600, color: '#111827', marginBottom: 4 }}>Could not load data</p>
            <p style={{ fontSize: '0.875rem' }}>{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Hero grid ── */}
            <div className="db-hero-grid">
              {/* Today billable hours */}
              <div className="db-hero-card db-hero-card--accent">
                <div className="db-hero-card__top">
                  <div>
                    <p className="db-hero-card__label">Today's Billable Hours</p>
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
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${todayPct}%` }} />
                </div>
                <p className="db-hero-card__pct">{Math.round(todayPct)}% of daily target</p>
              </div>

              {/* This week */}
              <div className="db-week-card">
                <p className="db-week-card__label">This Week</p>
                <div className="db-week-card__value-row">
                  <span className="db-week-card__value">{weekHours.toFixed(1)}h</span>
                  <span className="db-week-card__denom">/ {WEEKLY_TARGET}h</span>
                </div>
                <div className="progress-bar">
                  <div className="progress-bar__fill" style={{ width: `${weekPct}%` }} />
                </div>
                <p className="db-week-card__pct">{Math.round(weekPct)}% of weekly target</p>
              </div>
            </div>

            {/* ── Counter cards ── */}
            <div className="db-counters">
              <Link to="/pending" className="db-counter db-counter--link">
                <div className="db-counter__icon-wrap db-counter__icon-wrap--pending">
                  <IconInbox />
                </div>
                <div className="db-counter__body">
                  <p className="db-counter__label">Pending entries</p>
                  <p className="db-counter__value">{pendingCount}</p>
                </div>
                <span className="db-counter__arrow"><IconArrowRight /></span>
              </Link>

              <div className="db-counter">
                <div className="db-counter__icon-wrap db-counter__icon-wrap--confirm">
                  <IconCheckCircle />
                </div>
                <div className="db-counter__body">
                  <p className="db-counter__label">Confirmed today</p>
                  <p className="db-counter__value">{confirmedTodayCount}</p>
                </div>
              </div>
            </div>

            {/* ── Recent activity ── */}
            <div className="db-recent">
              <div className="db-recent__header">
                <div className="db-recent__header-left">
                  <IconClock />
                  <h2 className="db-recent__title">Recent activity</h2>
                </div>
                <Link to="/report" className="db-recent__view-all">View all</Link>
              </div>

              {recent.length === 0 ? (
                <div style={{ padding: '40px 24px', textAlign: 'center', color: '#9ca3af' }}>
                  <p style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No confirmed entries yet</p>
                  <p style={{ fontSize: '0.875rem' }}>Approve entries from the Pending Tray.</p>
                </div>
              ) : (
                <ul className="db-recent__list">
                  {recent.map(e => {
                    const actKey = (e.activity_type ?? '').toLowerCase();
                    const iconInfo = ACTIVITY_ICON_MAP[actKey] ?? { cls: 'db-recent__icon--default', emoji: '⬡' };
                    return (
                      <li key={e.entry_id} className="db-recent__item">
                        <span className={`db-recent__icon ${iconInfo.cls}`} aria-hidden="true">
                          {iconInfo.emoji}
                        </span>
                        <div className="db-recent__item-body">
                          <p className="db-recent__item-title">
                            {e.activity_type
                              ? e.activity_type.charAt(0).toUpperCase() + e.activity_type.slice(1)
                              : 'Activity'}
                            {e.matter_number ? ` · ${e.matter_number}` : ''}
                          </p>
                          <p className="db-recent__item-sub">
                            {e.narration ?? 'No narration'}
                          </p>
                        </div>
                        <div className="db-recent__item-meta">
                          <p className="db-recent__item-hours">{fmtHours(e.duration_units)}h</p>
                          <p className="db-recent__item-date">
                            {new Date(e.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}