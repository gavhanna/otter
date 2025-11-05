import argon2 from 'argon2';
import { eq } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import type { InferModel } from 'drizzle-orm';
import { users } from '../db/schema.js';

type UserRecord = InferModel<typeof users>;
type CreateAdminInput = {
  email: string;
  password: string;
  displayName?: string;
};

export type PublicUser = Pick<UserRecord, 'id' | 'email' | 'displayName' | 'role'>;
type UserWithSecret = Pick<UserRecord, 'id' | 'email' | 'displayName' | 'role' | 'passwordHash' | 'isActive'>;

export function toPublicUser(user: PublicUser | UserWithSecret): PublicUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null,
    role: user.role
  };
}

export async function hasAnyUsers(db: BetterSQLite3Database): Promise<boolean> {
  const existing = await db.select({ id: users.id }).from(users).limit(1);
  return existing.length > 0;
}

export async function findUserByEmail(
  db: BetterSQLite3Database,
  email: string
): Promise<PublicUser | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] ?? null;
}

export async function findUserWithPassword(
  db: BetterSQLite3Database,
  email: string
): Promise<UserWithSecret | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      passwordHash: users.passwordHash,
      isActive: users.isActive
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result[0] ?? null;
}

export async function createInitialAdmin(
  db: BetterSQLite3Database,
  input: CreateAdminInput
): Promise<PublicUser> {
  const passwordHash = await argon2.hash(input.password);
  const fallbackName = input.email.split('@')[0] ?? '';
  const displayName = input.displayName ?? (fallbackName.length > 0 ? fallbackName : null);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      displayName,
      role: 'admin',
      passwordHash,
      isActive: true
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role
    });

  if (!user) {
    throw new Error('Failed to create admin user');
  }

  return user;
}
