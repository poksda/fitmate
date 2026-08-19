import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import { trainerRoutes } from './routes/trainer.js';
import { botRoutes } from './routes/bot.js';
import { startReminderScheduler } from './notifications.js';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });
await app.register(jwt, { secret: process.env.JWT_SECRET ?? 'dev-secret' });

app.get('/health', async () => ({ status: 'ok' }));

app.register(trainerRoutes, { prefix: '/api/trainer' });
app.register(botRoutes, { prefix: '/api/bot' });

const port = Number(process.env.PORT ?? 4000);
try {
  await app.listen({ port, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

startReminderScheduler();
