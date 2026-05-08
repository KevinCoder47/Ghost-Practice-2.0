import { useState, useEffect, useMemo } from 'react';
import { getTimeEntries, getBillingRateMap } from '../services/api';
import type { TimeEntry } from '../types';
import './GhostPractice.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const ATTORNEY_ID = 1;
const DEFAULT_RATE = 350; // ZAR fallback

const GP_CODES: Record<string, string> = {
  email:        'EMAL',
  call:         'TELC',
  meeting:      'MEET',
  draft:        'DRFT',
  review:       'REVW',
  research:     'RSCH',
  court:        'CORT',
  consultation: 'CONS',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtHours(units: number): string {
  return (units * 0.1).toFixed(1);
}

function fmtCurrency(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtDateShort(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
  });
}

function getGPCode(activityType: string | null): string {
  return GP_CODES[(activityType ?? '').toLowerCase()] ?? 'MISC';
}

function calcLineValue(units: number, rate: number): number {
  return units * 0.1 * rate;
}

function todayFormatted(): string {
  return new Date().toLocaleDateString('en-ZA', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupByMatter(
  entries: TimeEntry[],
  rateMap: Map<string, number>
): MatterGroup[] {
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
    g.totalValue += calcLineValue(e.duration_units ?? 0, rate);
  }
  return [...map.values()].sort((a, b) => b.totalValue - a.totalValue);
}

// ─── Single GP Document (one matter = one invoice) ────────────────────────────

interface GPDocumentProps {
  group: MatterGroup;
  month: string;
  docIndex: number;
}

function GPDocument({ group, month, docIndex }: GPDocumentProps) {
  const sorted = [...group.entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const [y, m] = month.split('-').map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-ZA', {
    month: 'long', year: 'numeric',
  });
  const invNumber = `INV-${y}${String(m).padStart(2, '0')}-${String(group.matter_id ?? 0).padStart(4, '0')}`;

  return (
    <div className="gp-document" style={{ animationDelay: `${docIndex * 80}ms` }}>
      {/* GP header strip */}
      <div className="gp-document__header-strip">
        <div className="gp-document__firm-block">
          <span className="gp-document__scales" aria-hidden="true">⚖</span>
          <div>
            <p className="gp-document__firm-name">Mokoena &amp; Associates Inc.</p>
            <p className="gp-document__firm-tagline">Attorneys · Notaries · Conveyancers</p>
          </div>
        </div>
        <div className="gp-document__invoice-meta">
          <div className="gp-document__gp-badge">
            <span className="gp-document__gp-logo">GP</span>
            <span className="gp-document__gp-label">Ghost Practice</span>
          </div>
          <p className="gp-document__inv-num">{invNumber}</p>
          <p className="gp-document__inv-date">{todayFormatted()}</p>
        </div>
      </div>

      {/* Bill-to / period block */}
      <div className="gp-document__parties">
        <div className="gp-document__party">
          <p className="gp-document__party-label">BILL TO</p>
          <p className="gp-document__party-value gp-document__party-value--name">
            {group.client_name ?? 'Unassigned Client'}
          </p>
          {group.matter_number && (
            <p className="gp-document__party-value">Matter ref: {group.matter_number}</p>
          )}
          {group.matter_description && (
            <p className="gp-document__party-value gp-document__party-value--desc">
              {group.matter_description}
            </p>
          )}
        </div>
        <div className="gp-document__party gp-document__party--right">
          <p className="gp-document__party-label">BILLING PERIOD</p>
          <p className="gp-document__party-value gp-document__party-value--name">{monthLabel}</p>
          <p className="gp-document__party-value">
            Rate: <strong>{fmtCurrency(group.rate)}/hr</strong>
            {group.rate === DEFAULT_RATE && (
              <span className="gp-document__rate-note"> (default)</span>
            )}
          </p>
          <p className="gp-document__party-value">Entries: {group.entries.length}</p>
        </div>
      </div>

      {/* Fee lines */}
      <div className="gp-document__table-wrap">
        <table className="gp-document__table">
          <thead>
            <tr>
              <th>Date</th>
              <th>GP Code</th>
              <th className="col-wide">Description of Services Rendered</th>
              <th className="col-right">Units</th>
              <th className="col-right">Hours</th>
              <th className="col-right">Amount (ZAR)</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e, i) => (
              <tr key={e.entry_id} className={i % 2 === 1 ? 'row-alt' : ''}>
                <td className="cell-date">{fmtDateShort(e.created_at)}</td>
                <td>
                  <span className="gp-code-pill">{getGPCode(e.activity_type)}</span>
                </td>
                <td className="cell-narration">{e.narration ?? '—'}</td>
                <td className="col-right mono">{e.duration_units ?? 0}</td>
                <td className="col-right mono">{fmtHours(e.duration_units ?? 0)}</td>
                <td className="col-right mono cell-amount">
                  {fmtCurrency(calcLineValue(e.duration_units ?? 0, group.rate))}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="row-subtotal">
              <td colSpan={3} className="label-cell">SUBTOTAL</td>
              <td className="col-right mono">{group.totalUnits}</td>
              <td className="col-right mono">{fmtHours(group.totalUnits)}h</td>
              <td className="col-right mono">{fmtCurrency(group.totalValue)}</td>
            </tr>
            <tr className="row-vat">
              <td colSpan={5} className="label-cell">VAT @ 15%</td>
              <td className="col-right mono">{fmtCurrency(group.totalValue * 0.15)}</td>
            </tr>
            <tr className="row-total">
              <td colSpan={5} className="label-cell">TOTAL DUE</td>
              <td className="col-right mono total-val">{fmtCurrency(group.totalValue * 1.15)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Mock watermark footer */}
      <div className="gp-document__footer">
        <span className="gp-document__mock-watermark">MOCK PREVIEW — NOT FOR DISTRIBUTION</span>
        <span className="gp-document__footer-sep">·</span>
        <span className="gp-document__footer-note">
          Generated by AutoTime · Export to Ghost Practice for official invoice
        </span>
      </div>
    </div>
  );
}

