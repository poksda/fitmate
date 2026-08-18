import { Bot, InlineKeyboard, webhookCallback } from 'grammy';
import { createServer } from 'node:http';
import { config } from './config.js';

const bot = new Bot(config.botToken);

// URL мини-приложения (нужен HTTPS; локально — туннель, в проде — деплой)
const MINIAPP_URL =
  process.env.MINIAPP_URL ?? 'https://fitmate-miniapp.onrender.com';

// Кнопка, открывающая приложение прямо в Telegram
const OPEN_APP = new InlineKeyboard().webApp('Открыть FitMate', MINIAPP_URL);

bot.command('start', async (ctx) => {
  const name = ctx.from?.first_name ?? 'друг';
  await ctx.reply(
    `Привет, ${name}! 👋\n` +
      `FitMate — ваш дневник тренировок.\n\n` +
      `Нажмите «Открыть FitMate», чтобы начать:`,
    { reply_markup: OPEN_APP },
  );
});

bot.command('app', async (ctx) => {
  await ctx.reply('Откройте приложение:', { reply_markup: OPEN_APP });
});

bot.command('help', async (ctx) => {
  await ctx.reply(
    `FitMate — ваш дневник тренировок.\n\n` +
      `Откройте приложение кнопкой ниже и ведите тренировки, ` +
      `следите за прогрессом и весом.`,
    { reply_markup: OPEN_APP },
  );
});

// Устанавливаем кнопку-меню «Открыть приложение» у бота в Telegram
bot.api
  .setChatMenuButton({
    menu_button: {
      type: 'web_app',
      text: 'FitMate',
      web_app: { url: MINIAPP_URL },
    },
  })
  .catch((err) => console.error('Не удалось установить кнопку меню:', err.message));

bot.catch((err) => {
  console.error('Bot error:', err);
});

// На Render работаем через webhook, локально — через long polling
const webhookBase = process.env.WEBHOOK_URL ?? process.env.RENDER_EXTERNAL_URL;

if (webhookBase) {
  const webhookPath = '/webhook';
  const webhookUrl = `${webhookBase}${webhookPath}`;
  const server = createServer(async (req, res) => {
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
      return;
    }
    const handler = webhookCallback(bot, 'http');
    await handler(req, res);
  });
  server.listen(Number(process.env.PORT ?? 8080), async () => {
    await bot.api.setWebhook(webhookUrl);
    console.log(`FitMate бот запущен (webhook: ${webhookUrl})`);
  });
} else {
  bot.start();
  console.log('FitMate бот запущен (long polling)');
}