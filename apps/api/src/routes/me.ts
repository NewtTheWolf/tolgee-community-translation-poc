import { Elysia } from 'elysia'
import { eq } from 'drizzle-orm'
import { authMiddleware, type CurrentUser } from '$middleware/auth'
import { db } from '$db/index'
import { roles } from '$db/schema'

export default new Elysia().use(authMiddleware).get('/me', async (ctx) => {
  const user = (ctx as typeof ctx & { user: CurrentUser | null }).user
  if (!user) return { user: null }
  const userRoles = await db.select().from(roles).where(eq(roles.userId, user.id))
  return { user, roles: userRoles.map((r) => ({ locale: r.locale, role: r.role })) }
})
