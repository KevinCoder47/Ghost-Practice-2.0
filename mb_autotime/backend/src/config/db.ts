import pg, { type PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

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