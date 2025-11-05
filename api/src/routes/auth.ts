import argon2 from 'argon2';
import { type FastifyInstance, type FastifyReply } from 'fastify';
import {
  hasAnyUsers,
  createInitialAdmin,
  findUserByEmail,
  findUserWithPassword,
  toPublicUser
} from '../services/userService.js';

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
    const body = request.body as BootstrapBody | undefined;

    if (!body?.email || !body?.password) {
      return reply.status(400).send({ message: 'Email and password are required' });
    }

    const email = body.email.trim().toLowerCase();
    const password = body.password.trim();

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
