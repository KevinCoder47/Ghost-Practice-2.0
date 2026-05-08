import type { Request, Response } from 'express';
import pool from '../config/db.js';
import type { Activity, SuggestionRequest } from '../models/timeEntryModel.js';
import { getSuggestion } from '../services/matchingService.js';
import { minutesToUnits, unitsToHours } from '../services/roundingService.js';
import { generateSimulatedEntries } from '../services/simulationService.js';

/** GET /activities — list all captured activities */
export async function getActivities(req: Request, res: Response): Promise<void> {
  const { attorney_id } = req.query;

  const { rows } = await pool.query<Activity>(
    `SELECT * FROM activities
     ${attorney_id ? 'WHERE attorney_id = $1' : ''}
     ORDER BY detected_at DESC`,
    attorney_id ? [attorney_id] : []
  );

  res.json(rows);
}

/**
 * POST /activities/suggest
 *
 * The core auto-suggestion engine.
 * Given: activity_type + contact_name + optional subject
 * Returns: suggested matter + AI narration + rounded duration
 *
 * Body: { activity_type, contact_name, subject?, raw_duration_minutes?, attorney_id? }
 */
export async function suggestEntry(req: Request, res: Response): Promise<void> {
  const { activity_type, contact_name, subject, raw_duration_minutes, attorney_id } =
    req.body as SuggestionRequest & { raw_duration_minutes?: number };

  if (!activity_type || !contact_name) {
    res.status(400).json({ error: 'activity_type and contact_name are required' });
    return;
  }

  const suggestion = await getSuggestion({ activity_type, contact_name, subject, attorney_id });

  // Include rounded duration if raw minutes were provided
  const durationInfo =
    raw_duration_minutes != null
      ? {
          raw_duration_minutes,
          duration_units: minutesToUnits(raw_duration_minutes),
          duration_hours: unitsToHours(minutesToUnits(raw_duration_minutes)),
        }
      : {};

  res.json({
    ...suggestion,
    ...durationInfo,
  });
}

/** POST /activities — log a new captured activity (from desktop agent) */
export async function createActivity(req: Request, res: Response): Promise<void> {
  const { attorney_id, activity_type, contact_name, subject, raw_duration_minutes } = req.body;

  if (!activity_type) {
    res.status(400).json({ error: 'activity_type is required' });
    return;
  }

  const { rows } = await pool.query<Activity>(
    `INSERT INTO activities (attorney_id, activity_type, contact_name, subject, raw_duration_minutes)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [attorney_id ?? null, activity_type, contact_name ?? null, subject ?? null, raw_duration_minutes ?? null]
  );

  // Auto-generate suggestion alongside the created activity
  const suggestion = await getSuggestion({
    activity_type,
    contact_name: contact_name ?? '',
    subject,
    attorney_id,
  });

  res.status(201).json({
    activity: rows[0],
    suggestion,
  });
}

/**
 * POST /activities/simulate
 *
 * Generates realistic pending time entries for the demo tray.
 * Simulates what the Outlook add-in / desktop agent would capture.
 *
 * Body: { attorney_id, activity_type?, contact_name?, subject?, raw_duration_minutes? }
 *
 * If specific activity fields are provided, simulates just that one activity.
 * Otherwise generates a batch of sample entries.
 */
export async function simulateEntries(req: Request, res: Response): Promise<void> {
  const { attorney_id, activity_type, contact_name, subject, raw_duration_minutes } = req.body;

  if (!attorney_id) {
    res.status(400).json({ error: 'attorney_id is required' });
    return;
  }

  // Single specific activity (from SimulatePanel button click)
  if (activity_type && contact_name) {
    const suggestion = await getSuggestion({
      activity_type,
      contact_name,
      subject,
      attorney_id,
    });

    const duration_units =
      raw_duration_minutes != null ? minutesToUnits(raw_duration_minutes) : 3;

    const { rows } = await pool.query(
      `INSERT INTO time_entries (matter_id, attorney_id, activity_type, narration, duration_units, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [
        suggestion.suggested_matter?.matter_id ?? null,
        attorney_id,
        activity_type,
        suggestion.narration,
        duration_units,
      ]
    );

    res.status(201).json({
      entry: rows[0],
      suggestion,
    });
    return;
  }

  // Batch simulation (seed mode)
  const entries = await generateSimulatedEntries(attorney_id, 5);
  const inserted = [];

  for (const entry of entries) {
    const { rows } = await pool.query(
      `INSERT INTO time_entries (matter_id, attorney_id, activity_type, narration, duration_units, status)
       VALUES ($1, $2, $3, $4, $5, 'pending')
       RETURNING *`,
      [
        entry.suggested_matter_id,
        attorney_id,
        entry.activity_type,
        entry.narration,
        entry.duration_units,
      ]
    );
    inserted.push(rows[0]);
  }

  res.status(201).json({ inserted: inserted.length, entries: inserted });
}