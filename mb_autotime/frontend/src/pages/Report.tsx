import { useState, useEffect, useMemo } from 'react';
import { getTimeEntries, getProductivityReport, getBillingRateMap } from '../services/api';
import type { ProductivityRow } from '../services/api';
import type { TimeEntry } from '../types';
import './Report.css';

// ─── Constants ────────────────────────────────────────────────────────────────

// FIX: Filter report by current attorney — same constant as Dashboard / Review.
// Swap for auth context when multi-user login is added.
const ATTORNEY_ID = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtHours(units: number): string {
  return (units * 0.1).toFixed(1);
}

function fmtUnits(units: number): number {
  return units;
}

function fmtCurrency(amount: number): string {
  return 'R ' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// ─── Group entries by matter ───────────────────────────────────────────────────

interface MatterGroup {
  matter_id: number | null;
  matter_number: string | null;
  client_name: string | null;
  matter_description: string | null;
  entries: TimeEntry[];
  totalUnits: number;
  totalValue: number;
  rate: number;
}

function groupByMatter(entries: TimeEntry[], rateMap: Map<string, number>): MatterGroup[] {
  const DEFAULT_RATE = 350;
  const map = new Map<string, MatterGroup>();
  for (const e of entries) {
    const key = String(e.matter_id ?? 'none');
    const rate = rateMap.get(key) ?? DEFAULT_RATE;
    if (!map.has(key)) {
      map.set(key, {
        matter_id: e.matter_id ?? null,
        matter_number: e.matter_number ?? null,
        client_name: e.client_name ?? null,
        matter_description: e.matter_description ?? null,
        entries: [],
        totalUnits: 0,
        totalValue: 0,
        rate,
      });
    }
    const g = map.get(key)!;
    g.entries.push(e);
    g.totalUnits += e.duration_units ?? 0;
    g.totalValue += (e.duration_units ?? 0) * 0.1 * rate;
  }
  return [...map.values()].sort((a, b) => b.totalUnits - a.totalUnits);
}

// ─── Matter card ──────────────────────────────────────────────────────────────

function MatterCard({ group }: { group: MatterGroup }) {
  const sorted = [...group.entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="matter-card">
      {/* Card header */}
      <div className="matter-card__header">
        <div className="matter-card__header-left">
          <p className="matter-card__number">
            {group.matter_number ?? <span className="matter-card__no-matter">No matter</span>}
          </p>
          <p className="matter-card__client">
            {group.client_name ?? 'Unassigned'}
          </p>
        </div>
        <div className="matter-card__subtotal">
          <p className="matter-card__subtotal-label">Subtotal</p>
          <p className="matter-card__subtotal-val">
            {fmtHours(group.totalUnits)}h
            <span className="matter-card__units"> · {fmtUnits(group.totalUnits)}u</span>
          </p>
          <p className="matter-card__subtotal-value">{fmtCurrency(group.totalValue)}</p>
        </div>
      </div>

      {/* Entry table */}
      <div className="matter-card__entries">
        <table className="report-entry-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th>Narration</th>
              <th className="col-right">Hrs</th>
              <th className="col-right">Units</th>
              <th className="col-right">Value</th>
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
                <td className="col-right mono-val cell-value">
                  {fmtCurrency((e.duration_units ?? 0) * 0.1 * group.rate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Report ────────────────────────────────────────────────────────────────────

export default function Report() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productivity, setProductivity] = useState<ProductivityRow | null>(null);
  const [rateMap, setRateMap] = useState<Map<string, number>>(new Map());

  // FIX: search state was declared but never had a wired <input> in the JSX.
  const [search, setSearch] = useState('');

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { start, end } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const s = new Date(y, m - 1, 1).toISOString();
    const e = new Date(y, m, 0, 23, 59, 59).toISOString();
    return { start: s, end: e };
  }, [month]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    const entriesPromise = getTimeEntries({ status: 'confirmed', attorney_id: ATTORNEY_ID })
      .then(all => {
        const startMs = new Date(start).getTime();
        const endMs   = new Date(end).getTime();
        return all.filter(e => {
          const t = new Date(e.created_at).getTime();
          return t >= startMs && t <= endMs;
        });
      });

    const productivityPromise = getProductivityReport()
      .then(rows => {
        const row = rows.find(r => r.attorney_id === ATTORNEY_ID) ?? null;
        setProductivity(row);
      })
      .catch(() => setProductivity(null));

    Promise.all([entriesPromise, productivityPromise])
      .then(([filtered]) => {
        setEntries(filtered);
        if (filtered.length > 0) {
          return getBillingRateMap(filtered, ATTORNEY_ID).then(setRateMap).catch(() => {});
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [start, end]);

  // FIX: search filter now actually works because `search` is wired to an input below.
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

  const groups     = useMemo(() => groupByMatter(filtered, rateMap), [filtered, rateMap]);
  const totalUnits = filtered.reduce((sum, e) => sum + (e.duration_units ?? 0), 0);
  const totalValue = groups.reduce((sum, g) => sum + g.totalValue, 0);

  return (
    <div className="report-page">
      {/* ── Header ── */}
      <header className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Fee Earner Report</h1>
          <p className="page-header__sub">All confirmed time entries grouped by matter.</p>
        </div>

        <div className="page-header__actions">
          {/* FIX: search input now wired to `search` state — was missing from JSX entirely */}
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search matters, clients, narration…"
            className="report-search-input"
            aria-label="Search entries"
          />
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="report-month-input"
            aria-label="Select month"
          />
          <button className="btn btn--export">
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
            {/* Productivity strip */}
            {productivity && (
              <div className="report-productivity-strip">
                <div className="report-productivity-strip__stat">
                  <span className="report-productivity-strip__label">Confirmed</span>
                  <span className="report-productivity-strip__val">{productivity.confirmed_hours}h</span>
                </div>
                <div className="report-productivity-strip__divider" />
                <div className="report-productivity-strip__stat">
                  <span className="report-productivity-strip__label">Target</span>
                  <span className="report-productivity-strip__val">
                    {productivity.monthly_target_hours ?? '—'}h
                  </span>
                </div>
                <div className="report-productivity-strip__divider" />
                <div className="report-productivity-strip__stat">
                  <span className="report-productivity-strip__label">Pending</span>
                  <span className="report-productivity-strip__val report-productivity-strip__val--pending">
                    {productivity.pending_entries}
                  </span>
                </div>
                <div className="report-productivity-strip__divider" />
                <div className="report-productivity-strip__progress-wrap">
                  <div className="report-productivity-strip__progress-header">
                    <span className="report-productivity-strip__label">vs Target</span>
                    <span className="report-productivity-strip__pct">
                      {productivity.pct_of_target}%
                    </span>
                  </div>
                  <div className="report-productivity-strip__bar">
                    <div
                      className={`report-productivity-strip__fill ${
                        productivity.pct_of_target >= 100
                          ? 'report-productivity-strip__fill--complete'
                          : productivity.pct_of_target >= 60
                          ? 'report-productivity-strip__fill--mid'
                          : 'report-productivity-strip__fill--low'
                      }`}
                      style={{ width: `${Math.min(productivity.pct_of_target, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
            {/* Search active but no results */}
            {groups.length === 0 && search.trim() ? (
              <div className="state-screen state-screen--empty">
                <p className="state-screen__icon">🔍</p>
                <p className="state-screen__title">No results for "{search}"</p>
                <p className="state-screen__sub">Try a different matter number, client name, or activity type.</p>
              </div>
            ) : groups.length === 0 ? (
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
                  <p className="report-grand-total__label">Grand Total</p>
                  <p className="report-grand-total__val">
                    {fmtHours(totalUnits)}h
                    <span className="report-grand-total__units"> · {fmtUnits(totalUnits)} units</span>
                  </p>
                  <p className="report-grand-total__value">{fmtCurrency(totalValue)}</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}