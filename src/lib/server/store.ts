import "server-only";
import { normalizeSettings, type Settings } from "@/lib/settings";
import { decryptSecret, encryptSecret } from "./crypto";
import { db, hasDatabase, OWNER_ID } from "./db";

/* --------------------------------------------------------------- settings */

export async function loadSettings(userId = OWNER_ID): Promise<Settings | null> {
  if (!hasDatabase()) return null;
  const rows = await db()<{ settings: unknown }[]>`
    select settings from user_settings where user_id = ${userId}
  `;
  return rows[0] ? normalizeSettings(rows[0].settings) : null;
}

export async function saveSettings(settings: Settings, userId = OWNER_ID): Promise<void> {
  const sql = db();
  await sql`insert into app_users (id) values (${userId}) on conflict (id) do nothing`;
  await sql`
    insert into user_settings (user_id, settings, updated_at)
    values (${userId}, ${sql.json(JSON.parse(JSON.stringify(settings)))}, now())
    on conflict (user_id) do update set settings = excluded.settings, updated_at = now()
  `;
}

/* ------------------------------------------------------- oauth connections */

export type OAuthProvider = "google" | "pinterest";

export interface StoredConnection {
  refreshToken: string;
  accessToken?: string;
  accessTokenExpiresAt?: Date;
  accountLabel?: string;
  scope?: string;
}

export async function getConnection(provider: OAuthProvider, userId = OWNER_ID): Promise<StoredConnection | null> {
  if (!hasDatabase()) return null;
  const rows = await db()<
    {
      refresh_token_enc: string;
      access_token_enc: string | null;
      access_token_expires_at: Date | null;
      account_label: string | null;
      scope: string | null;
    }[]
  >`
    select refresh_token_enc, access_token_enc, access_token_expires_at, account_label, scope
    from oauth_connections where user_id = ${userId} and provider = ${provider}
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    refreshToken: decryptSecret(row.refresh_token_enc),
    accessToken: row.access_token_enc ? decryptSecret(row.access_token_enc) : undefined,
    accessTokenExpiresAt: row.access_token_expires_at ?? undefined,
    accountLabel: row.account_label ?? undefined,
    scope: row.scope ?? undefined,
  };
}

export async function connectionSummary(provider: OAuthProvider, userId = OWNER_ID) {
  if (!hasDatabase()) return { connected: false as const };
  const rows = await db()<{ account_label: string | null }[]>`
    select account_label from oauth_connections where user_id = ${userId} and provider = ${provider}
  `;
  return rows[0]
    ? { connected: true as const, accountLabel: rows[0].account_label ?? undefined }
    : { connected: false as const };
}

export async function saveConnection(provider: OAuthProvider, conn: StoredConnection, userId = OWNER_ID): Promise<void> {
  const sql = db();
  await sql`insert into app_users (id) values (${userId}) on conflict (id) do nothing`;
  await sql`
    insert into oauth_connections
      (user_id, provider, refresh_token_enc, access_token_enc, access_token_expires_at, account_label, scope, updated_at)
    values (
      ${userId}, ${provider}, ${encryptSecret(conn.refreshToken)},
      ${conn.accessToken ? encryptSecret(conn.accessToken) : null},
      ${conn.accessTokenExpiresAt ?? null}, ${conn.accountLabel ?? null}, ${conn.scope ?? null}, now()
    )
    on conflict (user_id, provider) do update set
      refresh_token_enc = excluded.refresh_token_enc,
      access_token_enc = excluded.access_token_enc,
      access_token_expires_at = excluded.access_token_expires_at,
      account_label = coalesce(excluded.account_label, oauth_connections.account_label),
      scope = excluded.scope,
      updated_at = now()
  `;
}

export async function updateAccessToken(
  provider: OAuthProvider,
  accessToken: string,
  expiresAt: Date,
  refreshToken?: string,
  userId = OWNER_ID,
): Promise<void> {
  const sql = db();
  if (refreshToken) {
    await sql`
      update oauth_connections set access_token_enc = ${encryptSecret(accessToken)},
        access_token_expires_at = ${expiresAt}, refresh_token_enc = ${encryptSecret(refreshToken)}, updated_at = now()
      where user_id = ${userId} and provider = ${provider}
    `;
  } else {
    await sql`
      update oauth_connections set access_token_enc = ${encryptSecret(accessToken)},
        access_token_expires_at = ${expiresAt}, updated_at = now()
      where user_id = ${userId} and provider = ${provider}
    `;
  }
}

export async function updateAccountLabel(provider: OAuthProvider, label: string, userId = OWNER_ID) {
  await db()`
    update oauth_connections set account_label = ${label} where user_id = ${userId} and provider = ${provider}
  `;
}

export async function deleteConnection(provider: OAuthProvider, userId = OWNER_ID): Promise<void> {
  if (!hasDatabase()) return;
  await db()`delete from oauth_connections where user_id = ${userId} and provider = ${provider}`;
  await db()`delete from provider_cache where user_id = ${userId} and key like ${provider + ":%"}`;
}

/* ---------------------------------------------------------- provider cache */

export async function readCache<T>(key: string, maxAgeMs: number, userId = OWNER_ID): Promise<T | null> {
  if (!hasDatabase()) return null;
  const rows = await db()<{ payload: T; fetched_at: Date }[]>`
    select payload, fetched_at from provider_cache where user_id = ${userId} and key = ${key}
  `;
  const row = rows[0];
  if (!row || Date.now() - row.fetched_at.getTime() > maxAgeMs) return null;
  return row.payload;
}

export async function writeCache(key: string, payload: unknown, userId = OWNER_ID): Promise<void> {
  if (!hasDatabase()) return;
  const sql = db();
  await sql`insert into app_users (id) values (${userId}) on conflict (id) do nothing`;
  await sql`
    insert into provider_cache (user_id, key, payload, fetched_at)
    values (${userId}, ${key}, ${sql.json(JSON.parse(JSON.stringify(payload)))}, now())
    on conflict (user_id, key) do update set payload = excluded.payload, fetched_at = now()
  `;
}
