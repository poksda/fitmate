import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Pool } from 'pg';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  await pool.query('ALTER TABLE workouts ADD COLUMN IF NOT EXISTS name TEXT');
  await pool.query(
    `ALTER TABLE client_profiles
     ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active'
     CHECK (status IN ('active', 'inactive'))`,
  );
  await pool.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS workouts_left INT');
  await pool.query(
    'ALTER TABLE client_profiles ALTER COLUMN trainer_id DROP NOT NULL',
  );
  console.log('Схема применена успешно');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Ошибка миграции:', err.message);
  process.exit(1);
});
