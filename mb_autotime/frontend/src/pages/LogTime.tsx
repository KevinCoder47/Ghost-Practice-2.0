import { useState, useEffect, useRef } from 'react';
import { getMatters, createTimeEntry } from '../services/api';
import type { Matter } from '../types';
import './LogTime.css';

// ─── All activity types with labels ───────────────────────────────────────────

const ACTIVITY_OPTIONS = [
  { value: 'email',        label: 'Email' },
  { value: 'call',         label: 'Call' },
  { value: 'meeting',      label: 'Meeting' },
  { value: 'draft',        label: 'Draft' },
  { value: 'review',       label: 'Review' },
  { value: 'research',     label: 'Research' },
  { value: 'court',        label: 'Court' },
  { value: 'consultation', label: 'Consultation' },
  { value: 'negotiation',  label: 'Negotiation' },
  { value: 'filing',       label: 'Filing' },
  { value: 'travel',       label: 'Travel' },
  { value: 'other',        label: 'Other' },
];

// ─── Form state ───────────────────────────────────────────────────────────────

interface FormState {
  attorney_id: string;
  matter_id: string;
  activity_type: string;
  narration: string;
  duration_hours: string;
  date: string;
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY: FormState = {
  attorney_id: '1',
  matter_id: '',
  activity_type: 'email',
  narration: '',
  duration_hours: '',
  date: todayValue(),
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="toast toast--success" role="alert">
      <span>✓ {msg}</span>
      <button className="toast__close" onClick={onClose} aria-label="Dismiss">✕</button>
    </div>
  );
}

// ─── Log Time page ────────────────────────────────────────────────────────────

export default function LogTime() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [matterSearch, setMatterSearch] = useState('');
  const [showMatterDrop, setShowMatterDrop] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const matterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getMatters().then(setMatters).catch(() => {});
  }, []);

  // Close matter dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (matterRef.current && !matterRef.current.contains(e.target as Node)) {
        setShowMatterDrop(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const set = (k: keyof FormState, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  // Filtered matters based on search
  const filteredMatters = matters.filter(m => {
    const q = matterSearch.toLowerCase();
    return (
      (m.matter_number ?? '').toLowerCase().includes(q) ||
      (m.client_name ?? '').toLowerCase().includes(q)
    );
  });

  const selectedMatter = matters.find(m => String(m.matter_id) === form.matter_id);

  const durationUnits = form.duration_hours && !isNaN(parseFloat(form.duration_hours))
    ? Math.round(parseFloat(form.duration_hours) * 10)
    : null;

  const valid =
    form.activity_type !== '' &&
    form.duration_hours.trim() !== '' &&
    parseFloat(form.duration_hours) > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await createTimeEntry({
        attorney_id: Number(form.attorney_id),
        matter_id: form.matter_id ? Number(form.matter_id) : undefined,
        activity_type: form.activity_type,
        narration: form.narration.trim() || undefined,
        duration_units: durationUnits ?? 0,
        status: 'confirmed',
      });
      setToast(`Time entry logged (${form.duration_hours}h · ${form.activity_type})`);
      setForm({ ...EMPTY, date: todayValue() });
      setMatterSearch('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="log-page">
      {/* ── Title ── */}
      <div className="log-page__heading">
        <h1 className="log-page__title">Log Time</h1>
        <p className="log-page__sub">Manually record a billable time entry.</p>
      </div>

      {/* ── Form ── */}
      <div className="log-form-wrap">
        <form
          className="log-form"
          onSubmit={e => { e.preventDefault(); handleSubmit(); }}
          noValidate
        >
          {/* Activity type */}
          <div>
            <label className="log-field__label" htmlFor="log-activity">
              Activity type
            </label>
            <select
              id="log-activity"
              className="log-select"
              value={form.activity_type}
              onChange={e => set('activity_type', e.target.value)}
            >
              {ACTIVITY_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Client matter */}
          <div>
            <label className="log-field__label" htmlFor="log-matter">
              Client matter
            </label>
            <div className="log-search-wrap" ref={matterRef}>
              <span className="log-search-icon"><IconSearch /></span>
              <input
                id="log-matter"
                className="log-input"
                type="text"
                placeholder="Search by matter number or client name..."
                value={selectedMatter
                  ? `${selectedMatter.matter_number ? selectedMatter.matter_number + ' · ' : ''}${selectedMatter.client_name ?? ''}`
                  : matterSearch
                }
                onChange={e => {
                  setMatterSearch(e.target.value);
                  set('matter_id', '');
                  setShowMatterDrop(true);
                }}
                onFocus={() => setShowMatterDrop(true)}
                autoComplete="off"
              />
              {showMatterDrop && (
                <div className="log-matter-results">
                  {filteredMatters.length === 0 ? (
                    <div className="log-matter-results__item" style={{ color: '#9ca3af' }}>
                      No matters found
                    </div>
                  ) : (
                    filteredMatters.map(m => (
                      <div
                        key={m.matter_id}
                        className={`log-matter-results__item${form.matter_id === String(m.matter_id) ? ' log-matter-results__item--selected' : ''}`}
                        onMouseDown={() => {
                          set('matter_id', String(m.matter_id));
                          setMatterSearch('');
                          setShowMatterDrop(false);
                        }}
                      >
                        {m.matter_number ? `${m.matter_number} · ` : ''}
                        {m.client_name ?? 'Unknown client'}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Narration */}
          <div>
            <label className="log-field__label" htmlFor="log-narration">
              Narration
            </label>
            <textarea
              id="log-narration"
              className="log-textarea"
              placeholder="Describe the work performed..."
              value={form.narration}
              onChange={e => set('narration', e.target.value)}
              rows={4}
            />
          </div>

          {/* Date + Duration */}
          <div className="log-form__row">
            <div>
              <label className="log-field__label" htmlFor="log-date">Date</label>
              <input
                id="log-date"
                className="log-input--plain"
                type="date"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div>
              <label className="log-field__label" htmlFor="log-duration">
                Duration (hours)
                {durationUnits !== null && (
                  <span className="log-field__label-hint">· {durationUnits} units</span>
                )}
              </label>
              <input
                id="log-duration"
                className="log-input--plain"
                type="number"
                step="0.1"
                min="0.1"
                max="24"
                placeholder="0.5"
                value={form.duration_hours}
                onChange={e => set('duration_hours', e.target.value)}
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="log-form__error" role="alert">
              <span>⚠ {error}</span>
            </div>
          )}

          {/* Footer */}
          <div className="log-form__footer">
            <button
              type="button"
              className="log-btn-cancel"
              onClick={() => { setForm({ ...EMPTY, date: todayValue() }); setMatterSearch(''); }}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="log-btn-submit"
              disabled={!valid || saving}
              aria-busy={saving}
            >
              {saving ? 'Saving…' : 'Submit entry'}
            </button>
          </div>
        </form>
      </div>

      {/* Toast */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}