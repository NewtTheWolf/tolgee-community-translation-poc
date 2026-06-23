import { Elysia } from 'elysia'
import { eq } from 'drizzle-orm'
import { authMiddleware } from '$middleware/auth'
import { db } from '$db/index'
import { applications, roles } from '$db/schema'
import { effectiveRoleFor, roleSatisfies } from '$lib/roles'
import { id } from '$lib/ulid'
import { writeAudit } from '$lib/audit'

export default new Elysia().use(authMiddleware).post('/applications/:id/approve', async ({ params, user, status }) => {
  if (!user) return status(401, { error: 'authentication required' })
  const app = (await db.select().from(applications).where(eq(applications.id, params.id)).limit(1))[0]
  if (!app) return status(404, { error: 'not found' })
  const userRoles = await db.select().from(roles).where(eq(roles.userId, user.id))
  if (!roleSatisfies(effectiveRoleFor(user, userRoles, app.locale), 'reviewer')) return status(403, { error: 'reviewer required' })
  if (app.status !== 'pending') return { ok: true, alreadyResolved: true }
  await db.insert(roles).values({ id: id(), userId: app.userId, locale: app.locale, role: app.requestedRole, grantedBy: user.id }).onConflictDoNothing()
  await db.update(applications).set({ status: 'approved', reviewedBy: user.id, reviewedAt: new Date() }).where(eq(applications.id, app.id))
  await writeAudit({ actorUserId: user.id, action: 'application.approve', targetType: 'application', targetId: app.id, meta: { locale: app.locale, role: app.requestedRole } })
  return { ok: true }
})
