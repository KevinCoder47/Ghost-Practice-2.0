import type { Request, Response } from 'express';
import pool from '../config/db.js';

/** GET /reports/productivity — daily/monthly hours vs target per attorney */
export async function getProductivityReport(_req: Request, res: Response): Promise<void> {
  const { rows } = await pool.query(`
    SELECT
      a.attorney_id,
      a.name,
      a.monthly_target_hours,
      COALESCE(SUM(te.duration_units) FILTER (WHERE te.status = 'confirmed'), 0) AS confirmed_units,
      ROUND(
        COALESCE(SUM(te.duration_units) FILTER (WHERE te.status = 'confirmed'), 0) * 0.1,
        1
      ) AS confirmed_hours,
      COUNT(te.entry_id) FILTER (WHERE te.status = 'pending') AS pending_entries,
      ROUND(
        CASE
          WHEN a.monthly_target_hours > 0
          THEN (COALESCE(SUM(te.duration_units) FILTER (WHERE te.status = 'confirmed'), 0) * 0.1)
               / a.monthly_target_hours * 100
          ELSE 0
        END, 1
      ) AS pct_of_target
    FROM attorneys a
    LEFT JOIN time_entries te ON a.attorney_id = te.attorney_id
      AND DATE_TRUNC('month', te.created_at) = DATE_TRUNC('month', NOW())
    GROUP BY a.attorney_id, a.name, a.monthly_target_hours
    ORDER BY a.attorney_id
  `);

  res.json(rows);
}

/** GET /reports/daily/:attorney_id — last 30 days breakdown */
export async function getDailyReport(req: Request, res: Response): Promise<void> {
  const { attorney_id } = req.params;

  const { rows } = await pool.query(`
    SELECT
      DATE(te.created_at) AS date,
      COUNT(*) AS entry_count,
      ROUND(SUM(te.duration_units) * 0.1, 1) AS total_hours,
      COUNT(*) FILTER (WHERE te.status = 'confirmed') AS confirmed,
      COUNT(*) FILTER (WHERE te.status = 'pending') AS pending,
      COUNT(*) FILTER (WHERE te.status = 'dismissed') AS dismissed
    FROM time_entries te
    WHERE te.attorney_id = $1
      AND te.created_at >= NOW() - INTERVAL '30 days'
    GROUP BY DATE(te.created_at)
    ORDER BY date DESC
  `, [attorney_id]);

  res.json(rows);
}