import { useState, useEffect, useMemo } from 'react';
import { getTimeEntries } from '../services/api';
import type { TimeEntry } from '../types';
import './Report.css';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtHours(units: number): string {
  return (units * 0.1).toFixed(1);
}

function fmtUnits(units: number): number {
  return units; // 1 unit = 6 min; display raw
}

function currentMonthRange() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1).toISOString();
  const end   = new Date(year, month + 1, 0, 23, 59, 59).toISOString();
  return { start, end, label: now.toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }) };
}

// ─── Group entries by matter ───────────────────────────────────────────────────

interface MatterGroup {
  matter_id: number | null;
  matter_number: string | null;
  client_name: string | null;
  matter_description: string | null;
  entries: TimeEntry[];
  totalUnits: number;
}

function groupByMatter(entries: TimeEntry[]): MatterGroup[] {
  const map = new Map<string, MatterGroup>();
  for (const e of entries) {
    const key = String(e.matter_id ?? 'none');
    if (!map.has(key)) {
      map.set(key, {
        matter_id: e.matter_id ?? null,
        matter_number: e.matter_number ?? null,
        client_name: e.client_name ?? null,
        matter_description: e.matter_description ?? null,
        entries: [],
        totalUnits: 0,
      });
    }
    const g = map.get(key)!;
    g.entries.push(e);
    g.totalUnits += e.duration_units ?? 0;
  }
  return [...map.values()].sort((a, b) => b.totalUnits - a.totalUnits);
}

// ─── Matter card (reference app style) ────────────────────────────────────────

function MatterCard({ group }: { group: MatterGroup }) {
  const [open, setOpen] = useState(false);
  const sorted = [...group.entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="matter-card">
      {/* Card header strip */}
      <button
        className={`matter-card__header${open ? ' matter-card__header--open' : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
      >
        <div className="matter-card__header-left">
          <div>
            <p className="matter-card__number">
              {group.matter_number ?? <span className="matter-card__no-matter">No matter</span>}
            </p>
            <p className="matter-card__client">
              {group.client_name ?? 'Unassigned'}
            </p>
          </div>
        </div>
        <div className="matter-card__header-right">
          <div className="matter-card__subtotal">
            <p className="matter-card__subtotal-label">Subtotal</p>
            <p className="matter-card__subtotal-val">
              {fmtHours(group.totalUnits)}h
              <span className="matter-card__units"> · {fmtUnits(group.totalUnits)}u</span>
            </p>
          </div>
          <span className="matter-card__chevron" aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
        </div>
      </button>

      {/* Expandable entry table */}
      {open && (
        <div className="matter-card__entries">
          <table className="report-entry-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Narration</th>
                <th className="col-right">Hrs</th>
                <th className="col-right">Units</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(e => (
                <tr key={e.entry_id}>
                  <td className="cell-date">
                    {new Date(e.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                  </td>
                  <td>
                    <span className="activity-pill-sm">{e.activity_type ?? '—'}</span>
                  </td>
                  <td className="cell-narration">
                    {e.narration ?? <em className="text-muted">No narration</em>}
                  </td>
                  <td className="col-right mono-val">{fmtHours(e.duration_units ?? 0)}</td>
                  <td className="col-right mono-muted">{fmtUnits(e.duration_units ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Report ────────────────────────────────────────────────────────────────────

export default function Report() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { start, end, label } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const s = new Date(y, m - 1, 1).toISOString();
    const e = new Date(y, m, 0, 23, 59, 59).toISOString();
    return {
      start: s, end: e,
      label: new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' }),
    };
  }, [month]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getTimeEntries({ status: 'confirmed' })
      .then(all => setEntries(all.filter(e => e.created_at >= start && e.created_at <= end)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [start, end]);

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter(e =>
      (e.matter_number  ?? '').toLowerCase().includes(q) ||
      (e.client_name    ?? '').toLowerCase().includes(q) ||
      (e.narration      ?? '').toLowerCase().includes(q) ||
      (e.activity_type  ?? '').toLowerCase().includes(q)
    );
  }, [entries, search]);

  const groups = useMemo(() => groupByMatter(filtered), [filtered]);
  const totalUnits = filtered.reduce((sum, e) => sum + (e.duration_units ?? 0), 0);

  return (
    <div className="report-page">
      {/* ── Header ── */}
      <header className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Fee Earner Report</h1>
          <span className="badge badge--gold">{label}</span>
        </div>
        <div className="page-header__actions">
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="report-month-input"
            aria-label="Select month"
          />
          <input
            className="report-search"
            type="search"
            placeholder="Search matter, client…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search entries"
          />
          <button className="btn btn--ghost btn--sm report-export-btn">
            ↓ Export
          </button>
        </div>
      </header>

      <div className="page-body">
        {loading && (
          <div className="state-screen">
            <div className="spinner" />
            <p>Loading report…</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-screen state-screen--error">
            <p className="state-screen__icon">⚠</p>
            <p className="state-screen__title">Failed to load</p>
            <p className="state-screen__sub">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* ── Summary strip ── */}
            <div className="report-summary">
              <div className="report-summary__item">
                <span className="report-summary__label">Total Hours</span>
                <span className="report-summary__val">{fmtHours(totalUnits)}h</span>
              </div>
              <div className="report-summary__item">
                <span className="report-summary__label">Matters</span>
                <span className="report-summary__val">{groups.length}</span>
              </div>
              <div className="report-summary__item">
                <span className="report-summary__label">Entries</span>
                <span className="report-summary__val">{filtered.length}</span>
              </div>
            </div>

            {/* ── Matter cards ── */}
            {groups.length === 0 ? (
              <div className="state-screen state-screen--empty">
                <p className="state-screen__icon">📋</p>
                <p className="state-screen__title">No confirmed entries this month</p>
                <p className="state-screen__sub">Confirm entries from the Pending Tray to see them here.</p>
              </div>
            ) : (
              <div className="report-cards">
                {groups.map(g => (
                  <MatterCard key={String(g.matter_id)} group={g} />
                ))}

                {/* Grand total */}
                <div className="report-grand-total">
                  <p className="report-grand-total__label">Grand total</p>
                  <p className="report-grand-total__val">
                    {fmtHours(totalUnits)}h
                    <span className="report-grand-total__units"> · {fmtUnits(totalUnits)} units</span>
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}