import { type FastifyInstance } from 'fastify';
import {
  createRecording,
  getRecordingForViewer,
  listRecordings,
  type CreateRecordingInput
} from '../services/recordingService.js';

type ListQuery = {
  ownerId?: string;
};

export async function registerRecordingRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/recordings',
    {
      preHandler: app.authenticate
    },
    async (request, reply) => {
      if (!request.authUser) {
        return reply.status(401).send({ message: 'Authentication required' });
      }

      const query = request.query as ListQuery | undefined;
      const recordings = await listRecordings(app.db, request.authUser, {
        ownerId: query?.ownerId
      });
      return { recordings };
    }
  );

  app.post(
    '/recordings',
    {
      preHandler: app.authenticate
    },
    async (request, reply) => {
      if (!request.authUser) {
        return reply.status(401).send({ message: 'Authentication required' });
      }

      const body = request.body as Partial<CreateRecordingInput> | undefined;
      if (!body?.title) {
        return reply.status(400).send({ message: 'Title is required' });
      }

      try {
        const recording = await createRecording(app.db, request.authUser, {
          title: body.title,
          description: body.description ?? null,
          durationMs: body.durationMs ?? undefined,
          recordedAt: body.recordedAt ?? null
        });

        return reply.status(201).send({ recording });
      } catch (error) {
        request.log.error(error, 'Failed to create recording');
        return reply.status(500).send({ message: 'Unable to create recording' });
      }
    }
  );

  app.get(
    '/recordings/:id',
    {
      preHandler: app.authenticate
    },
    async (request, reply) => {
      if (!request.authUser) {
        return reply.status(401).send({ message: 'Authentication required' });
      }

      const { id } = request.params as { id: string };
      if (!id) {
        return reply.status(400).send({ message: 'Recording id is required' });
      }

      const recording = await getRecordingForViewer(app.db, request.authUser, id);
      if (!recording) {
        return reply.status(404).send({ message: 'Recording not found' });
      }

      return { recording };
    }
  );
}
