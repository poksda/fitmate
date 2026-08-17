import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
});

export const query = <T = any>(text: string, params?: unknown[]): Promise<T[]> => {
  return pool.query(text, params as any[]).then((r) => r.rows as T[]);
};
