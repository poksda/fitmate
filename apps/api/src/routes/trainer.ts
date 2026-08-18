import { FastifyInstance } from 'fastify';
import bcrypt from 'bcryptjs';
import { query } from '../db.js';

type RegisterBody = {
  name: string;
  email: string;
  password: string;
};

type LoginBody = {
  email: string;
  password: string;
};

export async function trainerRoutes(app: FastifyInstance) {
  // Регистрация тренера
  app.post('/register', async (request, reply) => {
    const { name, email, password } = request.body as RegisterBody;
    if (!name || !email || !password) {
      return reply.code(400).send({ error: 'Не хватает данных' });
    }

    const existing = await query<{ id: number }>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );
    if (existing.length > 0) {
      return reply.code(409).send({ error: 'Тренер с таким email уже существует' });
    }

    const hash = await bcrypt.hash(password, 10);
    const rows = await query<{ id: number; name: string; email: string }>(
      `INSERT INTO users (role, name, email, password_hash)
       VALUES ('trainer', $1, $2, $3) RETURNING id, name, email`,
      [name, email, hash],
    );
    const user = rows[0];

    const token = app.jwt.sign({ id: user.id, role: 'trainer' });
    return { token, user };
  });

  // Вход тренера
  app.post('/login', async (request, reply) => {
    const { email, password } = request.body as LoginBody;
    const rows = await query<{
      id: number;
      name: string;
      email: string;
      password_hash: string;
    }>(
      'SELECT id, name, email, password_hash FROM users WHERE email = $1 AND role = $2',
      [email, 'trainer'],
    );
    const user = rows[0];
    if (!user) return reply.code(401).send({ error: 'Неверный email или пароль' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return reply.code(401).send({ error: 'Неверный email или пароль' });

    const token = app.jwt.sign({ id: user.id, role: 'trainer' });
    return { token, user: { id: user.id, name: user.name, email: user.email } };
  });

  // ---- Защищённые маршруты (только для тренера) ----

  const authTrainer = async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: 'Требуется авторизация' });
    }
  };

  app.addHook('preHandler', async (request, reply) => {
    const url = request.url;
    if (url.endsWith('/login') || url.endsWith('/register')) {
      return;
    }
    await authTrainer(request, reply);
  });

  // Список клиентов тренера
  app.get('/clients', async (request) => {
    const trainerId = request.user!.id;
    const rows = await query(
      `SELECT cp.id AS client_profile_id, cp.weight_kg, cp.goals,
              u.id AS user_id, u.name, u.telegram_id,
              (SELECT count(*) FROM workouts w
                WHERE w.client_id = cp.id AND w.completed_at IS NOT NULL) AS workout_count
       FROM client_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.trainer_id = $1
       ORDER BY u.name`,
      [trainerId],
    );
    return { clients: rows };
  });

  // Карточка клиента: профиль + тренировки
  app.get('/clients/:id', async (request, reply) => {
    const trainerId = request.user!.id;
    const { id } = request.params as { id: string };

    const profile = await query(
      `SELECT cp.id AS client_profile_id, cp.weight_kg, cp.goals, u.name
       FROM client_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE cp.id = $1 AND cp.trainer_id = $2`,
      [id, trainerId],
    );
    if (profile.length === 0) {
      return reply.code(404).send({ error: 'Клиент не найден' });
    }

    const workouts = await query(
      `SELECT w.*,
              (SELECT json_agg(
                 json_build_object(
                   'id', e.id, 'name', e.name, 'note', e.note, 'author', e.author,
                   'sets', COALESCE((
                     SELECT json_agg(json_build_object(
                       'id', s.id, 'set_number', s.set_number, 'weight_kg', s.weight_kg,
                       'reps', s.reps, 'technique_ok', s.technique_ok, 'author', s.author
                     ) ORDER BY s.set_number)
                     FROM sets s WHERE s.exercise_id = e.id
                   ), '[]'::json)
                 )
                 ORDER BY e.order_index, e.id)
               FROM exercises e WHERE e.workout_id = w.id
              ) AS exercises
       FROM workouts w
       WHERE w.client_id = $1
       ORDER BY w.scheduled_at DESC`,
      [id],
    );

    return { client: profile[0], workouts };
  });

  // Прогресс клиента (для графика веса)
  app.get('/clients/:id/progress', async (request, reply) => {
    const trainerId = request.user!.id;
    const { id } = request.params as { id: string };

    const ok = await query(
      'SELECT id FROM client_profiles WHERE id = $1 AND trainer_id = $2',
      [id, trainerId],
    );
    if (ok.length === 0) return reply.code(403).send({ error: 'Это не ваш клиент' });

    const rows = await query(
      `SELECT id, weight_kg, measurements, note, created_at
       FROM progress_entries WHERE client_id = $1 ORDER BY created_at ASC`,
      [id],
    );
    return { entries: rows };
  });

  // Комментарий тренера к тренировке (тренерский разбор)
  app.post('/workouts/:id/comment', async (request, reply) => {
    const trainerId = request.user!.id;
    const { id } = request.params as { id: string };
    const { trainer_summary } = request.body as { trainer_summary?: string };

    const owned = await query(
      `SELECT w.id FROM workouts w
       JOIN client_profiles cp ON cp.id = w.client_id
       WHERE w.id = $1 AND cp.trainer_id = $2`,
      [id, trainerId],
    );
    if (owned.length === 0) return reply.code(403).send({ error: 'Нет доступа' });

    const rows = await query(
      `UPDATE workouts SET trainer_summary = $2 WHERE id = $1 RETURNING *`,
      [id, trainer_summary ?? null],
    );
    return { workout: rows[0] };
  });

  // ---- Тренер тоже может записывать тренировки ----

  // Создать тренировку клиенту
  app.post('/workouts', async (request, reply) => {
    const trainerId = request.user!.id;
    const { client_id, scheduled_at } = request.body as {
      client_id: number;
      scheduled_at: string;
    };

    const ok = await query(
      'SELECT id FROM client_profiles WHERE id = $1 AND trainer_id = $2',
      [client_id, trainerId],
    );
    if (ok.length === 0) return reply.code(403).send({ error: 'Это не ваш клиент' });

    const rows = await query(
      `INSERT INTO workouts (client_id, scheduled_at, author)
       VALUES ($1, $2, 'trainer') RETURNING *`,
      [client_id, scheduled_at],
    );
    return { workout: rows[0] };
  });

  // Добавить упражнение
  app.post('/workouts/:id/exercises', async (request, reply) => {
    const trainerId = request.user!.id;
    const { id } = request.params as { id: string };
    const { name, note } = request.body as { name: string; note?: string };

    const owned = await query(
      `SELECT w.id FROM workouts w
       JOIN client_profiles cp ON cp.id = w.client_id
       WHERE w.id = $1 AND cp.trainer_id = $2`,
      [id, trainerId],
    );
    if (owned.length === 0) return reply.code(403).send({ error: 'Нет доступа' });

    const rows = await query(
      `INSERT INTO exercises (workout_id, name, note, author)
       VALUES ($1, $2, $3, 'trainer') RETURNING *`,
      [id, name, note ?? null],
    );
    return { exercise: rows[0] };
  });

  // Добавить подход
  app.post('/exercises/:id/sets', async (request, reply) => {
    const trainerId = request.user!.id;
    const { id } = request.params as { id: string };
    const { set_number, weight_kg, reps, technique_ok } = request.body as {
      set_number: number;
      weight_kg?: number;
      reps?: number;
      technique_ok?: boolean;
    };

    const owned = await query(
      `SELECT e.id FROM exercises e
       JOIN workouts w ON w.id = e.workout_id
       JOIN client_profiles cp ON cp.id = w.client_id
       WHERE e.id = $1 AND cp.trainer_id = $2`,
      [id, trainerId],
    );
    if (owned.length === 0) return reply.code(403).send({ error: 'Нет доступа' });

    const rows = await query(
      `INSERT INTO sets (exercise_id, set_number, weight_kg, reps, technique_ok, author)
       VALUES ($1, $2, $3, $4, $5, 'trainer') RETURNING *`,
      [id, set_number, weight_kg ?? null, reps ?? null, technique_ok ?? null],
    );
    return { set: rows[0] };
  });
}
