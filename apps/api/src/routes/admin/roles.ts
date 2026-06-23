import { eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { db } from '$db/index'
import { roles } from '$db/schema'
import { writeAudit } from '$lib/audit'
import { id } from '$lib/ulid'
import { authMiddleware } from '$middleware/auth'

export default new Elysia()
  .use(authMiddleware)
  .get('/admin/roles', async () => db.select().from(roles), { requireAdmin: true })
  .post(
    '/admin/roles',
    async ({ body, user }) => {
      const roleId = id()
      await db
        .insert(roles)
        .values({ id: roleId, userId: body.userId, locale: body.locale, role: body.role, grantedBy: user.id })
        .onConflictDoNothing()
      await writeAudit({
        actorUserId: user.id,
        action: 'role.grant',
        targetType: 'user',
        targetId: body.userId,
        meta: { locale: body.locale, role: body.role },
      })
      return { id: roleId }
    },
    {
      body: t.Object({
        userId: t.String(),
        locale: t.String(),
        role: t.Union([t.Literal('translator'), t.Literal('reviewer')]),
      }),
      requireAdmin: true,
    },
  )
  .delete(
    '/admin/roles/:id',
    async ({ params, user }) => {
      await db.delete(roles).where(eq(roles.id, params.id))
      await writeAudit({
        actorUserId: user.id,
        action: 'role.revoke',
        targetType: 'role',
        targetId: params.id,
        meta: {},
      })
      return { ok: true }
    },
    { requireAdmin: true },
  )
