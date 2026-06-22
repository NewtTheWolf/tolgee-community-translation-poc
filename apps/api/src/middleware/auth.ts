import { Elysia } from 'elysia'
import { eq } from 'drizzle-orm'
import { verifySession } from '$lib/jwt'
import { db } from '$db/index'
import { users, roles } from '$db/schema'
import { effectiveRoleFor, roleSatisfies } from '$lib/roles'

export type CurrentUser = { id: string; login: string; isAdmin: boolean }

export const authMiddleware = new Elysia({ name: 'auth' })
  .derive({ as: 'global' }, async ({ cookie }) => {
    const token = cookie.session?.value
    if (!token || typeof token !== 'string') return { user: null as CurrentUser | null }
    const payload = await verifySession(token)
    if (!payload) return { user: null as CurrentUser | null }
    const row = (await db.select().from(users).where(eq(users.id, payload.sub)).limit(1))[0]
    if (!row) return { user: null as CurrentUser | null }
    return { user: { id: row.id, login: row.login, isAdmin: row.isAdmin } as CurrentUser }
  })
  .macro({
    requireUser: {
      resolve({ user, status }) {
        if (!user) return status(401, { error: 'authentication required' })
        return { user }
      },
    },
    requireAdmin: {
      resolve({ user, status }) {
        if (!user) return status(401, { error: 'authentication required' })
        if (!user.isAdmin) return status(403, { error: 'admin only' })
        return { user }
      },
    },
    requireRole: (cfg: { locale: 'param' | 'body'; min: 'translator' | 'reviewer' }) => ({
      async resolve({ user, params, body, status }) {
        if (!user) return status(401, { error: 'authentication required' })
        // params/body are opaque in macro context — narrow cast is required; user is confirmed non-null above
        const p = params as Record<string, string>
        const b = body as { locale?: string }
        const locale = cfg.locale === 'param' ? p.locale : b?.locale
        if (!locale) return status(400, { error: 'locale required' })
        const userRoles = await db.select().from(roles).where(eq(roles.userId, user.id))
        const eff = effectiveRoleFor(user, userRoles, locale)
        if (!roleSatisfies(eff, cfg.min)) return status(403, { error: `requires ${cfg.min} for ${locale}` })
        return { user, locale, effectiveRole: eff }
      },
    }),
  })
