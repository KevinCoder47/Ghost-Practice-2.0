import type { Request, Response } from 'express';
import pool from '../config/db.js';
import type { Activity, SuggestionRequest } from '../models/timeEntryModel.js';
import { getSuggestion } from '../services/matchingService.js';
import { minutesToUnits, unitsToHours } from '../services/roundingService.js';

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