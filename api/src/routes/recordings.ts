import { type FastifyInstance } from 'fastify';
import type { MultipartFile } from '@fastify/multipart';
import {
  createRecordingWithFile,
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

      if (!request.isMultipart()) {
        return reply.status(400).send({ message: 'Multipart form data required' });
      }

      const fields: Record<string, string> = {};
      let audioPart: MultipartFile | null = null;

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (part.fieldname === 'audio' && !audioPart) {
            audioPart = part;
          } else {
            part.file.resume();
          }
        } else if (part.type === 'field') {
          fields[part.fieldname] = typeof part.value === 'string' ? part.value : String(part.value);
        }
      }

      const title = fields.title?.trim() ?? '';
      if (!title) {
        if (audioPart) {
          audioPart.file.resume();
        }
        return reply.status(400).send({ message: 'Title is required' });
      }

      if (!audioPart) {
        return reply.status(400).send({ message: 'Audio file is required' });
      }

      const durationParsed = fields.durationMs ? Number(fields.durationMs) : undefined;
      const durationMs =
        durationParsed !== undefined && Number.isFinite(durationParsed) ? durationParsed : undefined;

      const description =
        fields.description && fields.description.trim().length > 0 ? fields.description.trim() : null;
      const recordedAt = fields.recordedAt && fields.recordedAt.length > 0 ? fields.recordedAt : null;

      try {
        const recording = await createRecordingWithFile(
          app.db,
          request.authUser,
          app.config.storageDir,
          {
            title,
            description,
            durationMs,
            recordedAt
          },
          {
            filename: audioPart.filename,
            mimetype: audioPart.mimetype,
            stream: audioPart.file
          }
        );

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
