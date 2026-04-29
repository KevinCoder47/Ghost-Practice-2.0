import type { Request, Response } from 'express';
import pool from '../config/db.js';
import type { Matter } from '../models/timeEntryModel.js';

/** GET /matters — list all matters */
export async function getMatters(_req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query<Matter>(
    'SELECT * FROM matters ORDER BY matter_id'
  );
  res.json(rows);
}

/** GET /matters/:id — single matter */
export async function getMatterById(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const { rows } = await pool.query<Matter>(
    'SELECT * FROM matters WHERE matter_id = $1',
    [id]
  );
  if (rows.length === 0) {
    res.status(404).json({ error: 'Matter not found' });
    return;
  }
  res.json(rows[0]);
}