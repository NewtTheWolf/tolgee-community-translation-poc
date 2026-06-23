# 🌍 Community Translations

A community translation platform for the [Tabularis](https://tabularis.dev) project — browse translations, submit suggestions without an account, and let verified translators review and apply them, all backed by [Tolgee](https://tolgee.io).

**🔗 Live demo: [translations.tabularis.dev](https://translations.tabularis.dev)**

> [!WARNING]
> **This is a proof of concept.** It was built fast to explore the idea and is **not production-hardened**. Expect rough edges, missing tests around the periphery, best‑effort rate limiting, and security/operational shortcuts. Don't run it as-is for anything you care about without a thorough review.

<p>
  <a href="https://translations.tabularis.dev"><img alt="Live demo" src="https://img.shields.io/badge/demo-translations.tabularis.dev-1bd0c4"></a>
  <img alt="Status" src="https://img.shields.io/badge/status-proof%20of%20concept-orange">
  <img alt="Bun" src="https://img.shields.io/badge/Bun-1.3-black?logo=bun">
  <img alt="ElysiaJS" src="https://img.shields.io/badge/API-ElysiaJS-blueviolet">
  <img alt="SvelteKit" src="https://img.shields.io/badge/Web-SvelteKit%205-ff3e00?logo=svelte">
  <img alt="Tolgee" src="https://img.shields.io/badge/i18n-Tolgee-1bd0c4">
  <img alt="PostgreSQL" src="https://img.shields.io/badge/DB-PostgreSQL-336791?logo=postgresql&logoColor=white">
</p>

## ✨ Core features

- **Accountless suggestions** — anyone can propose a translation for any key/locale; no sign-up required (rate-limited to deter abuse).
- **GitHub login for contributors** — verified translators and reviewers authenticate via GitHub OAuth.
- **Per-language permission system** — roles are granted **per locale** (`translator` < `reviewer`), plus a global `admin`. Reviewers approve/decline suggestions for their locales; admins manage everything.
- **Self-service onboarding** — users apply for a role per language; reviewers/admins approve. Frequent contributors can be **auto-promoted** after N accepted suggestions (configurable).
- **Full Tolgee integration** — Tolgee is the source of truth. Suggestions, accept/decline, and applied translations all go through Tolgee's native per‑language/key suggestion API.
- **Tolgee-style UI** — clean translation explorer with **ICU message syntax highlighting** (placeholders, plural/select keywords, `#`), state badges, language cards with flags, **dark mode**.
- **Attribution & audit** — every suggestion is attributed (or marked anonymous); all state changes are written to an audit log.
- **Admin tooling** — user search for role assignment, role management, and an adjustable auto-promotion threshold.

## 🏗️ Architecture

**Tolgee owns the translations; this app is a thin community/auth/permissions/attribution layer in front of it.** No translation content is mirrored locally — accepted suggestions are written straight to Tolgee. Pending suggestion text is cached locally only to power the review queue without hammering the upstream API.

```
apps/
  api/        ElysiaJS + Bun  — auth, per-locale roles, applications, attribution, audit, Tolgee proxy
  frontend/   SvelteKit (Svelte 5, runes) — browse, suggest, review dashboard, admin panel
packages/
  tolgee-client/   Typed Tolgee REST client (read + per-language/key suggestion workflow)
  tsconfig/        Shared TS config
deploy/       Dockerfiles + k3s manifests (Caddy reverse proxy, no cluster ingress required)
```

| Layer | Tech |
|-------|------|
| Runtime / monorepo | Bun, Turbo, Biome + Prettier |
| Backend | ElysiaJS, Drizzle ORM (PostgreSQL), `arctic` (GitHub OAuth), `jose` (HS256 session JWT), TypeBox |
| Frontend | SvelteKit + Vite, Svelte 5 runes, adapter-node |
| Translations | Tolgee Cloud |

In dev, the frontend talks to the API through a same-origin Vite proxy (`/api` → `:3000`) so the session cookie just works. In production a small Caddy reverse proxy does the same on a single origin.

## 🔐 Permission model

Roles are per locale: `translator` < `reviewer`, plus a global `admin` seeded from `ADMIN_GITHUB_LOGINS` (bootstrap admin — you need one to grant the first roles). Anonymous visitors may browse and suggest, but never accept/apply. A reviewer for locale `X` can only act on locale `X`.

## 🚀 Quick start

Prerequisites: [Bun](https://bun.sh), Docker (local PostgreSQL), a [GitHub OAuth App](https://github.com/settings/developers), and a [Tolgee Project API Key](https://tolgee.io) with `translations` + `suggestions` scopes.

```bash
bun install

# PostgreSQL
cp docker-compose.example.yml docker-compose.yml && docker compose up -d db

# API config — fill in TOLGEE_*, GITHUB_*, a 32+ char JWT_SECRET, ADMIN_GITHUB_LOGINS
cp .env.example apps/api/.env

# Frontend talks to the API same-origin via the dev proxy
echo 'PUBLIC_API_URL=/api' > apps/frontend/.env

bun run migrate
bun run dev          # API :3000 + frontend :5173
```

OAuth App callback URL (dev): `http://localhost:3000/auth/github/callback`.

## 🧰 Scripts

| Command | Description |
|---|---|
| `bun run dev` | API + frontend in watch mode |
| `bun run build` | Build all workspaces |
| `bun run test` | Unit tests (`bun test --isolate`) |
| `bun run check` | Type-check all workspaces |
| `bun run lint` / `format` | Biome + Prettier |
| `bun run migrate` / `generate` | Apply / create Drizzle migrations |

## 📦 Deployment

A self-contained k3s setup (Dockerfiles + manifests + a Caddy reverse proxy on a LoadBalancer, no cluster ingress controller needed) lives in [`deploy/`](./deploy/README.md). TLS is handled by Cloudflare in front of the origin.

## 📄 License

MIT — see [`LICENSE`](./LICENSE). Provided as-is, without warranty (see the POC notice above).
