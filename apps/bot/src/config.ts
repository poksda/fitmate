import 'dotenv/config';

export const config = {
  botToken: process.env.BOT_TOKEN!,
  apiUrl: process.env.BOT_API_URL ?? 'http://localhost:4000/api/bot',
  apiKey: process.env.BOT_API_KEY!,
};