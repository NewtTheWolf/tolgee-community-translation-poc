import { Type } from '@sinclair/typebox'
import type { StaticDecode } from '@sinclair/typebox'
import { Value } from '@sinclair/typebox/value'

const EnvSchema = Type.Object({
  DATABASE_URL: Type.String({ minLength: 1 }),
  JWT_SECRET: Type.String({ minLength: 32, pattern: '^(?!change-me).+$' }),
  BASE_URL: Type.String({ pattern: '^https?://.+' }),
  WEB_BASE_URL: Type.Optional(Type.String({ pattern: '^https?://.+' })),
  ALLOWED_ORIGINS: Type.Optional(Type.String()),
  PORT: Type.Optional(Type.String()),
  NODE_ENV: Type.Optional(Type.Union([Type.Literal('development'), Type.Literal('production'), Type.Literal('test')])),
  LOG_LEVEL: Type.Optional(Type.String()),
  TOLGEE_API_URL: Type.String({ pattern: '^https?://.+' }),
  TOLGEE_PROJECT_ID: Type.Transform(Type.String()).Decode(Number).Encode(String),
  TOLGEE_API_KEY: Type.String({ minLength: 1 }),
  GITHUB_CLIENT_ID: Type.Optional(Type.String()),
  GITHUB_CLIENT_SECRET: Type.Optional(Type.String()),
  ADMIN_GITHUB_LOGINS: Type.Optional(Type.String()),
})

export type Env = StaticDecode<typeof EnvSchema>

export function parseEnv(source: Record<string, string | undefined>): Env {
  const decoded = Value.Decode(EnvSchema, Value.Default(EnvSchema, source))
  return decoded
}

export const env: Env = parseEnv(Bun.env)

export function allowedOrigins(): string[] {
  return (env.ALLOWED_ORIGINS ?? env.WEB_BASE_URL ?? 'http://localhost:5173').split(',').map((s) => s.trim())
}

export function adminLogins(): Set<string> {
  return new Set((env.ADMIN_GITHUB_LOGINS ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean))
}
