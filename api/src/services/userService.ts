import argon2 from 'argon2';
import { desc, eq, sql } from 'drizzle-orm';
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
export type AdminUserRecord = PublicUser & {
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

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

export async function findActiveUserById(
  db: BetterSQLite3Database,
  id: string
): Promise<PublicUser | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const user = result[0];
  if (!user || !user.isActive) return null;
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null,
    role: user.role
  };
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

export type CreateUserInput = CreateAdminInput & {
  role?: 'admin' | 'user';
  isActive?: boolean;
};

export type UpdateUserInput = {
  displayName?: string | null;
  password?: string;
  role?: 'admin' | 'user';
  isActive?: boolean;
};

export async function listUsers(db: BetterSQLite3Database): Promise<AdminUserRecord[]> {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .orderBy(desc(users.createdAt));

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    displayName: row.displayName ?? null,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  }));
}

export async function createUser(
  db: BetterSQLite3Database,
  input: CreateUserInput
): Promise<AdminUserRecord> {
  const passwordHash = await argon2.hash(input.password);
  const fallbackName = input.email.split('@')[0] ?? '';
  const displayName = input.displayName ?? (fallbackName.length > 0 ? fallbackName : null);

  const [user] = await db
    .insert(users)
    .values({
      email: input.email,
      displayName,
      role: input.role ?? 'user',
      passwordHash,
      isActive: input.isActive ?? true
    })
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    });

  if (!user) {
    throw new Error('Failed to create user');
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function updateUser(
  db: BetterSQLite3Database,
  id: string,
  input: UpdateUserInput
): Promise<AdminUserRecord | null> {
  const values: Record<string, unknown> = {};

  if (input.displayName !== undefined) {
    values.displayName = input.displayName;
  }

  if (input.role !== undefined) {
    values.role = input.role;
  }

  if (input.isActive !== undefined) {
    values.isActive = input.isActive;
  }

  if (input.password) {
    values.passwordHash = await argon2.hash(input.password);
  }

  if (Object.keys(values).length === 0) {
    return findUserById(db, id);
  }

  values.updatedAt = sql`(unixepoch())`;

  const [user] = await db
    .update(users)
    .set(values)
    .where(eq(users.id, id))
    .returning({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function findUserById(
  db: BetterSQLite3Database,
  id: string
): Promise<AdminUserRecord | null> {
  const result = await db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt
    })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  const user = result[0];
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName ?? null,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

export async function ensureInitialAdminFromConfig(
  db: BetterSQLite3Database,
  admin: CreateAdminInput
): Promise<{ created: boolean; reason?: string }> {
  const existingUser = await findUserByEmail(db, admin.email);
  if (existingUser) {
    return { created: false, reason: 'user-exists' };
  }

  const anyUsers = await hasAnyUsers(db);
  if (anyUsers) {
    return { created: false, reason: 'users-already-present' };
  }

  await createInitialAdmin(db, admin);
  return { created: true };
}
