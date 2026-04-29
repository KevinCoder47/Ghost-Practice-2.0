/**
 * API integration tests.
 * These run against a real database — make sure DATABASE_URL is set in .env
 * and the schema + seed have been applied before running.
 *
 * Run: npm test
 */

import request from 'supertest';
import app from '../app.js';
import pool from '../config/db.js';

afterAll(async () => {
  await pool.end();
});

// ─── GET /matters ──────────────────────────────────────────────────────────────

describe('GET /matters', () => {
  it('returns an array of matters', async () => {
    const res = await request(app).get('/matters');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('each matter has expected fields', async () => {
    const res = await request(app).get('/matters');
    const matter = res.body[0];
    expect(matter).toHaveProperty('matter_id');
    expect(matter).toHaveProperty('matter_number');
    expect(matter).toHaveProperty('client_name');
  });
});

describe('GET /matters/:id', () => {
  it('returns a single matter', async () => {
    const res = await request(app).get('/matters/1');
    expect(res.status).toBe(200);
    expect(res.body.matter_id).toBe(1);
  });

  it('returns 404 for unknown matter', async () => {
    const res = await request(app).get('/matters/99999');
    expect(res.status).toBe(404);
  });
});

// ─── GET /time-entries ─────────────────────────────────────────────────────────

describe('GET /time-entries', () => {
  it('returns an array', async () => {
    const res = await request(app).get('/time-entries');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('filters by attorney_id', async () => {
    const res = await request(app).get('/time-entries?attorney_id=1');
    expect(res.status).toBe(200);
    res.body.forEach((entry: { attorney_id: number }) => {
      expect(entry.attorney_id).toBe(1);
    });
  });

  it('filters by status', async () => {
    const res = await request(app).get('/time-entries?status=pending');
    expect(res.status).toBe(200);
    res.body.forEach((entry: { status: string }) => {
      expect(entry.status).toBe('pending');
    });
  });
});

// ─── POST /time-entries ────────────────────────────────────────────────────────

describe('POST /time-entries', () => {
  let createdId: number;

  it('creates a new time entry with rounding', async () => {
    const res = await request(app)
      .post('/time-entries')
      .send({
        attorney_id: 1,
        matter_id: 1,
        activity_type: 'email',
        narration: 'Test narration',
        raw_duration_minutes: 13, // should round to 3 units
      });

    expect(res.status).toBe(201);
    expect(res.body.duration_units).toBe(3);
    expect(res.body.status).toBe('pending');
    createdId = res.body.entry_id;
  });

  it('rejects missing attorney_id', async () => {
    const res = await request(app)
      .post('/time-entries')
      .send({ activity_type: 'email' });
    expect(res.status).toBe(400);
  });

  // ── PATCH /time-entries/:id ────────────────────────────────────────────────

  it('patches the created entry status to confirmed', async () => {
    const res = await request(app)
      .patch(`/time-entries/${createdId}`)
      .send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });

  it('rejects invalid status value', async () => {
    const res = await request(app)
      .patch(`/time-entries/${createdId}`)
      .send({ status: 'approved' }); // not a valid value
    expect(res.status).toBe(400);
  });

  it('returns 404 for patching non-existent entry', async () => {
    const res = await request(app)
      .patch('/time-entries/99999')
      .send({ status: 'confirmed' });
    expect(res.status).toBe(404);
  });

  // Cleanup
  afterAll(async () => {
    if (createdId) {
      await pool.query('DELETE FROM time_entries WHERE entry_id = $1', [createdId]);
    }
  });
});

// ─── POST /activities/suggest ──────────────────────────────────────────────────

describe('POST /activities/suggest', () => {
  it('returns a suggestion with narration and matter', async () => {
    const res = await request(app)
      .post('/activities/suggest')
      .send({
        activity_type: 'email',
        contact_name: 'ABC Corp',
        subject: 'Contract update',
        raw_duration_minutes: 12,
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('narration');
    expect(res.body).toHaveProperty('confidence');
    expect(res.body).toHaveProperty('duration_units');
    expect(res.body.duration_units).toBe(2); // 12 min → 2 units
  });

  it('returns 400 without required fields', async () => {
    const res = await request(app)
      .post('/activities/suggest')
      .send({ activity_type: 'email' }); // missing contact_name
    expect(res.status).toBe(400);
  });
});