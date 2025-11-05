import { type FastifyInstance } from 'fastify';
import {
  listUsers,
  createUser,
  updateUser,
  findUserByEmail,
  findUserById,
  type CreateUserInput,
  type UpdateUserInput
} from '../services/userService.js';
import { getAppSettings, setRegistrationEnabled } from '../services/settingsService.js';

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
      const body = request.body as Partial<CreateUserInput> | undefined;
      if (!body?.email || !body.password) {
        return reply.status(400).send({ message: 'Email and password are required' });
      }

      const email = body.email.trim().toLowerCase();
      const password = body.password.trim();
      const displayName = body.displayName?.trim();
      const role = body.role ?? 'user';
      const isActive = body.isActive ?? true;

      if (!email.includes('@')) {
        return reply.status(400).send({ message: 'Invalid email address' });
      }

      if (password.length < 8) {
        return reply.status(400).send({ message: 'Password must be at least 8 characters long' });
      }

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
      const { id } = request.params as { id: string };
      const body = request.body as UpdateUserInput | undefined;

      if (!id) {
        return reply.status(400).send({ message: 'User id is required' });
      }

      const targetUser = await findUserById(app.db, id);
      if (!targetUser) {
        return reply.status(404).send({ message: 'User not found' });
      }

      if (body?.password && body.password.length < 8) {
        return reply.status(400).send({ message: 'Password must be at least 8 characters long' });
      }

      const updated = await updateUser(app.db, id, {
        displayName: body?.displayName,
        password: body?.password,
        role: body?.role,
        isActive: body?.isActive
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
      const body = request.body as { registrationEnabled?: boolean } | undefined;

      if (body?.registrationEnabled === undefined) {
        return reply.status(400).send({ message: 'registrationEnabled is required' });
      }

      const settings = await setRegistrationEnabled(app.db, Boolean(body.registrationEnabled));
      return reply.status(200).send({ settings });
    }
  );
}
