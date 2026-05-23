import pg, { type PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Prevent pg from converting DATE columns to JS Date objects.
// Without this, pg applies the local timezone offset during serialization,
// shifting YYYY-MM-DD values by UTC+2 (SAST) and rolling the date back a day.
pg.types.setTypeParser(1082, (val: string) => val); // 1082 = DATE OID

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is not set. See .env.example for instructions.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Keep connections alive — important for long-running Node processes
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  max: 10,
});

pool.on('error', (err: Error) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

export default pool;