# Community Translations

A community translation platform for the Tabularis project. Anyone can browse
translations and submit suggestions without an account; verified translators and
reviewers sign in with GitHub and manage suggestions under a per-language
permission system.

**Tolgee is the source of truth.** This service is a thin community/auth layer in
front of the [Tolgee](https://tolgee.io) REST API: it adds accountless
suggestions, GitHub authentication, per-language roles, contributor attribution,
and an application/approval workflow — but it never mirrors translation content
locally. Every translation read and write proxies straight to Tolgee, including
Tolgee's native suggestion workflow (create / accept / decline / set-active).

## Architecture

```
apps/
  api/        ElysiaJS + Bun backend (auth, roles, applications, attribution, Tolgee proxy)
  frontend/   SvelteKit (Svelte 5) UI
packages/
  tolgee-client/   Typed Tolgee REST client (read + suggestion/write methods)
  tsconfig/        Shared TS config
```

- **Backend:** ElysiaJS, Drizzle ORM (PostgreSQL), `arctic` (GitHub OAuth),
  `jose` (HS256 session JWT in an httpOnly cookie), TypeBox validation.
- **Frontend:** SvelteKit + Vite. In dev it talks to the API through a same-origin
  vite proxy (`/api` → `http://localhost:3000`) so the session cookie works
  without cross-origin headaches.
- **Tooling:** Bun workspaces + Turbo, Biome (lint/format) + Prettier (Svelte).

### Permission model

Roles are granted **per language** (locale): `translator` < `reviewer`, plus a
global `admin` (from `ADMIN_GITHUB_LOGINS`). A reviewer for a locale can accept
or decline suggestions and approve role applications for that locale; admins can
do everything and manage roles/settings. Anonymous visitors may browse and
suggest, but never accept/apply. Translators can also self-promote via repeated
accepted suggestions (auto-promotion threshold, configurable in admin settings)
or by applying for a role.

## Prerequisites

- [Bun](https://bun.sh) (see `packageManager` in `package.json` for the pinned version)
- Docker (for local PostgreSQL), or any reachable PostgreSQL 16/17 instance
- A **GitHub OAuth App** — https://github.com/settings/developers
  (Authorization callback URL: `http://localhost:3000/auth/github/callback`)
- A **Tolgee Project API Key** with the `translations` and `suggestions` scopes —
  Tolgee → project → Integrate / API keys

## Setup

```bash
# 1. Install dependencies
bun install

# 2. Start PostgreSQL
cp docker-compose.example.yml docker-compose.yml
docker compose up -d db

# 3. Configure the API
cp .env.example apps/api/.env
#   then edit apps/api/.env — set TOLGEE_API_KEY, TOLGEE_PROJECT_ID,
#   GITHUB_CLIENT_ID/SECRET, a 32+ char JWT_SECRET, and ADMIN_GITHUB_LOGINS.

# 4. Configure the frontend (same-origin via the dev proxy)
echo 'PUBLIC_API_URL=/api' > apps/frontend/.env

# 5. Apply database migrations (also seeds the settings row)
bun run migrate
```

> **`PUBLIC_API_URL`:** the frontend must use `/api` in dev so requests go through
> the vite proxy and the session cookie stays same-origin. The `PUBLIC_API_URL`
> in `.env.example` is the API-side value; the frontend overrides it to `/api`.

## Running

```bash
bun run dev        # turbo: API (:3000) + frontend (:5173) together
```

Open http://localhost:5173. Sign in with a GitHub account listed in
`ADMIN_GITHUB_LOGINS` to reach the admin panel, grant yourself a `reviewer` role
for a locale, then test the full flow: submit an anonymous suggestion, accept it
in **Review**, and confirm the translation turns up as reviewed in Tolgee.

## Scripts

Run from the repo root (Turbo fans out to every workspace):

| Command | Description |
|---|---|
| `bun run dev` | Run API + frontend in watch mode |
| `bun run build` | Build all workspaces |
| `bun run test` | Run all unit tests (`bun test --isolate`) |
| `bun run check` | Type-check all workspaces (`tsc` / `svelte-check`) |
| `bun run lint` | Biome + Prettier (Svelte) checks |
| `bun run format` | Auto-format with Biome + Prettier |
| `bun run migrate` | Apply Drizzle migrations + seed settings |
| `bun run generate` | Generate a new Drizzle migration from the schema |

> Backend tests run with `--isolate`: the Tolgee/db mocks use `mock.module`,
> which leaks across files without isolation.

## Database schema

Six tables — `users`, `roles`, `applications`, `suggestion_attribution`,
`audit_log`, `settings`. Translation content is **not** stored; only the metadata
needed for community features (who suggested what, who has which role per locale,
and an audit trail) lives here. `suggestion_attribution` links a Tolgee suggestion
id to its (possibly anonymous) author.
