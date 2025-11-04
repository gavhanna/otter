import { type FastifyInstance } from 'fastify';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/bootstrap', async (request, reply) => {
    app.log.debug('Bootstrap endpoint hit');
    return reply.code(501).send({ message: 'Bootstrap not yet implemented' });
  });

  app.post('/auth/login', async (request, reply) => {
    app.log.debug('Login endpoint hit');
    return reply.code(501).send({ message: 'Login not yet implemented' });
  });

  app.post('/auth/logout', async (_request, reply) => {
    return reply.code(204).send();
  });
}
