import { type FastifyInstance } from 'fastify';
import { hasAnyUsers, createInitialAdmin, findUserByEmail } from '../services/userService.js';

type BootstrapBody = {
  email?: string;
  password?: string;
  displayName?: string;
};

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/bootstrap', async (request, reply) => {
    const body = request.body as BootstrapBody | undefined;

    if (!body?.email || !body?.password) {
      return reply.status(400).send({ message: 'Email and password are required' });
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password.trim();
    const displayName = body.displayName?.trim() ?? null;

    if (!email.includes('@')) {
      return reply.status(400).send({ message: 'Invalid email address' });
    }

    if (password.length < 8) {
      return reply.status(400).send({ message: 'Password must be at least 8 characters long' });
    }

    const alreadyInitialized = await hasAnyUsers(app.db);
    if (alreadyInitialized) {
      return reply.status(409).send({ message: 'An admin user already exists' });
    }

    const existingUser = await findUserByEmail(app.db, email);
    if (existingUser) {
      return reply.status(409).send({ message: 'User with this email already exists' });
    }

    try {
      const user = await createInitialAdmin(app.db, {
        email,
        password,
        displayName: displayName ?? undefined
      });

      return reply.status(201).send({
        user,
        message: 'Admin user created. Please sign in via /auth/login (coming soon).'
      });
    } catch (error) {
      app.log.error(error, 'Failed to bootstrap admin user');
      return reply.status(500).send({ message: 'Unable to bootstrap admin user' });
    }
  });

  app.post('/auth/login', async (_request, reply) => {
    app.log.debug('Login endpoint hit');
    return reply.code(501).send({ message: 'Login not yet implemented' });
  });

  app.post('/auth/logout', async (_request, reply) => {
    return reply.code(204).send();
  });
}
