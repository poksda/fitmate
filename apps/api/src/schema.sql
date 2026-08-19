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
  goal_weight   NUMERIC(5,1),            -- целевой вес, кг
  goal_calories INT,                     -- целевая калорийность, ккал/день
  goal_protein  INT,                     -- целевой белок, г/день
  goal_fats     INT,                     -- целевые жиры, г/день
  goal_carbs    INT,                     -- целевые углеводы, г/день
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

-- План тренировок на неделю (день недели 1=Пн .. 7=Вс -> название)
CREATE TABLE IF NOT EXISTS weekly_plans (
  id          BIGSERIAL PRIMARY KEY,
  client_id   BIGINT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  workout_name TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, day_of_week)
);

-- Дневник питания (КБЖУ): одна строка = один приём пищи/продукт
CREATE TABLE IF NOT EXISTS nutrition_entries (
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
);

-- Индексы для частых запросов
CREATE INDEX IF NOT EXISTS idx_client_profiles_trainer ON client_profiles(trainer_id);
CREATE INDEX IF NOT EXISTS idx_workouts_client ON workouts(client_id);
CREATE INDEX IF NOT EXISTS idx_exercises_workout ON exercises(workout_id);
CREATE INDEX IF NOT EXISTS idx_sets_exercise ON sets(exercise_id);
CREATE INDEX IF NOT EXISTS idx_progress_client ON progress_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_weekly_plans_client ON weekly_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_client ON nutrition_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_eaten_at ON nutrition_entries(eaten_at);

-- Уведомления клиентам (бот отправляет их в Telegram)
CREATE TABLE IF NOT EXISTS notifications (
  id                BIGSERIAL PRIMARY KEY,
  client_profile_id BIGINT NOT NULL REFERENCES client_profiles(id) ON DELETE CASCADE,
  telegram_id       BIGINT,
  text              TEXT NOT NULL,
  type              TEXT NOT NULL DEFAULT 'info',
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_unsent ON notifications(sent_at) WHERE sent_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_client ON notifications(client_profile_id);
