import { eq, sql } from 'drizzle-orm';
import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { settings } from '../db/schema.js';

export type AppSettings = {
  registrationEnabled: boolean;
};

export async function getAppSettings(db: BetterSQLite3Database): Promise<AppSettings> {
  const [row] = await db
    .select({
      registrationEnabled: settings.registrationEnabled
    })
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);

  return {
    registrationEnabled: row?.registrationEnabled ?? false
  };
}

export async function setRegistrationEnabled(
  db: BetterSQLite3Database,
  enabled: boolean
): Promise<AppSettings> {
  await db
    .update(settings)
    .set({
      registrationEnabled: enabled,
      updatedAt: sql`(unixepoch())`
    })
    .where(eq(settings.id, 1));

  return getAppSettings(db);
}
