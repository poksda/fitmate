import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHmac } from 'node:crypto';
import { query } from '../db.js';

/** Проверка подписи Telegram initData согласно документации Bot API */
function verifyInitData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return false;
    params.delete('hash');

    const dataCheckString = [...params.entries()]
      .map(([k, v]) => `${k}=${v}`)
      .sort()
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const computed = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');

    return computed === hash;
  } catch {
    return false;
  }
}

function parseUser(initData: string): {
  id?: number;
  first_name?: string;
  last_name?: string;
  username?: string;
} {
  try {
    const params = new URLSearchParams(initData);
    const userRaw = params.get('user');
    return userRaw ? JSON.parse(userRaw) : {};
  } catch {
    return {};
  }
}

/** Защита: либо x-bot-key (старые интеграции), либо JWT клиента. /tg-login — публичный. */
async function auth(request: FastifyRequest, reply: FastifyReply) {
  if (request.url.endsWith('/tg-login')) {
    return;
  }
  const key = request.headers['x-bot-key'];
  if (key === process.env.BOT_API_KEY) {
    return;
  }
  try {
    await request.jwtVerify();
    return;
  } catch {
    return reply.code(401).send({ error: 'Нет доступа' });
  }
}

export async function botRoutes(app: FastifyInstance) {
  // Вход клиента через Telegram Mini App (initData)
  // Публичный: безопасность обеспечивается подписью initData
  app.post('/tg-login', async (request, reply) => {
    const { init_data, trainer_code } = request.body as {
      init_data: string;
      trainer_code?: string;
    };
    if (!init_data) {
      return reply.code(400).send({ error: 'Нет init_data' });
    }

    const botToken = process.env.BOT_TOKEN ?? '';
    if (!verifyInitData(init_data, botToken)) {
      return reply.code(401).send({ error: 'Недействительная подпись Telegram' });
    }

    const user = parseUser(init_data);
    if (!user.id) {
      return reply.code(400).send({ error: 'Нет данных пользователя' });
    }
    const telegramId = user.id;
    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || 'Клиент';
const existing = await query<{ id: number; trainer_id: number | null }>(
      `SELECT cp.id, cp.trainer_id FROM client_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE u.telegram_id = $1`,
      [telegramId],
    );

    let clientId: number;
    let trainerId: number;
    let newUser = false;

    if (existing.length > 0 && existing[0].trainer_id) {
      clientId = existing[0].id;
      trainerId = existing[0].trainer_id;
    } else {
      if (!trainer_code) {
        return reply.code(428).send({ needs_trainer_code: true });
      }
      const trainers = await query<{ id: number; name: string }>(
        `SELECT id, name FROM users
         WHERE role = 'trainer' AND lower(name) = lower($1)`,
        [trainer_code],
      );
      if (trainers.length === 0) {
        return reply.code(404).send({ error: 'Тренер не найден' });
      }
      trainerId = trainers[0].id;

      if (existing.length > 0) {
        // Клиент уже есть, но отвязан от тренера — привязываем заново
        const updated = await query<{ id: number }>(
          `UPDATE client_profiles SET trainer_id = $2 WHERE id = $1 RETURNING id`,
          [existing[0].id, trainerId],
        );
        clientId = updated[0].id;
      } else {
        const created = await query<{ id: number }>(
          `INSERT INTO users (role, name, telegram_id)
           VALUES ('client', $1, $2) RETURNING id`,
          [name, telegramId],
        );
        const userId = created[0].id;
        const profile = await query<{ id: number }>(
          `INSERT INTO client_profiles (user_id, trainer_id)
           VALUES ($1, $2) RETURNING id`,
          [userId, trainerId],
        );
        clientId = profile[0].id;
        newUser = true;
      }
    }

    const trainer = await query<{ id: number; name: string }>(
      'SELECT id, name FROM users WHERE id = $1',
      [trainerId],
    );

    const clientInfo = await query<{ status: string; workouts_left: number | null }>(
      'SELECT status, workouts_left FROM client_profiles WHERE id = $1',
      [clientId],
    );

    // Выдаём JWT клиенту — им защищены все остальные эндпоинты
    const token = app.jwt.sign({ id: clientId, role: 'client', clientId });

    return {
      token,
      client_id: clientId,
      trainer: trainer[0],
      client: clientInfo[0] ?? { status: 'active', workouts_left: null },
      new_user: newUser,
    };
  });

  // Все остальные маршруты бота — под защитой (x-bot-key или JWT)
  app.addHook('preHandler', auth);

  // Статус клиента: актуальный статус и счётчик оставшихся тренировок
  app.get('/me', async (request, reply) => {
    const clientId = (request.user as any)?.clientId ?? (request.user as any)?.id;
    const rows = await query(
      `SELECT status, workouts_left FROM client_profiles WHERE id = $1`,
      [clientId],
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'Клиент не найден' });
    return { client: rows[0] };
  });

  // План тренировок на неделю + что сегодня по плану
  app.get('/plan', async (request, reply) => {
    const clientId = (request.user as any)?.clientId ?? (request.user as any)?.id;
    const rows = await query<{ day_of_week: number; workout_name: string }>(
      `SELECT day_of_week, workout_name
       FROM weekly_plans WHERE client_id = $1 ORDER BY day_of_week`,
      [clientId],
    );
    const now = new Date();
    // getDay(): 0=Вс..6=Сб -> приводим к 1=Пн..7=Вс
    const todayDow = ((now.getDay() + 6) % 7) + 1;
    const today = rows.find((r) => r.day_of_week === todayDow)?.workout_name ?? null;
    return { plan: rows, today };
  });

  // Отвязаться от тренера: клиент уходит от текущего тренера
  app.post('/unbind', async (request, reply) => {
    const clientId = (request.user as any)?.clientId ?? (request.user as any)?.id;
    const rows = await query(
      `UPDATE client_profiles
       SET trainer_id = NULL, status = 'active', workouts_left = NULL
       WHERE id = $1 RETURNING id`,
      [clientId],
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'Клиент не найден' });
    return { ok: true };
  });

  // Вход/регистрация клиента по telegram_id (устаревший, для совместимости)
  app.post('/login', async (request, reply) => {
    const { telegram_id, name, trainer_code } = request.body as {
      telegram_id: number;
      name: string;
      trainer_code: string;
    };
    if (!telegram_id || !name || !trainer_code) {
      return reply.code(400).send({ error: 'Не хватает данных' });
    }

    const trainers = await query<{ id: number; name: string }>(
      `SELECT id, name FROM users
       WHERE role = 'trainer' AND lower(name) = lower($1)`,
      [trainer_code],
    );
    if (trainers.length === 0) {
      return reply.code(404).send({ error: 'Тренер не найден' });
    }
    const trainer = trainers[0];

    let clients = await query<{ id: number; trainer_id: number }>(
      `SELECT cp.id, cp.trainer_id FROM client_profiles cp
       JOIN users u ON u.id = cp.user_id
       WHERE u.telegram_id = $1`,
      [telegram_id],
    );

    let clientId: number;
    if (clients.length === 0) {
      const created = await query<{ id: number }>(
        `INSERT INTO users (role, name, telegram_id)
         VALUES ('client', $1, $2) RETURNING id`,
        [name, telegram_id],
      );
      const userId = created[0].id;
      const profile = await query<{ id: number }>(
        `INSERT INTO client_profiles (user_id, trainer_id)
         VALUES ($1, $2) RETURNING id`,
        [userId, trainer.id],
      );
      clientId = profile[0].id;
    } else {
      clientId = clients[0].id;
    }

    return { client_id: clientId, trainer: { id: trainer.id, name: trainer.name } };
  });

  // Тренировки клиента (с упражнениями и подходами)
  app.get('/workouts', async (request, reply) => {
    const { client_id } = request.query as { client_id: string };
    if (!client_id) return reply.code(400).send({ error: 'client_id обязателен' });

    const rows = await query(
      `SELECT w.id, w.client_id, w.scheduled_at, w.completed_at, w.name,
              w.general_note, w.trainer_summary, w.author, w.created_at,
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
      [client_id],
    );
    return { workouts: rows };
  });

  // Создать тренировку
  app.post('/workouts', async (request, reply) => {
    const { client_id, scheduled_at, name, general_note, author } = request.body as {
      client_id: number;
      scheduled_at: string;
      name?: string;
      general_note?: string;
      author: 'trainer' | 'client';
    };
    if (!client_id || !scheduled_at || !author) {
      return reply.code(400).send({ error: 'Не хватает данных' });
    }

    const rows = await query(
      `INSERT INTO workouts (client_id, scheduled_at, name, general_note, author)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [client_id, scheduled_at, name ?? null, general_note ?? null, author],
    );
    return { workout: rows[0] };
  });

  // Добавить упражнение к тренировке
  app.post('/workouts/:id/exercises', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, note, author } = request.body as {
      name: string;
      note?: string;
      author: 'trainer' | 'client';
    };
    if (!name || !author) return reply.code(400).send({ error: 'Не хватает данных' });

    const rows = await query(
      `INSERT INTO exercises (workout_id, name, note, author)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, name, note ?? null, author],
    );
    return { exercise: rows[0] };
  });

  // Добавить подход к упражнению
  app.post('/exercises/:id/sets', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { set_number, weight_kg, reps, technique_ok, author } = request.body as {
      set_number: number;
      weight_kg?: number;
      reps?: number;
      technique_ok?: boolean;
      author: 'trainer' | 'client';
    };
    if (!set_number || !author) return reply.code(400).send({ error: 'Не хватает данных' });

    const rows = await query(
      `INSERT INTO sets (exercise_id, set_number, weight_kg, reps, technique_ok, author)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, set_number, weight_kg ?? null, reps ?? null, technique_ok ?? null, author],
    );
    return { set: rows[0] };
  });

  // Завершить тренировку
  app.post('/workouts/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { trainer_summary, general_note } = request.body as {
      trainer_summary?: string;
      general_note?: string;
    };

    const rows = await query(
      `UPDATE workouts
       SET completed_at = now(),
           trainer_summary = COALESCE($2, trainer_summary),
           general_note = COALESCE($3, general_note)
       WHERE id = $1 AND completed_at IS NULL RETURNING *`,
      [id, trainer_summary ?? null, general_note ?? null],
    );
    if (rows.length > 0) {
      // Уменьшаем счётчик оставшихся тренировок, если он задан
      await query(
        `UPDATE client_profiles
         SET workouts_left = GREATEST(0, workouts_left - 1)
         WHERE id = $1 AND workouts_left IS NOT NULL`,
        [rows[0].client_id],
      );
    }
    return { workout: rows[0] };
  });

  // Прогресс: записать вес тела / замер
  app.post('/progress', async (request, reply) => {
    const { client_id, weight_kg, note } = request.body as {
      client_id: number;
      weight_kg?: number;
      note?: string;
    };
    if (!client_id) return reply.code(400).send({ error: 'client_id обязателен' });

    const rows = await query(
      `INSERT INTO progress_entries (client_id, weight_kg, note)
       VALUES ($1, $2, $3) RETURNING *`,
      [client_id, weight_kg ?? null, note ?? null],
    );
    return { entry: rows[0] };
  });

  // История прогресса
  app.get('/progress', async (request, reply) => {
    const { client_id } = request.query as { client_id: string };
    if (!client_id) return reply.code(400).send({ error: 'client_id обязателен' });

    const rows = await query(
      `SELECT id, client_id, weight_kg, measurements, note, created_at
       FROM progress_entries WHERE client_id = $1 ORDER BY created_at ASC`,
      [client_id],
    );
    return { entries: rows };
  });

  // ---- Дневник питания (КБЖУ) ----

  // Записать приём пищи: текст -> ИИ оценивает КБЖУ
  app.post('/nutrition', async (request, reply) => {
    const { client_id, food_text } = request.body as {
      client_id: number;
      food_text: string;
    };
    if (!client_id || !food_text?.trim()) {
      return reply.code(400).send({ error: 'Нужен client_id и описание еды' });
    }

    const { estimateKbju } = await import('../ai.js');
    const kbju = await estimateKbju(food_text.trim());

    const rows = await query(
      `INSERT INTO nutrition_entries (client_id, food_text, calories, protein, fats, carbs, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'ai') RETURNING *`,
      [client_id, food_text.trim(), kbju.calories, kbju.protein, kbju.fats, kbju.carbs],
    );
    return { entry: rows[0] };
  });

  // Список записей питания (с фильтром по дням: days = 1 | 7 | 30, либо from/to)
  app.get('/nutrition', async (request, reply) => {
    const { client_id, days, from, to } = request.query as {
      client_id: string;
      days?: string;
      from?: string;
      to?: string;
    };
    if (!client_id) return reply.code(400).send({ error: 'client_id обязателен' });

    const limitDays = Number(days) || 7;
    const fromIso = from ?? new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString();
    const toIso = to ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const rows = await query(
      `SELECT id, food_text, calories, protein, fats, carbs, source, eaten_at
       FROM nutrition_entries
       WHERE client_id = $1 AND eaten_at >= $2 AND eaten_at <= $3
       ORDER BY eaten_at DESC`,
      [client_id, fromIso, toIso],
    );
    return { entries: rows };
  });

  // Редактировать запись питания
  app.patch('/nutrition/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { client_id, food_text, calories, protein, fats, carbs } = request.body as {
      client_id: number;
      food_text?: string;
      calories?: number;
      protein?: number;
      fats?: number;
      carbs?: number;
    };
    if (!client_id) return reply.code(400).send({ error: 'client_id обязателен' });

    const rows = await query(
      `UPDATE nutrition_entries
       SET food_text = COALESCE($3, food_text),
           calories = COALESCE($4, calories),
           protein = COALESCE($5, protein),
           fats = COALESCE($6, fats),
           carbs = COALESCE($7, carbs),
           source = 'manual'
       WHERE id = $1 AND client_id = $2 RETURNING *`,
      [id, client_id, food_text ?? null, calories ?? null, protein ?? null, fats ?? null, carbs ?? null],
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'Запись не найдена' });
    return { entry: rows[0] };
  });

  // Удалить запись питания
  app.delete('/nutrition/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { client_id } = request.body as { client_id?: number };
    if (!client_id) return reply.code(400).send({ error: 'client_id обязателен' });

    const rows = await query(
      `DELETE FROM nutrition_entries WHERE id = $1 AND client_id = $2 RETURNING id`,
      [id, client_id],
    );
    if (rows.length === 0) return reply.code(404).send({ error: 'Запись не найдена' });
    return { ok: true };
  });

  // Цели клиента + последний вес (для прогресса к цели)
  app.get('/goals', async (request, reply) => {
    const clientId = (request.user as any)?.clientId ?? (request.user as any)?.id;
    const rows = await query(
      `SELECT goal_weight, goal_calories, goal_protein, goal_fats, goal_carbs
       FROM client_profiles WHERE id = $1`,
      [clientId],
    );
    const weight = await query(
      `SELECT weight_kg FROM progress_entries
       WHERE client_id = $1 AND weight_kg IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      [clientId],
    );
    return {
      goals: rows[0] ?? null,
      latest_weight: weight[0]?.weight_kg ?? null,
    };
  });

  // Сводка за период: суммы и среднее по дням
  app.get('/nutrition/summary', async (request, reply) => {
    const { client_id, days } = request.query as {
      client_id: string;
      days?: string;
    };
    if (!client_id) return reply.code(400).send({ error: 'client_id обязателен' });

    const limitDays = Number(days) || 7;
    const from = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString();

    const rows = await query<{
      day: string;
      calories: number | null;
      protein: number | null;
      fats: number | null;
      carbs: number | null;
      count: number;
    }>(
      `SELECT to_char(eaten_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day,
              SUM(calories) AS calories, SUM(protein) AS protein,
              SUM(fats) AS fats, SUM(carbs) AS carbs, COUNT(*) AS count
       FROM nutrition_entries
       WHERE client_id = $1 AND eaten_at >= $2
       GROUP BY day ORDER BY day ASC`,
      [client_id, from],
    );
    return { days: rows };
  });

  // ИИ-анализ питания за период
  app.get('/nutrition/analysis', async (request, reply) => {
    const { client_id, days } = request.query as {
      client_id: string;
      days?: string;
    };
    if (!client_id) return reply.code(400).send({ error: 'client_id обязателен' });

    const limitDays = Number(days) || 7;
    const from = new Date(Date.now() - limitDays * 24 * 60 * 60 * 1000).toISOString();

    const rows = await query(
      `SELECT food_text, calories, protein, fats, carbs, eaten_at
       FROM nutrition_entries
       WHERE client_id = $1 AND eaten_at >= $2
       ORDER BY eaten_at ASC`,
      [client_id, from],
    );

    const { analyzeNutrition } = await import('../ai.js');
    const analysis = await analyzeNutrition(rows);
    return { analysis };
  });

  // ---- Уведомления: бот забирает очередь и отправляет в Telegram ----

  // Очередь неотправленных уведомлений (только для бота по x-bot-key или JWT)
  app.get('/notifications/pending', async (request) => {
    const rows = await query(
      `SELECT id, telegram_id, text
       FROM notifications
       WHERE sent_at IS NULL AND telegram_id IS NOT NULL
       ORDER BY created_at ASC
       LIMIT 50`,
    );
    return { notifications: rows };
  });

  // Отметить уведомление как отправленное
  app.post('/notifications/:id/sent', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rows = await query(
      `UPDATE notifications SET sent_at = now() WHERE id = $1 AND sent_at IS NULL RETURNING id`,
      [id],
    );
    return { ok: rows.length > 0 };
  });
}
