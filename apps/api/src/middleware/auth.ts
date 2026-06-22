import { Elysia } from 'elysia'
import { eq } from 'drizzle-orm'
import { verifySession } from '$lib/jwt'
import { db } from '$db/index'
import { users } from '$db/schema'

export type CurrentUser = { id: string; login: string; isAdmin: boolean }

export const authMiddleware = new Elysia({ name: 'auth' })
  .derive(async ({ cookie }) => {
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
  })
