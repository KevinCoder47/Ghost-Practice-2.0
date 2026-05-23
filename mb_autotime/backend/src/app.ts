import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import { errorHandler } from './middleware/errorHandler.js';

import mattersRouter from './routes/matters.js';
import timeEntriesRouter from './routes/timeEntries.js';
import activitiesRouter from './routes/activities.js';
import reportsRouter from './routes/reports.js';

dotenv.config();

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
  })
);

// ── Body parsing ───────────────────────────────────────────────────────────────
app.use(express.json());

// ── Health / debug ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'ok', service: 'mb-autotime-api' });
});

app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', db: 'connected', time: result.rows[0].now });
  } catch {
    res.status(500).json({ status: 'error', db: 'unreachable' });
  }
});

// ── API routes ─────────────────────────────────────────────────────────────────
app.use('/matters', mattersRouter);
app.use('/time-entries', timeEntriesRouter);
app.use('/activities', activitiesRouter);
app.use('/reports', reportsRouter);

// ── 404 ────────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Global error handler (must be last) ───────────────────────────────────────
app.use(errorHandler);

export default app;