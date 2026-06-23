import { eq } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db } from '$db/index'
import { roles, suggestionAttribution } from '$db/schema'
import { writeAudit } from '$lib/audit'
import { effectiveRoleFor, roleSatisfies } from '$lib/roles'
import { tolgee } from '$lib/tolgee'
import { authMiddleware, type CurrentUser } from '$middleware/auth'

export default new Elysia().use(authMiddleware).post('/suggestions/:id/decline', async (ctx) => {
  const user = (ctx as typeof ctx & { user: CurrentUser | null }).user
  const { params, status } = ctx
  if (!user) return status(401, { error: 'authentication required' })
  const p = params as Record<string, string>
  const suggestionId = Number(p.id)
  const attr = (
    await db
      .select()
      .from(suggestionAttribution)
      .where(eq(suggestionAttribution.tolgeeSuggestionId, suggestionId))
      .limit(1)
  )[0]
  if (!attr) return status(404, { error: 'suggestion not tracked' })

  const userRoles = await db.select().from(roles).where(eq(roles.userId, user.id))
  if (!roleSatisfies(effectiveRoleFor(user, userRoles, attr.locale), 'reviewer')) {
    return status(403, { error: `requires reviewer for ${attr.locale}` })
  }

  if (attr.status !== 'pending') return { ok: true, alreadyResolved: true }

  try {
    await tolgee.declineSuggestion(suggestionId)
  } catch {
    return status(502, { error: 'tolgee unavailable' })
  }
  await db
    .update(suggestionAttribution)
    .set({ status: 'declined', resolvedBy: user.id, resolvedAt: new Date() })
    .where(eq(suggestionAttribution.tolgeeSuggestionId, suggestionId))
  await writeAudit({
    actorUserId: user.id,
    action: 'suggestion.decline',
    targetType: 'suggestion',
    targetId: String(suggestionId),
    meta: { locale: attr.locale },
  })
  return { ok: true }
})
