import { useState, useEffect, useMemo } from 'react';
import { getTimeEntries, getBillingRateMap } from '../services/api';
import type { TimeEntry } from '../types';
import './Invoice.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const ATTORNEY_ID = 1;
const DEFAULT_RATE = 350; // ZAR fallback — used until DB rates load

// GP activity code mapping (mock Ghost Practice codes)
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

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconFileInvoice() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  );
}

function IconEye() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

function IconGrid() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
    </svg>
  );
}

function IconDownload() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

// ─── GP Preview Modal ─────────────────────────────────────────────────────────

interface GPPreviewProps {
  group: MatterGroup;
  month: string;
  onClose: () => void;
}

function GPPreviewModal({ group, month, onClose }: GPPreviewProps) {
  const sorted = [...group.entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const [y, m] = month.split('-').map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });
  const invNumber = `INV-${y}${String(m).padStart(2, '0')}-${String(group.matter_id ?? 0).padStart(4, '0')}`;

  return (
    <div className="gp-overlay" onClick={onClose}>
      <div className="gp-modal" onClick={e => e.stopPropagation()}>
        <div className="gp-doc">
          {/* Firm letterhead */}
          <div className="gp-doc__letterhead">
            <div className="gp-doc__firm">
              <span className="gp-doc__firm-logo">⚖</span>
              <div>
                <p className="gp-doc__firm-name">Mokoena &amp; Associates Inc.</p>
                <p className="gp-doc__firm-sub">Attorneys · Notaries · Conveyancers</p>
              </div>
            </div>
            <div className="gp-doc__meta">
              <p className="gp-doc__label">GHOST PRACTICE</p>
              <p className="gp-doc__inv-num">{invNumber}</p>
              <p className="gp-doc__date">{todayFormatted()}</p>
            </div>
          </div>

          <div className="gp-doc__divider" />

          {/* Client / matter block */}
          <div className="gp-doc__parties">
            <div className="gp-doc__party">
              <p className="gp-doc__party-label">BILL TO</p>
              <p className="gp-doc__party-name">{group.client_name ?? 'Unassigned Client'}</p>
              {group.matter_number && (
                <p className="gp-doc__party-matter">Matter: {group.matter_number}</p>
              )}
              {group.matter_description && (
                <p className="gp-doc__party-desc">{group.matter_description}</p>
              )}
            </div>
            <div className="gp-doc__party gp-doc__party--right">
              <p className="gp-doc__party-label">PERIOD</p>
              <p className="gp-doc__party-name">{monthLabel}</p>
              <p className="gp-doc__party-matter">Rate: {fmtCurrency(group.rate)}/hr</p>
            </div>
          </div>

          {/* Fee lines table */}
          <table className="gp-table">
            <thead>
              <tr>
                <th className="gp-th">Date</th>
                <th className="gp-th">Code</th>
                <th className="gp-th gp-th--wide">Description of Services Rendered</th>
                <th className="gp-th gp-th--right">Units</th>
                <th className="gp-th gp-th--right">Hours</th>
                <th className="gp-th gp-th--right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={e.entry_id} className={i % 2 === 0 ? 'gp-tr' : 'gp-tr gp-tr--alt'}>
                  <td className="gp-td gp-td--date">{fmtDateShort(e.created_at)}</td>
                  <td className="gp-td gp-td--code">{getGPCode(e.activity_type)}</td>
                  <td className="gp-td gp-td--narration">{e.narration ?? '—'}</td>
                  <td className="gp-td gp-td--right">{e.duration_units ?? 0}</td>
                  <td className="gp-td gp-td--right">{fmtHours(e.duration_units ?? 0)}</td>
                  <td className="gp-td gp-td--right gp-td--amount">
                    {fmtCurrency(calcLineValue(e.duration_units ?? 0, group.rate))}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="gp-tfoot">
                <td colSpan={3} className="gp-td gp-td--total-label">SUBTOTAL</td>
                <td className="gp-td gp-td--right gp-td--total">{group.totalUnits}</td>
                <td className="gp-td gp-td--right gp-td--total">{fmtHours(group.totalUnits)}h</td>
                <td className="gp-td gp-td--right gp-td--total">{fmtCurrency(group.totalValue)}</td>
              </tr>
              <tr className="gp-tfoot gp-tfoot--vat">
                <td colSpan={5} className="gp-td gp-td--total-label">VAT @ 15%</td>
                <td className="gp-td gp-td--right gp-td--total">
                  {fmtCurrency(group.totalValue * 0.15)}
                </td>
              </tr>
              <tr className="gp-tfoot gp-tfoot--grand">
                <td colSpan={5} className="gp-td gp-td--total-label">TOTAL DUE</td>
                <td className="gp-td gp-td--right gp-td--total">
                  {fmtCurrency(group.totalValue * 1.15)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Footer note */}
          <div className="gp-doc__footer">
            <p className="gp-doc__footer-note">
              <span className="gp-doc__mock-badge">MOCK PREVIEW</span>
              This document is a Ghost Practice output simulation. Rate: {fmtCurrency(group.rate)}/hr
              {group.rate === DEFAULT_RATE ? ' (default fallback — set rate in GP to override)' : ' (from billing records)'}.
              Export to GP to generate the official invoice.
            </p>
          </div>
        </div>

        {/* Modal controls */}
        <div className="gp-modal__actions">
          <button className="btn btn--ghost btn--sm" onClick={onClose}>
            ✕ Close Preview
          </button>
          <button className="btn btn--export" disabled title="Connect GP to enable export">
            <IconDownload /> Export to GP
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Invoice Matter Card ───────────────────────────────────────────────────────

interface InvoiceCardProps {
  group: MatterGroup;
  index: number;
  onPreview: (group: MatterGroup) => void;
}

function InvoiceCard({ group, index, onPreview }: InvoiceCardProps) {
  const [expanded, setExpanded] = useState(true);
  const sorted = [...group.entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <div className="inv-card" style={{ animationDelay: `${index * 50}ms` }}>
      <div className="inv-card__header">
        <button
          className="inv-card__toggle"
          onClick={() => setExpanded(e => !e)}
          aria-expanded={expanded}
          aria-label="Toggle entries"
        >
          <span className="inv-card__chevron">{expanded ? '▾' : '▸'}</span>
        </button>

        <div className="inv-card__matter">
          <div className="inv-card__matter-top">
            <span className="inv-card__matter-num">
              {group.matter_number ?? <span className="inv-card__unassigned">No matter</span>}
            </span>
            <span className="inv-card__entry-count">
              {group.entries.length} {group.entries.length === 1 ? 'entry' : 'entries'}
            </span>
          </div>
          <p className="inv-card__client">{group.client_name ?? 'Unassigned client'}</p>
          {group.matter_description && (
            <p className="inv-card__desc">{group.matter_description}</p>
          )}
        </div>

        <div className="inv-card__totals">
          <div className="inv-card__total-col">
            <span className="inv-card__total-label">Rate</span>
            <span className="inv-card__total-val">{fmtCurrency(group.rate)}/hr</span>
          </div>
          <div className="inv-card__total-col">
            <span className="inv-card__total-label">Hours</span>
            <span className="inv-card__total-val">{fmtHours(group.totalUnits)}h</span>
          </div>
          <div className="inv-card__total-col">
            <span className="inv-card__total-label">Units</span>
            <span className="inv-card__total-val">{group.totalUnits}</span>
          </div>
          <div className="inv-card__total-col inv-card__total-col--value">
            <span className="inv-card__total-label">Value</span>
            <span className="inv-card__total-val inv-card__total-val--money">
              {fmtCurrency(group.totalValue)}
            </span>
          </div>
          <button
            className="inv-card__preview-btn"
            onClick={() => onPreview(group)}
            title="Preview GP invoice"
          >
            <IconEye />
            <span>GP Preview</span>
          </button>
        </div>
      </div>

      {expanded && (
        <div className="inv-card__lines">
          <table className="inv-table">
            <thead>
              <tr>
                <th className="inv-th">Date</th>
                <th className="inv-th">GP Code</th>
                <th className="inv-th inv-th--wide">Narration</th>
                <th className="inv-th inv-th--right">Units</th>
                <th className="inv-th inv-th--right">Hrs</th>
                <th className="inv-th inv-th--right">Value</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(e => (
                <tr key={e.entry_id} className="inv-tr">
                  <td className="inv-td inv-td--date">{fmtDateShort(e.created_at)}</td>
                  <td className="inv-td">
                    <span className="inv-gp-code">{getGPCode(e.activity_type)}</span>
                  </td>
                  <td className="inv-td inv-td--narration">
                    {e.narration ?? <em className="text-muted">No narration</em>}
                  </td>
                  <td className="inv-td inv-td--right inv-td--mono">{e.duration_units ?? 0}</td>
                  <td className="inv-td inv-td--right inv-td--mono">{fmtHours(e.duration_units ?? 0)}</td>
                  <td className="inv-td inv-td--right inv-td--money">
                    {fmtCurrency(calcLineValue(e.duration_units ?? 0, group.rate))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Invoice Page ──────────────────────────────────────────────────────────────

export default function Invoice() {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewGroup, setPreviewGroup] = useState<MatterGroup | null>(null);
  // rateMap: matter key → ZAR/hr
  const [rateMap, setRateMap] = useState<Map<string, number>>(new Map());
  const [ratesLoading, setRatesLoading] = useState(false);

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

  // Fetch confirmed entries for the selected month
  useEffect(() => {
    setLoading(true);
    setError(null);
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
        // Kick off rate fetching for this set of entries
        if (filtered.length > 0) {
          setRatesLoading(true);
          getBillingRateMap(filtered, ATTORNEY_ID)
            .then(setRateMap)
            .catch(() => {
              // On any error, build a default map so the page still renders
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

  const groups     = useMemo(() => groupByMatter(entries, rateMap), [entries, rateMap]);
  const totalUnits = entries.reduce((s, e) => s + (e.duration_units ?? 0), 0);
  const totalValue = groups.reduce((s, g) => s + g.totalValue, 0);

  const [y, m] = month.split('-').map(Number);
  const monthLabel = new Date(y, m - 1, 1).toLocaleDateString('en-ZA', { month: 'long', year: 'numeric' });

  // Indicates rates came from DB vs all-default
  const usingDefaultRates = rateMap.size > 0 && [...rateMap.values()].every(r => r === DEFAULT_RATE);

  return (
    <div className="inv-page">
      {/* ── Header ── */}
      <header className="page-header inv-page__header">
        <div className="page-header__left">
          <div className="inv-page__title-row">
            <span className="inv-page__title-icon"><IconFileInvoice /></span>
            <div>
              <h1 className="page-header__title">Invoice Summary</h1>
              <p className="page-header__sub">Ghost Practice output preview · {monthLabel}</p>
            </div>
          </div>
        </div>
        <div className="page-header__actions">
          <div className="inv-view-toggle">
            <button className="inv-view-toggle__btn inv-view-toggle__btn--active">
              <IconGrid /> Summary
            </button>
          </div>
          <input
            type="month"
            value={month}
            onChange={e => setMonth(e.target.value)}
            className="report-month-input"
            aria-label="Select month"
          />
          <button className="btn btn--export" disabled title="Connect GP to enable export">
            <IconDownload /> Export All to GP
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="page-body inv-page__body">

        {loading && (
          <div className="state-screen">
            <div className="spinner" />
            <p>Loading invoice data…</p>
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
            <p className="state-screen__icon">🧾</p>
            <p className="state-screen__title">No confirmed entries for {monthLabel}</p>
            <p className="state-screen__sub">
              Confirm entries from the Pending Tray — they'll appear here as billable invoice lines.
            </p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            {/* Rate info banner */}
            {ratesLoading ? (
              <div className="inv-rate-banner inv-rate-banner--loading">
                <span className="spinner spinner--sm" /> Fetching billing rates…
              </div>
            ) : usingDefaultRates ? (
              <div className="inv-rate-banner inv-rate-banner--default">
                ⓘ Using default rate of {fmtCurrency(DEFAULT_RATE)}/hr.
                Set <code>billing_rate</code> on matters or <code>hourly_rate</code> on attorneys in Ghost Practice to override per matter.
              </div>
            ) : (
              <div className="inv-rate-banner inv-rate-banner--live">
                ✓ Rates loaded from billing records — some matters may use per-matter rates.
              </div>
            )}

            {/* Summary strip */}
            <div className="inv-summary-strip">
              <div className="inv-summary-strip__stat">
                <span className="inv-summary-strip__label">Matters</span>
                <span className="inv-summary-strip__val">{groups.length}</span>
              </div>
              <div className="inv-summary-strip__divider" />
              <div className="inv-summary-strip__stat">
                <span className="inv-summary-strip__label">Total Entries</span>
                <span className="inv-summary-strip__val">{entries.length}</span>
              </div>
              <div className="inv-summary-strip__divider" />
              <div className="inv-summary-strip__stat">
                <span className="inv-summary-strip__label">Total Hours</span>
                <span className="inv-summary-strip__val">{fmtHours(totalUnits)}h</span>
              </div>
              <div className="inv-summary-strip__divider" />
              <div className="inv-summary-strip__stat">
                <span className="inv-summary-strip__label">Billable Value</span>
                <span className="inv-summary-strip__val inv-summary-strip__val--money">
                  {fmtCurrency(totalValue)}
                </span>
              </div>
              <div className="inv-summary-strip__divider" />
              <div className="inv-summary-strip__stat">
                <span className="inv-summary-strip__label">VAT (15%)</span>
                <span className="inv-summary-strip__val">{fmtCurrency(totalValue * 0.15)}</span>
              </div>
              <div className="inv-summary-strip__divider" />
              <div className="inv-summary-strip__stat inv-summary-strip__stat--total">
                <span className="inv-summary-strip__label">Total Due</span>
                <span className="inv-summary-strip__val inv-summary-strip__val--total">
                  {fmtCurrency(totalValue * 1.15)}
                </span>
              </div>
            </div>

            {/* Matter cards */}
            <div className="inv-cards">
              {groups.map((g, i) => (
                <InvoiceCard
                  key={String(g.matter_id)}
                  group={g}
                  index={i}
                  onPreview={setPreviewGroup}
                />
              ))}
            </div>

            {/* Grand total bar */}
            <div className="inv-grand-total">
              <div className="inv-grand-total__left">
                <span className="inv-grand-total__label">GRAND TOTAL</span>
                <span className="inv-grand-total__sub">
                  {entries.length} entries · {groups.length} matters · {fmtHours(totalUnits)}h
                </span>
              </div>
              <div className="inv-grand-total__right">
                <div className="inv-grand-total__breakdown">
                  <span className="inv-grand-total__breakdown-item">
                    Fees: <strong>{fmtCurrency(totalValue)}</strong>
                  </span>
                  <span className="inv-grand-total__breakdown-sep">+</span>
                  <span className="inv-grand-total__breakdown-item">
                    VAT: <strong>{fmtCurrency(totalValue * 0.15)}</strong>
                  </span>
                  <span className="inv-grand-total__breakdown-sep">=</span>
                </div>
                <span className="inv-grand-total__val">{fmtCurrency(totalValue * 1.15)}</span>
              </div>
            </div>

            <p className="inv-disclaimer">
              ⓘ Values are a Ghost Practice output simulation and are not final until exported.
              {usingDefaultRates
                ? ` Using default rate of ${fmtCurrency(DEFAULT_RATE)}/hr.`
                : ' Rates sourced from billing records where available.'}
            </p>
          </>
        )}
      </div>

      {/* ── GP Preview Modal ── */}
      {previewGroup && (
        <GPPreviewModal
          group={previewGroup}
          month={month}
          onClose={() => setPreviewGroup(null)}
        />
      )}
    </div>
  );
}