import { eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { db } from '$db/index'
import { settings } from '$db/schema'
import { authMiddleware } from '$middleware/auth'

export default new Elysia()
  .use(authMiddleware)
  .get(
    '/admin/settings',
    async () => (await db.select().from(settings).where(eq(settings.id, 1)))[0] ?? { id: 1, autoPromoteThreshold: 5 },
    { requireAdmin: true },
  )
  .put(
    '/admin/settings',
    async ({ body }) => {
      await db
        .insert(settings)
        .values({ id: 1, autoPromoteThreshold: body.autoPromoteThreshold })
        .onConflictDoUpdate({ target: settings.id, set: { autoPromoteThreshold: body.autoPromoteThreshold } })
      return { ok: true }
    },
    { body: t.Object({ autoPromoteThreshold: t.Number({ minimum: 1 }) }), requireAdmin: true },
  )
