import { and, eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { db } from '$db/index'
import { suggestionVotes } from '$db/schema'
import { id as ulid } from '$lib/ulid'
import { authMiddleware, type CurrentUser } from '$middleware/auth'

// Logged-in users up/down-vote a suggestion to bump it. value 0 clears the vote.
export default new Elysia().use(authMiddleware).post(
  '/suggestions/:id/vote',
  async (ctx) => {
    const user = (ctx as typeof ctx & { user: CurrentUser | null }).user
    const { params, body, status } = ctx
    if (!user) return status(401, { error: 'authentication required' })
    const suggestionId = Number((params as Record<string, string>).id)
    if (!Number.isFinite(suggestionId)) return status(400, { error: 'invalid suggestion id' })

    if (body.value === 0) {
      await db
        .delete(suggestionVotes)
        .where(and(eq(suggestionVotes.userId, user.id), eq(suggestionVotes.tolgeeSuggestionId, suggestionId)))
      return { ok: true, myVote: 0 }
    }

    await db
      .insert(suggestionVotes)
      .values({ id: ulid(), tolgeeSuggestionId: suggestionId, userId: user.id, value: body.value })
      .onConflictDoUpdate({
        target: [suggestionVotes.userId, suggestionVotes.tolgeeSuggestionId],
        set: { value: body.value },
      })
    return { ok: true, myVote: body.value }
  },
  { body: t.Object({ value: t.Union([t.Literal(1), t.Literal(-1), t.Literal(0)]) }) },
)