// ─── Ghost Practice Page ───────────────────────────────────────────────────────

export default function GhostPractice() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateMap, setRateMap] = useState<Map<string, number>>(new Map());
  const [ratesLoading, setRatesLoading] = useState(false);
  const [selectedMatter, setSelectedMatter] = useState<string>('all');

  const [month, setMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { start, end } = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    return {
      start: new Date(y, m - 1, 1).toISOString(),
      end:   new Date(y, m, 0, 23, 59, 59).toISOString(),
    };
  }, [month]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setSelectedMatter('all');
    getTimeEntries({ status: 'confirmed', attorney_id: ATTORNEY_ID })
      .then(all => {
        const s = new Date(start).getTime();
        const e = new Date(end).getTime();
        return all.filter(entry => {
          const t = new Date(entry.created_at).getTime();
          return t >= s && t <= e;
        });
      })
      .then(filtered => {
        setEntries(filtered);
        if (filtered.length > 0) {
          setRatesLoading(true);
          getBillingRateMap(filtered, ATTORNEY_ID)
            .then(setRateMap)
            .catch(() => {
              const fallback = new Map<string, number>();
              for (const e of filtered) {
                fallback.set(String(e.matter_id ?? 'none'), DEFAULT_RATE);
              }
              setRateMap(fallback);
            })
            .finally(() => setRatesLoading(false));
        }
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [start, end]);

  const allGroups  = useMemo(() => groupByMatter(entries, rateMap), [entries, rateMap]);
  const groups     = selectedMatter === 'all'
    ? allGroups
    : allGroups.filter(g => String(g.matter_id ?? 'none') === selectedMatter);

  const totalUnits = groups.reduce((s, g) => s + g.totalUnits, 0);
  const totalValue = groups.reduce((s, g) => s + g.totalValue, 0);

  const [y, m] = month.split('-').map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-ZA', {
    month: 'long', year: 'numeric',
  });

  return (
    <div className="gp-page">
      {/* ── Header ── */}
      <header className="page-header gp-page__header">
        <div className="page-header__left">
          <div className="gp-page__title-row">
            <span className="gp-page__gp-badge" aria-hidden="true">GP</span>
            <div>
              <h1 className="page-header__title">Ghost Practice Output</h1>
              <p className="page-header__sub">
                Mock invoice format · {monthLabel}
                <span className="gp-page__mock-tag">PREVIEW</span>
              </p>
            </div>
          </div>
        </div>

        <div className="page-header__actions">
          {/* Matter filter */}
          {allGroups.length > 1 && (
            <select
              className="gp-page__matter-filter"
              value={selectedMatter}
              onChange={e => setSelectedMatter(e.target.value)}
              aria-label="Filter by matter"
            >
              <option value="all">All matters</option>
              {allGroups.map(g => (
                <option key={String(g.matter_id)} value={String(g.matter_id ?? 'none')}>
                  {g.matter_number
                    ? `${g.matter_number} · ${g.client_name ?? 'Unknown'}`
                    : g.client_name ?? 'No matter'}
                </option>
              ))}
            </select>
          )}
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="report-month-input"
            aria-label="Select month"
          />
          <button className="btn btn--export" disabled title="Connect GP to enable export">
            ↓ Export All to GP
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="page-body gp-page__body">

        {loading && (
          <div className="state-screen">
            <div className="spinner" />
            <p>Loading Ghost Practice preview…</p>
          </div>
        )}

        {!loading && error && (
          <div className="state-screen state-screen--error">
            <p className="state-screen__icon">⚠</p>
            <p className="state-screen__title">Failed to load</p>
            <p className="state-screen__sub">{error}</p>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="state-screen state-screen--empty">
            <p className="state-screen__icon">📄</p>
            <p className="state-screen__title">No confirmed entries for {monthLabel}</p>
            <p className="state-screen__sub">
              Confirm entries from the Pending Tray — they'll appear here as Ghost Practice invoice lines.
            </p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            {/* Rates loading indicator */}
            {ratesLoading && (
              <div className="gp-page__rate-notice">
                <span className="spinner spinner--sm" /> Fetching billing rates from records…
              </div>
            )}

            {/* Summary bar */}
            <div className="gp-page__summary">
              <div className="gp-page__summary-stat">
                <span className="gp-page__summary-label">Documents</span>
                <span className="gp-page__summary-val">{groups.length}</span>
              </div>
              <div className="gp-page__summary-divider" />
              <div className="gp-page__summary-stat">
                <span className="gp-page__summary-label">Total Hours</span>
                <span className="gp-page__summary-val">{fmtHours(totalUnits)}h</span>
              </div>
              <div className="gp-page__summary-divider" />
              <div className="gp-page__summary-stat">
                <span className="gp-page__summary-label">Fees</span>
                <span className="gp-page__summary-val gp-page__summary-val--money">
                  {fmtCurrency(totalValue)}
                </span>
              </div>
              <div className="gp-page__summary-divider" />
              <div className="gp-page__summary-stat">
                <span className="gp-page__summary-label">VAT (15%)</span>
                <span className="gp-page__summary-val">{fmtCurrency(totalValue * 0.15)}</span>
              </div>
              <div className="gp-page__summary-divider" />
              <div className="gp-page__summary-stat gp-page__summary-stat--total">
                <span className="gp-page__summary-label">Total Due</span>
                <span className="gp-page__summary-val gp-page__summary-val--total">
                  {fmtCurrency(totalValue * 1.15)}
                </span>
              </div>
            </div>

            {/* One GP document per matter */}
            <div className="gp-page__documents">
              {groups.map((g, i) => (
                <GPDocument
                  key={String(g.matter_id)}
                  group={g}
                  month={month}
                  docIndex={i}
                />
              ))}
            </div>

            <p className="gp-page__disclaimer">
              ⓘ These are Ghost Practice output simulations for demo purposes only.
              Figures are not final. Export to Ghost Practice to generate official invoices.
            </p>
          </>
        )}
      </div>
    </div>
  );
}