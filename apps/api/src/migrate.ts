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
  await pool.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS goal_weight NUMERIC(5,1)');
  await pool.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS goal_calories INT');
  await pool.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS goal_protein INT');
  await pool.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS goal_fats INT');
  await pool.query('ALTER TABLE client_profiles ADD COLUMN IF NOT EXISTS goal_carbs INT');
  await pool.query(
    `CREATE TABLE IF NOT EXISTS weekly_plans (
       id          BIGSERIAL PRIMARY KEY,
       client_id   BIGINT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
       day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
       workout_name TEXT NOT NULL,
       created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
       UNIQUE (client_id, day_of_week)
     )`,
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_weekly_plans_client ON weekly_plans(client_id)',
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS nutrition_entries (
       id          BIGSERIAL PRIMARY KEY,
       client_id   BIGINT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
       food_text   TEXT NOT NULL,
       calories    NUMERIC(7,1),
       protein     NUMERIC(6,1),
       fats        NUMERIC(6,1),
       carbs       NUMERIC(6,1),
       source      TEXT NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'manual')),
       eaten_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
       created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_nutrition_client ON nutrition_entries(client_id)',
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_nutrition_eaten_at ON nutrition_entries(eaten_at)',
  );
  await pool.query(
    `CREATE TABLE IF NOT EXISTS notifications (
       id                BIGSERIAL PRIMARY KEY,
       client_profile_id BIGINT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
       telegram_id       BIGINT,
       text              TEXT NOT NULL,
       type              TEXT NOT NULL DEFAULT 'info',
       sent_at           TIMESTAMPTZ,
       created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_notifications_unsent ON notifications(sent_at) WHERE sent_at IS NULL',
  );
  await pool.query(
    'CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications(client_profile_id)',
  );
  console.log('Схема применена успешно');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Ошибка миграции:', err.message);
  process.exit(1);
});
