import '@fastify/jwt';

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; role: 'admin' | 'user' };
    user: { id: string; role: 'admin' | 'user' };
  }
}
