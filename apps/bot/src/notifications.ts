import { Bot } from 'grammy';
import { config } from './config.js';

type PendingNotification = { id: number; telegram_id: number; text: string };

async function fetchPending(): Promise<PendingNotification[]> {
  const res = await fetch(`${config.apiUrl}/notifications/pending`, {
    headers: { 'x-bot-key': config.apiKey },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { notifications: PendingNotification[] };
  return data.notifications ?? [];
}

async function markSent(id: number) {
  await fetch(`${config.apiUrl}/notifications/${id}/sent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-bot-key': config.apiKey },
    body: '{}',
  }).catch(() => {});
}

/** Забирает очередь уведомлений из API и отправляет клиентам в Telegram */
export function startNotificationPoller(bot: Bot, intervalMs = 30_000) {
  const tick = async () => {
    const pending = await fetchPending().catch((err) => {
      console.error('Не удалось получить уведомления:', err.message);
      return [];
    });
    for (const n of pending) {
      try {
        await bot.api.sendMessage(n.telegram_id, n.text);
      } catch (err: any) {
        console.error(`Ошибка отправки уведомления ${n.id}:`, err.message);
      } finally {
        await markSent(n.id);
      }
    }
  };

  tick();
  setInterval(tick, intervalMs);
}