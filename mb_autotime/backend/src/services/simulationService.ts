/**
 * simulationService.ts
 *
 * Generates realistic dummy activities for the prototype review tray.
 * Simulates what the Outlook add-in / desktop agent would capture in production.
 */

import pool from '../config/db.js';
import { minutesToUnits } from './roundingService.js';
import { getSuggestion } from './matchingService.js';

interface SimulatedEntry {
  activity_type: string;
  contact_name: string;
  subject: string;
  raw_duration_minutes: number;
  duration_units: number;
  suggested_matter_id: number | null;
  suggested_matter_number: string | null;
  narration: string;
  confidence: 'high' | 'medium' | 'low';
}

const SAMPLE_ACTIVITIES = [
  { activity_type: 'email', contact_name: 'ABC Corp', subject: 'Contract update query', raw_duration_minutes: 12 },
  { activity_type: 'call', contact_name: 'XYZ Ltd', subject: 'Litigation strategy discussion', raw_duration_minutes: 18 },
  { activity_type: 'draft', contact_name: 'Nkosi Inc', subject: 'Transfer documents', raw_duration_minutes: 45 },
  { activity_type: 'meeting', contact_name: 'Global Bank', subject: 'Compliance review meeting', raw_duration_minutes: 60 },
  { activity_type: 'email', contact_name: 'RetailCo', subject: 'Employment contract dispute', raw_duration_minutes: 8 },
  { activity_type: 'review', contact_name: 'ABC Corp', subject: 'Reviewed amended contract', raw_duration_minutes: 25 },
  { activity_type: 'call', contact_name: 'Opposing counsel', subject: 'Settlement negotiations', raw_duration_minutes: 14 },
];

export async function generateSimulatedEntries(
  attorneyId: number,
  count: number = 5
): Promise<SimulatedEntry[]> {
  const sample = SAMPLE_ACTIVITIES.slice(0, Math.min(count, SAMPLE_ACTIVITIES.length));
  const results: SimulatedEntry[] = [];

  for (const activity of sample) {
    const suggestion = await getSuggestion({
      activity_type: activity.activity_type,
      contact_name: activity.contact_name,
      subject: activity.subject,
      attorney_id: attorneyId,
    });

    results.push({
      ...activity,
      duration_units: minutesToUnits(activity.raw_duration_minutes),
      suggested_matter_id: suggestion.suggested_matter?.matter_id ?? null,
      suggested_matter_number: suggestion.suggested_matter?.matter_number ?? null,
      narration: suggestion.narration,
      confidence: suggestion.confidence,
    });
  }

  return results;
}

export async function seedSimulatedTimeEntries(attorneyId: number): Promise<number> {
  const entries = await generateSimulatedEntries(attorneyId, 7);
  let inserted = 0;

  for (const entry of entries) {
    await pool.query(
      `INSERT INTO time_entries (matter_id, attorney_id, activity_type, narration, duration_units, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')`,
      [
        entry.suggested_matter_id,
        attorneyId,
        entry.activity_type,
        entry.narration,
        entry.duration_units,
      ]
    );
    inserted++;
  }

  return inserted;
}