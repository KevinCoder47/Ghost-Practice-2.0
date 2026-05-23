import { useState } from 'react';
import { simulateActivity } from '../services/api';
import './SimulatePanel.css';

interface SimulatePanelProps {
  attorneyId: number;
  onSimulated: () => void;
}

interface SimButton {
  type: 'email' | 'meeting' | 'draft' | 'call';
  label: string;
  emoji: string;
  contact: string;
  subject: string;
  duration: number;
}

const SIMULATE_BUTTONS: SimButton[] = [
  {
    type: 'email',
    label: 'Send Email',
    emoji: '✉',
    contact: 'ABC Corp',
    subject: 'Contract update query',
    duration: 12,
  },
  {
    type: 'meeting',
    label: 'Join Meeting',
    emoji: '👥',
    contact: 'Global Bank',
    subject: 'Compliance review meeting',
    duration: 60,
  },
  {
    type: 'draft',
    label: 'Draft Document',
    emoji: '✍',
    contact: 'Nkosi Inc',
    subject: 'Transfer documents',
    duration: 45,
  },
  {
    type: 'call',
    label: 'Make Call',
    emoji: '📞',
    contact: 'XYZ Ltd',
    subject: 'Litigation strategy discussion',
    duration: 18,
  },
];

type ButtonState = 'idle' | 'loading' | 'success' | 'error';

export function SimulatePanel({ attorneyId, onSimulated }: SimulatePanelProps) {
  const [states, setStates] = useState<Record<string, ButtonState>>({});
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  const setButtonState = (type: string, state: ButtonState) => {
    setStates(prev => ({ ...prev, [type]: state }));
  };

  const handleSimulate = async (btn: SimButton) => {
    if (states[btn.type] === 'loading') return;

    setButtonState(btn.type, 'loading');
    setLastAdded(null);

    try {
      await simulateActivity({
        activity_type: btn.type,
        contact_name: btn.contact,
        subject: btn.subject,
        raw_duration_minutes: btn.duration,
        attorney_id: attorneyId,
      });

      setButtonState(btn.type, 'success');
      setLastAdded(btn.type);
      onSimulated();

      setTimeout(() => setButtonState(btn.type, 'idle'), 2200);
    } catch {
      setButtonState(btn.type, 'error');
      setTimeout(() => setButtonState(btn.type, 'idle'), 2200);
    }
  };

  return (
    <div className="sim-panel">
      <div className="sim-panel__header">
        <div className="sim-panel__header-left">
          <span className="sim-panel__pulse" aria-hidden="true" />
          <span className="sim-panel__title">Simulate Activity</span>
        </div>
        <span className="sim-panel__hint">Generates a pending entry in the tray</span>
      </div>

      <div className="sim-panel__buttons">
        {SIMULATE_BUTTONS.map(btn => {
          const state = states[btn.type] ?? 'idle';
          return (
            <button
              key={btn.type}
              className={`sim-btn sim-btn--${btn.type} sim-btn--${state}`}
              onClick={() => handleSimulate(btn)}
              disabled={state === 'loading'}
              aria-label={`Simulate ${btn.label}`}
            >
              <span className="sim-btn__icon">{btn.emoji}</span>
              <span className="sim-btn__label">
                {state === 'loading' && 'Generating…'}
                {state === 'success' && 'Added ✓'}
                {state === 'error' && 'Failed ✕'}
                {state === 'idle' && btn.label}
              </span>
              {state === 'loading' && (
                <span className="sim-btn__spinner" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>

      {lastAdded && (
        <p className="sim-panel__feedback" key={lastAdded}>
          ↓ Entry added to tray below
        </p>
      )}
    </div>
  );
}