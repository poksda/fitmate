import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { id: number; role: string; clientId?: number };
    user: { id: number; role: string; clientId?: number };
  }
}