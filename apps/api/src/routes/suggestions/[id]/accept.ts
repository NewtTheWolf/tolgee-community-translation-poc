import { Elysia } from 'elysia'
import { eq } from 'drizzle-orm'
import { authMiddleware, type CurrentUser } from '$middleware/auth'
import { tolgee } from '$lib/tolgee'
import { db } from '$db/index'
import { roles, suggestionAttribution } from '$db/schema'
import { effectiveRoleFor, roleSatisfies } from '$lib/roles'
import { writeAudit } from '$lib/audit'
import { maybeAutoPromote } from '$lib/promotion'

export default new Elysia().use(authMiddleware).post('/suggestions/:id/accept', async (ctx) => {
  const user = (ctx as typeof ctx & { user: CurrentUser | null }).user
  const { params, status } = ctx
  if (!user) return status(401, { error: 'authentication required' })
  const p = params as Record<string, string>
  const suggestionId = Number(p.id)
  const attr = (await db.select().from(suggestionAttribution).where(eq(suggestionAttribution.tolgeeSuggestionId, suggestionId)).limit(1))[0]
  if (!attr) return status(404, { error: 'suggestion not tracked' })

  const userRoles = await db.select().from(roles).where(eq(roles.userId, user.id))
  if (!roleSatisfies(effectiveRoleFor(user, userRoles, attr.locale), 'reviewer')) {
    return status(403, { error: `requires reviewer for ${attr.locale}` })
  }

  if (attr.status !== 'pending') return { ok: true, alreadyResolved: true }

  try {
    await tolgee.acceptSuggestion(suggestionId)
  } catch {
    return status(502, { error: 'tolgee unavailable' })
  }
  await db
    .update(suggestionAttribution)
    .set({ status: 'accepted', resolvedBy: user.id, resolvedAt: new Date() })
    .where(eq(suggestionAttribution.tolgeeSuggestionId, suggestionId))
  await writeAudit({ actorUserId: user.id, action: 'suggestion.accept', targetType: 'suggestion', targetId: String(suggestionId), meta: { locale: attr.locale } })

  let promoted = false
  if (attr.authorUserId) promoted = await maybeAutoPromote(attr.authorUserId, attr.locale)
  return { ok: true, promoted }
})
