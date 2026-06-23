import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db } from '$db/index'
import { applications, roles } from '$db/schema'
import { writeAudit } from '$lib/audit'
import { effectiveRoleFor, roleSatisfies } from '$lib/roles'
import { authMiddleware } from '$middleware/auth'

export default new Elysia().use(authMiddleware).post('/applications/:id/reject', async ({ params, user, status }) => {
  if (!user) return status(401, { error: 'authentication required' })
  const app = (await db.select().from(applications).where(eq(applications.id, params.id)).limit(1))[0]
  if (!app) return status(404, { error: 'not found' })
  const userRoles = await db.select().from(roles).where(eq(roles.userId, user.id))
  if (!roleSatisfies(effectiveRoleFor(user, userRoles, app.locale), 'reviewer'))
    return status(403, { error: 'reviewer required' })
  if (app.status !== 'pending') return { ok: true, alreadyResolved: true }
  await db
    .update(applications)
    .set({ status: 'rejected', reviewedBy: user.id, reviewedAt: new Date() })
    .where(eq(applications.id, app.id))
  await writeAudit({
    actorUserId: user.id,
    action: 'application.reject',
    targetType: 'application',
    targetId: app.id,
    meta: { locale: app.locale, role: app.requestedRole },
  })
  return { ok: true }
})
