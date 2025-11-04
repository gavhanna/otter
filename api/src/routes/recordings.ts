import { type FastifyInstance } from 'fastify';

export async function registerRecordingRoutes(app: FastifyInstance): Promise<void> {
  app.get('/recordings', async () => {
    return { recordings: [] };
  });

  app.post('/recordings', async (_request, reply) => {
    return reply.code(501).send({ message: 'Recording creation not yet implemented' });
  });

  app.get('/recordings/:id', async (_request, reply) => {
    return reply.code(404).send({ message: 'Recording not found' });
  });
}
