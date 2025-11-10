import { type FastifyInstance } from 'fastify';
import {
  listUsers,
  createUser,
  updateUser,
  findUserByEmail,
  findUserById
} from '../services/userService.js';
import { getAppSettings, setRegistrationEnabled } from '../services/settingsService.js';
import { validateRequest } from '../utils/validation.js';
import {
  createUserBodySchema,
  updateSettingsBodySchema,
  updateUserBodySchema,
  userIdParamSchema
} from './schemas/admin.js';

export async function registerAdminRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    '/admin/users',
    {
      preHandler: app.requireAdmin
    },
    async (request) => {
      void request;
      const users = await listUsers(app.db);
      return { users };
    }
  );

  app.post(
    '/admin/users',
    {
      preHandler: app.requireAdmin
    },
    async (request, reply) => {
      const validation = validateRequest(reply, createUserBodySchema, request.body);
      if (!validation.success) return;
      const { email, password, displayName, role, isActive } = validation.data;

      const existing = await findUserByEmail(app.db, email);
      if (existing) {
        return reply.status(409).send({ message: 'User with this email already exists' });
      }

      const user = await createUser(app.db, {
        email,
        password,
        displayName,
        role,
        isActive
      });

      return reply.status(201).send({ user });
    }
  );

  app.patch(
    '/admin/users/:id',
    {
      preHandler: app.requireAdmin
    },
    async (request, reply) => {
      const paramsResult = validateRequest(reply, userIdParamSchema, request.params, 'params');
      if (!paramsResult.success) return;
      const { id } = paramsResult.data;

      const bodyResult = validateRequest(
        reply,
        updateUserBodySchema,
        request.body ?? {},
        'body'
      );
      if (!bodyResult.success) return;
      const { displayName, password, role, isActive } = bodyResult.data;

      const targetUser = await findUserById(app.db, id);
      if (!targetUser) {
        return reply.status(404).send({ message: 'User not found' });
      }

      const updated = await updateUser(app.db, id, {
        displayName,
        password,
        role,
        isActive
      });

      if (!updated) {
        return reply.status(404).send({ message: 'User not found' });
      }

      if (request.authUser && request.authUser.id === id && updated.role !== request.authUser.role) {
        request.authUser = {
          id: updated.id,
          email: updated.email,
          displayName: updated.displayName,
          role: updated.role
        };
      }

      return reply.status(200).send({ user: updated });
    }
  );

  app.get(
    '/admin/settings',
    {
      preHandler: app.requireAdmin
    },
    async () => {
      const settings = await getAppSettings(app.db);
      return { settings };
    }
  );

  app.patch(
    '/admin/settings',
    {
      preHandler: app.requireAdmin
    },
    async (request, reply) => {
      const validation = validateRequest(reply, updateSettingsBodySchema, request.body);
      if (!validation.success) return;

      const settings = await setRegistrationEnabled(app.db, validation.data.registrationEnabled);
      return reply.status(200).send({ settings });
    }
  );
}
