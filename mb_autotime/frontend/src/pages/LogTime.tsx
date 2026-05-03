import { useState, useEffect } from 'react';
import { getMatters, createTimeEntry } from '../services/api';
import type { Matter } from '../types';
import { ACTIVITY_TYPES } from '../types';
import './LogTime.css';

// ─── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  attorney_id: string;
  matter_id: string;
  activity_type: string;
  narration: string;
  duration_hours: string;
  status: 'pending' | 'confirmed';
}

const EMPTY: FormState = {
  attorney_id: '1', // TODO: replace with auth context
  matter_id: '',
  activity_type: '',
  narration: '',
  duration_hours: '',
  status: 'confirmed',
};

// ─── Activity type button ──────────────────────────────────────────────────────

const ACTIVITY_ICONS: Record<string, string> = {
  email: '✉',  call: '📞', meeting: '👥',
  draft: '✍',  review: '🔍', research: '📚',
  court: '⚖',  consultation: '💬',
};

function ActivityToggle({
  type, selected, onClick,
}: { type: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className={`activity-btn${selected ? ' activity-btn--active' : ''}`}
      onClick={onClick}
      aria-pressed={selected}
    >
      <span className="activity-btn__icon">{ACTIVITY_ICONS[type] ?? '⬡'}</span>
      <span className="activity-btn__label">{type}</span>
    </button>
  );
}

// ─── Success toast ─────────────────────────────────────────────────────────────

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

// ─── Log Time page ─────────────────────────────────────────────────────────────

export default function LogTime() {
  const [matters, setMatters] = useState<Matter[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    getMatters().then(setMatters).catch(() => {/* non-fatal */});
  }, []);

  const set = (k: keyof FormState, v: string) =>
    setForm(f => ({ ...f, [k]: v }));

  const valid =
    form.attorney_id.trim() !== '' &&
    form.activity_type !== '' &&
    form.duration_hours.trim() !== '' &&
    parseFloat(form.duration_hours) > 0;

  const handleSubmit = async () => {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      const durationUnits = Math.round(parseFloat(form.duration_hours) * 10);
      await createTimeEntry({
        attorney_id: Number(form.attorney_id),
        matter_id: form.matter_id ? Number(form.matter_id) : undefined,
        activity_type: form.activity_type,
        narration: form.narration.trim() || undefined,
        duration_units: durationUnits,
        status: form.status,
      });
      setToast(`Time entry logged (${form.duration_hours}h ${form.activity_type})`);
      setForm(EMPTY);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="log-page">
      {/* ── Header ── */}
      <header className="page-header">
        <div className="page-header__left">
          <h1 className="page-header__title">Log Time</h1>
          <span className="page-header__sub">Manual time entry</span>
        </div>
      </header>

      <div className="page-body">
        <div className="log-form-wrap">
          <form
            className="log-form"
            onSubmit={e => { e.preventDefault(); handleSubmit(); }}
            noValidate
          >

            {/* ── Activity type ── */}
            <div className="log-form__section">
              <p className="log-form__section-label">Activity Type <span className="required">*</span></p>
              <div className="activity-grid">
                {ACTIVITY_TYPES.map(type => (
                  <ActivityToggle
                    key={type}
                    type={type}
                    selected={form.activity_type === type}
                    onClick={() => set('activity_type', form.activity_type === type ? '' : type)}
                  />
                ))}
              </div>
            </div>

            {/* ── Duration + Matter ── */}
            <div className="log-form__row">
              <div className="field">
                <label className="field__label" htmlFor="log-duration">
                  Duration (hours) <span className="required">*</span>
                </label>
                <input
                  id="log-duration"
                  className="field__input"
                  type="number"
                  step="0.1"
                  min="0.1"
                  max="24"
                  placeholder="e.g. 1.5"
                  value={form.duration_hours}
                  onChange={e => set('duration_hours', e.target.value)}
                />
                {form.duration_hours && !isNaN(parseFloat(form.duration_hours)) && (
                  <p className="field__hint">
                    = {Math.round(parseFloat(form.duration_hours) * 10)} units
                  </p>
                )}
              </div>

              <div className="field">
                <label className="field__label" htmlFor="log-matter">Matter</label>
                <select
                  id="log-matter"
                  className="field__select"
                  value={form.matter_id}
                  onChange={e => set('matter_id', e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {matters.map(m => (
                    <option key={m.matter_id} value={m.matter_id}>
                      {m.matter_number ? `${m.matter_number} · ` : ''}
                      {m.client_name ?? 'Unknown client'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Narration ── */}
            <div className="field">
              <label className="field__label" htmlFor="log-narration">Narration</label>
              <textarea
                id="log-narration"
                className="field__textarea"
                placeholder="Describe the work performed…"
                value={form.narration}
                onChange={e => set('narration', e.target.value)}
                rows={4}
              />
              <p className="field__hint">{form.narration.length} chars</p>
            </div>

            {/* ── Status ── */}
            <div className="field">
              <p className="field__label">Save as</p>
              <div className="status-toggle">
                {(['confirmed', 'pending'] as const).map(s => (
                  <button
                    key={s}
                    type="button"
                    className={`status-toggle__btn${form.status === s ? ' status-toggle__btn--active' : ''}`}
                    onClick={() => set('status', s)}
                    aria-pressed={form.status === s}
                  >
                    {s === 'confirmed' ? '✓ Confirmed' : '⏳ Pending review'}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <div className="log-form__error" role="alert">
                <span>⚠ {error}</span>
              </div>
            )}

            {/* ── Submit ── */}
            <div className="log-form__footer">
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setForm(EMPTY)}
                disabled={saving}
              >
                Clear
              </button>
              <button
                type="submit"
                className="btn btn--primary btn--lg"
                disabled={!valid || saving}
                aria-busy={saving}
              >
                {saving ? 'Saving…' : '+ Log Entry'}
              </button>
            </div>
          </form>

          {/* ── Tips panel ── */}
          <aside className="log-tips">
            <h3 className="log-tips__title">Tips</h3>
            <ul className="log-tips__list">
              <li>
                <span className="log-tips__icon">⏱</span>
                <span>Enter hours in decimal format — 0.5 = 30 min, 1.5 = 90 min</span>
              </li>
              <li>
                <span className="log-tips__icon">✍</span>
                <span>Write narrations in past tense: "Reviewed lease agreement…"</span>
              </li>
              <li>
                <span className="log-tips__icon">📋</span>
                <span>Saving as Pending lets you review before it hits the report</span>
              </li>
              <li>
                <span className="log-tips__icon">⚡</span>
                <span>Auto-detected activities appear in the Pending Tray automatically</span>
              </li>
            </ul>
          </aside>
        </div>
      </div>

      {/* ── Toast ── */}
      {toast && <Toast msg={toast} onClose={() => setToast(null)} />}
    </div>
  );
}