import { Elysia, t } from 'elysia'
import { and, eq, inArray } from 'drizzle-orm'
import { authMiddleware } from '$middleware/auth'
import { db } from '$db/index'
import { applications, roles } from '$db/schema'
import { id } from '$lib/ulid'
import { writeAudit } from '$lib/audit'

export default new Elysia()
  .use(authMiddleware)
  .post(
    '/applications',
    async ({ body, user }) => {
      const appId = id()
      await db.insert(applications).values({ id: appId, userId: user.id, locale: body.locale, requestedRole: body.requestedRole, message: body.message })
      await writeAudit({ actorUserId: user.id, action: 'application.create', targetType: 'application', targetId: appId, meta: { locale: body.locale, role: body.requestedRole } })
      return { id: appId }
    },
    { body: t.Object({ locale: t.String(), requestedRole: t.Union([t.Literal('translator'), t.Literal('reviewer')]), message: t.Optional(t.String()) }), requireUser: true },
  )
  .get('/applications', async ({ user }) => {
    if (user.isAdmin) return db.select().from(applications).where(eq(applications.status, 'pending'))
    const reviewerLocales = (await db.select().from(roles).where(eq(roles.userId, user.id))).filter((r) => r.role === 'reviewer').map((r) => r.locale)
    if (reviewerLocales.length === 0) return []
    return db.select().from(applications).where(and(eq(applications.status, 'pending'), inArray(applications.locale, reviewerLocales)))
  }, { requireUser: true })
