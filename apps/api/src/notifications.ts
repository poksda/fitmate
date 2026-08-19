import { query } from './db.js';

/** Создать уведомление клиенту (бот отправит его в Telegram) */
export async function notifyClient(
  clientProfileId: number | string,
  text: string,
  type = 'info',
) {
  const rows = await query(
    `INSERT INTO notifications (client_profile_id, telegram_id, text, type)
     SELECT cp.id, u.telegram_id, $3, $4
     FROM client_profiles cp
     JOIN users u ON u.id = cp.user_id
     WHERE cp.id = $1 AND u.telegram_id IS NOT NULL
     RETURNING *`,
    [clientProfileId, null, text, type],
  );
  return rows[0] ?? null;
}

function hourNow(): number {
  return new Date().getUTCHours();
}

function todayDow(): number {
  const now = new Date();
  return ((now.getDay() + 6) % 7) + 1;
}

function dayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Проверить, что напоминание этого типа клиенту сегодня ещё не уходило */
async function alreadySentToday(clientProfileId: number, type: string): Promise<boolean> {
  const rows = await query(
    `SELECT 1 FROM notifications
     WHERE client_profile_id = $1 AND type = $2
       AND created_at::date = CURRENT_DATE`,
    [clientProfileId, type],
  );
  return rows.length > 0;
}

/** Ежедневные напоминания: утром — тренировка по плану, вечером — записать питание */
export async function runReminders() {
  const hour = hourNow();

  if (hour === Number(process.env.PLAN_REMINDER_HOUR ?? 6)) {
    const dow = todayDow();
    const clients = await query<{ client_id: number }>(
      `SELECT DISTINCT w.client_id FROM weekly_plans w
       JOIN client_profiles cp ON cp.id = w.client_id
       WHERE w.day_of_week = $1 AND cp.status = 'active'
         AND cp.trainer_id IS NOT NULL`,
      [dow],
    );
    for (const c of clients) {
      if (await alreadySentToday(c.client_id, 'plan_reminder')) continue;
      const plan = await query<{ workout_name: string }>(
        'SELECT workout_name FROM weekly_plans WHERE client_id = $1 AND day_of_week = $2',
        [c.client_id, dow],
      );
      await notifyClient(
        c.client_id,
        `🏋️ Сегодня по плану: ${plan[0].workout_name}. Хорошей тренировки!`,
        'plan_reminder',
      );
    }
  }

  if (hour === Number(process.env.NUTRITION_REMINDER_HOUR ?? 18)) {
    const clients = await query<{ client_id: number }>(
      `SELECT cp.id AS client_id FROM client_profiles cp
       WHERE cp.status = 'active' AND cp.trainer_id IS NOT NULL`,
    );
    for (const c of clients) {
      if (await alreadySentToday(c.client_id, 'nutrition_reminder')) continue;
      await notifyClient(
        c.client_id,
        '🍽️ Не забудьте записать, что вы ели сегодня. Это поможет тренеру скорректировать питание.',
        'nutrition_reminder',
      );
    }
  }
}

/** Запуск планировщика: каждую минуту проверяем, не настало ли время напоминания */
export function startReminderScheduler() {
  runReminders().catch((err) => console.error('Reminders error:', err.message));
  setInterval(() => {
    runReminders().catch((err) => console.error('Reminders error:', err.message));
  }, 60_000);
}