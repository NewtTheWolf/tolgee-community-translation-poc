import { ilike, or } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { db } from '$db/index'
import { users } from '$db/schema'
import { authMiddleware } from '$middleware/auth'

// User search for the admin role-assignment UI: lets an admin find a user by
// login/name instead of pasting a raw user id.
export default new Elysia().use(authMiddleware).get(
  '/admin/users',
  async ({ query }) => {
    const q = (query.q ?? '').trim()
    if (q.length < 1) return []
    return db
      .select({
        id: users.id,
        login: users.login,
        name: users.name,
        avatarUrl: users.avatarUrl,
        isAdmin: users.isAdmin,
      })
      .from(users)
      .where(or(ilike(users.login, `%${q}%`), ilike(users.name, `%${q}%`)))
      .limit(20)
  },
  { query: t.Object({ q: t.Optional(t.String()) }), requireAdmin: true },
)
