import type { Request, Response } from 'express';
import pool from '../config/db.js';
import type { TimeEntry, CreateTimeEntryBody, PatchTimeEntryBody } from '../models/timeEntryModel.js';
import { minutesToUnits } from '../services/roundingService.js';

export async function getTimeEntries(req: Request, res: Response): Promise<void> {
  const { attorney_id, status } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (attorney_id) {
    params.push(attorney_id);
    conditions.push(`te.attorney_id = $${params.length}`);
  }
  if (status) {
    params.push(status);
    conditions.push(`te.status = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT
       te.*,
       m.matter_number,
       m.client_name,
       m.matter_description,
       a.name AS attorney_name,
       ROUND((te.duration_units * 0.1)::numeric, 1) AS duration_hours
     FROM time_entries te
     LEFT JOIN matters m ON te.matter_id = m.matter_id
     LEFT JOIN attorneys a ON te.attorney_id = a.attorney_id
     ${where}
     ORDER BY te.work_date DESC`,
    params
  );

  res.json(rows);
}

export async function getTimeEntryById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;

  const { rows } = await pool.query(
    `SELECT
       te.*,
       m.matter_number,
       m.client_name,
       m.matter_description,
       a.name AS attorney_name,
       ROUND((te.duration_units * 0.1)::numeric, 1) AS duration_hours
     FROM time_entries te
     LEFT JOIN matters m ON te.matter_id = m.matter_id
     LEFT JOIN attorneys a ON te.attorney_id = a.attorney_id
     WHERE te.entry_id = $1`,
    [id]
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Time entry not found' });
    return;
  }
  res.json(rows[0]);
}

export async function createTimeEntry(req: Request, res: Response): Promise<void> {
  const body = req.body as CreateTimeEntryBody & { work_date?: string; confidence?: 'high' | 'medium' | 'low' | null };
  const { matter_id, attorney_id, activity_type, narration, status = 'pending', confidence = null } = body;

  if (!attorney_id || !activity_type) {
    res.status(400).json({ error: 'attorney_id and activity_type are required' });
    return;
  }

  let duration_units = body.duration_units ?? null;
  if (duration_units == null && body.raw_duration_minutes != null) {
    duration_units = minutesToUnits(body.raw_duration_minutes);
  }

  // Strip any time/timezone component — keep only the YYYY-MM-DD part.
  // This prevents UTC offset from shifting the date when the server or client
  // is in a non-UTC timezone (e.g. SAST UTC+2 would otherwise roll back a day).
  const rawDate = body.work_date ?? new Date().toISOString().slice(0, 10);
  const work_date = rawDate.slice(0, 10);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(work_date) || isNaN(new Date(work_date).getTime())) {
    res.status(400).json({ error: 'Invalid work_date — expected YYYY-MM-DD' });
    return;
  }

  const result = await pool.query<TimeEntry>(
    `INSERT INTO time_entries
       (matter_id, attorney_id, activity_type, narration, duration_units, status, work_date, confidence)
     VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8)
     RETURNING *`,
    [matter_id ?? null, attorney_id, activity_type, narration ?? null, duration_units, status, work_date, confidence]
  );

  res.status(201).json(result.rows[0]);
}

export async function patchTimeEntry(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const body = req.body as PatchTimeEntryBody & { confidence?: 'high' | 'medium' | 'low' | null };

  const fields: string[] = [];
  const params: unknown[] = [];

  if (body.matter_id !== undefined) {
    params.push(body.matter_id);
    fields.push(`matter_id = $${params.length}`);
  }
  if (body.narration !== undefined) {
    params.push(body.narration);
    fields.push(`narration = $${params.length}`);
  }
  if (body.duration_units !== undefined) {
    params.push(body.duration_units);
    fields.push(`duration_units = $${params.length}`);
  }
  if (body.status !== undefined) {
    const allowed = ['pending', 'confirmed', 'dismissed'];
    if (!allowed.includes(body.status)) {
      res.status(400).json({ error: `status must be one of: ${allowed.join(', ')}` });
      return;
    }
    params.push(body.status);
    fields.push(`status = $${params.length}`);
  }
  if (body.confidence !== undefined) {
    params.push(body.confidence);
    fields.push(`confidence = $${params.length}`);
  }

  if (fields.length === 0) {
    res.status(400).json({ error: 'No valid fields provided for update' });
    return;
  }

  params.push(id);
  const { rows } = await pool.query<TimeEntry>(
    `UPDATE time_entries SET ${fields.join(', ')} WHERE entry_id = $${params.length} RETURNING *`,
    params
  );

  if (rows.length === 0) {
    res.status(404).json({ error: 'Time entry not found' });
    return;
  }

  res.json(rows[0]);
}

export async function deleteTimeEntry(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { rowCount } = await pool.query(
    'DELETE FROM time_entries WHERE entry_id = $1',
    [id]
  );
  if (rowCount === 0) {
    res.status(404).json({ error: 'Time entry not found' });
    return;
  }
  res.status(204).send();
}