import argon2 from 'argon2';
import { type FastifyInstance, type FastifyReply } from 'fastify';
import {
  hasAnyUsers,
  createInitialAdmin,
  findUserByEmail,
  findUserWithPassword,
  toPublicUser
} from '../services/userService.js';
import { validateRequest } from '../utils/validation.js';
import { bootstrapBodySchema, loginBodySchema } from './schemas/auth.js';

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post('/auth/bootstrap', async (request, reply) => {
    const validation = validateRequest(reply, bootstrapBodySchema, request.body);
    if (!validation.success) return;
    const { email, password, displayName } = validation.data;

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
        displayName
      });
      await issueSessionCookie(app, reply, { id: user.id, role: user.role });
      request.authUser = user;

      return reply.status(201).send({
        user,
        message: 'Admin user created and signed in successfully.'
      });
    } catch (error) {
      app.log.error(error, 'Failed to bootstrap admin user');
      return reply.status(500).send({ message: 'Unable to bootstrap admin user' });
    }
  });

  app.post('/auth/login', async (request, reply) => {
    const validation = validateRequest(reply, loginBodySchema, request.body);
    if (!validation.success) return;
    const { email, password } = validation.data;

    const user = await findUserWithPassword(app.db, email);
    if (!user || !user.isActive) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) {
      return reply.status(401).send({ message: 'Invalid credentials' });
    }

    await issueSessionCookie(app, reply, { id: user.id, role: user.role });
    request.authUser = toPublicUser(user);

    return reply.status(200).send({
      user: toPublicUser(user),
      message: 'Logged in successfully'
    });
  });

  app.post('/auth/logout', async (_request, reply) => {
    reply.clearCookie(app.config.sessionCookieName, { path: '/' });
    return reply.code(204).send();
  });

  app.get(
    '/auth/me',
    {
      preHandler: app.authenticate
    },
    async (request, reply) => {
      if (!request.authUser) {
        return reply.status(401).send({ message: 'Authentication required' });
      }

      return reply.status(200).send({ user: request.authUser });
    }
  );
}

type SessionSubject = {
  id: string;
  role: 'admin' | 'user';
};

async function issueSessionCookie(
  app: FastifyInstance,
  reply: FastifyReply,
  subject: SessionSubject
): Promise<void> {
  const token = await reply.jwtSign(
    { sub: subject.id, role: subject.role },
    { expiresIn: app.config.sessionTTLSeconds }
  );

  reply.setCookie(app.config.sessionCookieName, token, {
    path: '/',
    httpOnly: true,
    secure: app.config.cookieSecure,
    sameSite: app.config.cookieSecure ? 'strict' : 'lax',
    maxAge: app.config.sessionTTLSeconds
  });
}
