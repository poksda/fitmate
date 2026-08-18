-- ============================================================
-- FitMate: схема базы данных (PostgreSQL)
-- ============================================================

-- Пользователи: тренеры и клиенты в одной таблице
CREATE TABLE IF NOT EXISTS users (
  id            BIGSERIAL PRIMARY KEY,
  role          TEXT NOT NULL CHECK (role IN ('trainer', 'client')),
  name          TEXT NOT NULL,
  telegram_id   BIGINT UNIQUE,           -- клиент
  email         TEXT UNIQUE,             -- тренер (вход в веб)
  password_hash TEXT,                    -- тренер
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Связь клиент <-> тренер
CREATE TABLE IF NOT EXISTS client_profiles (
  id            BIGSERIAL PRIMARY KEY,
  user_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trainer_id    BIGINT REFERENCES users(id) ON DELETE CASCADE,
  weight_kg     NUMERIC(5,1),
  goals         TEXT,
  status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  workouts_left INT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

-- Тренировки
CREATE TABLE IF NOT EXISTS workouts (
  id              BIGSERIAL PRIMARY KEY,
  client_id       BIGINT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  completed_at    TIMESTAMPTZ,
  name            TEXT,
  general_note    TEXT,
  trainer_summary TEXT,
  author          TEXT NOT NULL CHECK (author IN ('trainer', 'client')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Упражнения внутри тренировки
CREATE TABLE IF NOT EXISTS exercises (
  id          BIGSERIAL PRIMARY KEY,
  workout_id  BIGINT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  note        TEXT,
  author      TEXT NOT NULL CHECK (author IN ('trainer', 'client')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Подходы внутри упражнения
CREATE TABLE IF NOT EXISTS sets (
  id           BIGSERIAL PRIMARY KEY,
  exercise_id  BIGINT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  set_number   INT NOT NULL,
  weight_kg    NUMERIC(6,2),
  reps         INT,
  technique_ok BOOLEAN,
  author       TEXT NOT NULL CHECK (author IN ('trainer', 'client')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Прогресс клиента (вес тела, замеры)
CREATE TABLE IF NOT EXISTS progress_entries (
  id           BIGSERIAL PRIMARY KEY,
  client_id    BIGINT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  weight_kg    NUMERIC(5,1),
  measurements JSONB,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Индексы для частых запросов
CREATE INDEX IF NOT EXISTS idx_client_profiles_trainer ON client_profiles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_workouts_client ON workouts(client_id);
CREATE INDEX IF NOT EXISTS idx_exercises_workout ON exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_progress_client ON progress_entries(client_id);
