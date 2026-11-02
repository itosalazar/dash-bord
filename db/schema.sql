-- dash-bord schema. Idempotent: safe to run repeatedly (`npm run db:migrate`).
-- Everything is keyed by user_id so the single personal account ("owner")
-- can grow into a multi-user model without reshaping existing rows.

create table if not exists app_users (
  id          text primary key,
  created_at  timestamptz not null default now()
);

create table if not exists user_settings (
  user_id     text primary key references app_users(id) on delete cascade,
  settings    jsonb not null,
  updated_at  timestamptz not null default now()
);

-- OAuth grants. Tokens are AES-256-GCM encrypted by the app before insert
-- (TOKEN_ENCRYPTION_KEY); the database never sees plaintext tokens.
create table if not exists oauth_connections (
  user_id                  text not null references app_users(id) on delete cascade,
  provider                 text not null check (provider in ('google', 'pinterest')),
  refresh_token_enc        text not null,
  access_token_enc         text,
  access_token_expires_at  timestamptz,
  account_label            text,
  scope                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  primary key (user_id, provider)
);

-- Server-side cache for provider payloads (e.g. resolved Pinterest board, pin lists).
create table if not exists provider_cache (
  user_id     text not null references app_users(id) on delete cascade,
  key         text not null,
  payload     jsonb not null,
  fetched_at  timestamptz not null default now(),
  primary key (user_id, key)
);

insert into app_users (id) values ('owner') on conflict (id) do nothing;
