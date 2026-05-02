import { useState } from 'react';
import type { TimeEntry, Matter, PatchTimeEntryBody } from '../types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function unitsToHours(units: number | null): string {
  if (units == null) return '—';
  return (units * 0.1).toFixed(1) + 'h';
}

function hoursToUnits(hours: number): number {
  return Math.round(hours * 10);
}

const ACTIVITY_ICONS: Record<string, string> = {
  email: '✉',
  call: '📞',
  meeting: '👥',
  draft: '✍',
  review: '🔍',
  research: '📚',
  court: '⚖',
  consultation: '💬',
};

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'badge badge--high',
  medium: 'badge badge--medium',
  low: 'badge badge--low',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: TimeEntry;
  matters: Matter[];
  onConfirm: (id: number) => Promise<void>;
  onDismiss: (id: number) => Promise<void>;
  onEdit: (id: number, body: PatchTimeEntryBody) => Promise<void>;
}

// ─── Inline Edit Form ─────────────────────────────────────────────────────────

interface EditFormProps {
  entry: TimeEntry;
  matters: Matter[];
  onSave: (body: PatchTimeEntryBody) => Promise<void>;
  onCancel: () => void;
}

function EditForm({ entry, matters, onSave, onCancel }: EditFormProps) {
  const [narration, setNarration] = useState(entry.narration ?? '');
  const [matterId, setMatterId] = useState<string>(
    entry.matter_id != null ? String(entry.matter_id) : ''
  );
  const [durationHours, setDurationHours] = useState<string>(
    entry.duration_units != null ? (entry.duration_units * 0.1).toFixed(1) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const body: PatchTimeEntryBody = { status: 'confirmed' };
      if (narration !== (entry.narration ?? '')) body.narration = narration;
      if (matterId !== '' && Number(matterId) !== entry.matter_id)
        body.matter_id = Number(matterId);
      if (durationHours !== '')
        body.duration_units = hoursToUnits(parseFloat(durationHours));
      await onSave(body);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  return (
    <div className="edit-form">
      <div className="edit-form__field">
        <label className="edit-form__label" htmlFor={`matter-${entry.entry_id}`}>
          Matter
        </label>
        <select
          id={`matter-${entry.entry_id}`}
          className="edit-form__select"
          value={matterId}
          onChange={(e) => setMatterId(e.target.value)}
        >
          <option value="">— Unassigned —</option>
          {matters.map((m) => (
            <option key={m.matter_id} value={m.matter_id}>
              {m.matter_number ? `${m.matter_number} · ` : ''}
              {m.client_name ?? 'Unknown client'}
            </option>
          ))}
        </select>
      </div>

      <div className="edit-form__field">
        <label className="edit-form__label" htmlFor={`narration-${entry.entry_id}`}>
          Narration
        </label>
        <textarea
          id={`narration-${entry.entry_id}`}
          className="edit-form__textarea"
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          rows={3}
          placeholder="Describe the work performed…"
        />
      </div>

      <div className="edit-form__field">
        <label className="edit-form__label" htmlFor={`duration-${entry.entry_id}`}>
          Duration (hours)
        </label>
        <input
          id={`duration-${entry.entry_id}`}
          type="number"
          className="edit-form__input"
          value={durationHours}
          onChange={(e) => setDurationHours(e.target.value)}
          step="0.1"
          min="0.1"
          placeholder="e.g. 0.5"
        />
      </div>

      {error && <p className="edit-form__error">{error}</p>}

      <div className="edit-form__actions">
        <button className="btn btn--ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button className="btn btn--confirm" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save & Confirm'}
        </button>
      </div>
    </div>
  );
}

// ─── Entry Card ───────────────────────────────────────────────────────────────

export function EntryCard({ entry, matters, onConfirm, onDismiss, onEdit }: EntryCardProps) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<'confirm' | 'dismiss' | null>(null);

  const icon = ACTIVITY_ICONS[entry.activity_type ?? ''] ?? '⬡';
  const matterLabel =
    entry.client_name
      ? `${entry.matter_number ? entry.matter_number + ' · ' : ''}${entry.client_name}`
      : null;

  const handleConfirm = async () => {
    setBusy('confirm');
    try {
      await onConfirm(entry.entry_id);
    } finally {
      setBusy(null);
    }
  };

  const handleDismiss = async () => {
    setBusy('dismiss');
    try {
      await onDismiss(entry.entry_id);
    } finally {
      setBusy(null);
    }
  };

  const handleEditSave = async (body: PatchTimeEntryBody) => {
    await onEdit(entry.entry_id, body);
    setEditing(false);
  };

  return (
    <article className={`entry-card${editing ? ' entry-card--editing' : ''}`}>
      <div className="entry-card__header">
        <div className="entry-card__type">
          <span className="entry-card__icon" aria-hidden="true">{icon}</span>
          <span className="entry-card__type-label">
            {entry.activity_type ?? 'Unknown'}
          </span>
        </div>
        <span className="entry-card__duration">
          {unitsToHours(entry.duration_units)}
        </span>
      </div>

      <div className="entry-card__body">
        {matterLabel ? (
          <p className="entry-card__matter">{matterLabel}</p>
        ) : (
          <p className="entry-card__matter entry-card__matter--unassigned">
            No matter assigned
          </p>
        )}
        <p className="entry-card__narration">
          {entry.narration ?? <em>No narration generated</em>}
        </p>
      </div>

      {editing ? (
        <EditForm
          entry={entry}
          matters={matters}
          onSave={handleEditSave}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className="entry-card__actions">
          <button
            className="btn btn--confirm"
            onClick={handleConfirm}
            disabled={busy !== null}
            aria-busy={busy === 'confirm'}
          >
            {busy === 'confirm' ? 'Confirming…' : '✓ Confirm'}
          </button>
          <button
            className="btn btn--edit"
            onClick={() => setEditing(true)}
            disabled={busy !== null}
          >
            ✎ Edit
          </button>
          <button
            className="btn btn--dismiss"
            onClick={handleDismiss}
            disabled={busy !== null}
            aria-busy={busy === 'dismiss'}
          >
            {busy === 'dismiss' ? 'Dismissing…' : '✕ Dismiss'}
          </button>
        </div>
      )}
    </article>
  );
}