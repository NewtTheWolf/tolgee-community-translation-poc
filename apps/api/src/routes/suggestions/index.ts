import { and, eq, inArray, sql } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { db } from '$db/index'
import { suggestionAttribution, suggestionVotes, users } from '$db/schema'
import { writeAudit } from '$lib/audit'
import { validateIcu } from '$lib/icu'
import { tolgee } from '$lib/tolgee'
import { id } from '$lib/ulid'
import { authMiddleware, type CurrentUser } from '$middleware/auth'
import { ensureAnonId, rateLimit } from '$middleware/rate-limit'

async function languageIdForLocale(locale: string): Promise<number | null> {
  const langs = await tolgee.listLanguages()
  return langs.find((l) => l.tag === locale)?.id ?? null
}

export default new Elysia()
  .use(authMiddleware)
  .use(rateLimit({ windowMs: 60_000, max: 10 }))
  .post(
    '/suggestions',
    async (ctx) => {
      const { body, cookie, set, status } = ctx
      const user = (ctx as typeof ctx & { user: CurrentUser | null }).user
      const icu = validateIcu(body.text)
      if (!icu.ok) return status(422, { error: `invalid ICU: ${icu.error}` })

      const languageId = await languageIdForLocale(body.locale)
      if (languageId === null) return status(400, { error: 'unknown locale' })

      let suggestion: { id: number }
      try {
        suggestion = await tolgee.createSuggestion({ keyId: body.keyId, languageId, text: body.text })
      } catch {
        return status(502, { error: 'tolgee unavailable' })
      }

      const anonId = user ? null : ensureAnonId(cookie)
      const attributionId = id()
      await db.insert(suggestionAttribution).values({
        id: attributionId,
        tolgeeSuggestionId: suggestion.id,
        keyId: body.keyId,
        locale: body.locale,
        text: body.text,
        languageId,
        authorUserId: user?.id ?? null,
        anonId,
        status: 'pending',
      })
      await writeAudit({
        actorUserId: user?.id ?? null,
        action: 'suggestion.create',
        targetType: 'suggestion',
        targetId: String(suggestion.id),
        meta: { keyId: body.keyId, locale: body.locale, anon: !user },
      })

      set.status = 201
      return { suggestionId: suggestion.id, attributionId }
    },
    { body: t.Object({ keyId: t.Number(), locale: t.String(), text: t.String({ minLength: 1, maxLength: 5000 }) }) },
  )
  .get(
    '/suggestions',
    async (ctx) => {
      const { query } = ctx
      // Public read: anyone can browse pending suggestions and their vote scores.
      // Voting (POST /suggestions/:id/vote) and accept/decline stay authenticated.
      const user = (ctx as typeof ctx & { user: CurrentUser | null }).user

      const filters = [eq(suggestionAttribution.status, 'pending')]
      if (query.locale) filters.push(eq(suggestionAttribution.locale, query.locale))
      if (query.keyId) filters.push(eq(suggestionAttribution.keyId, Number(query.keyId)))

      const rows = await db
        .select({
          tolgeeSuggestionId: suggestionAttribution.tolgeeSuggestionId,
          keyId: suggestionAttribution.keyId,
          locale: suggestionAttribution.locale,
          text: suggestionAttribution.text,
          status: suggestionAttribution.status,
          createdAt: suggestionAttribution.createdAt,
          authorLogin: users.login,
        })
        .from(suggestionAttribution)
        .leftJoin(users, eq(users.id, suggestionAttribution.authorUserId))
        .where(and(...filters))

      const ids = rows.map((r) => r.tolgeeSuggestionId)
      const tally = new Map<number, { score: number; up: number; down: number }>()
      const myVote = new Map<number, number>()
      if (ids.length > 0) {
        const agg = await db
          .select({
            sid: suggestionVotes.tolgeeSuggestionId,
            score: sql<number>`coalesce(sum(${suggestionVotes.value}), 0)`.mapWith(Number),
            up: sql<number>`count(*) filter (where ${suggestionVotes.value} > 0)`.mapWith(Number),
            down: sql<number>`count(*) filter (where ${suggestionVotes.value} < 0)`.mapWith(Number),
          })
          .from(suggestionVotes)
          .where(inArray(suggestionVotes.tolgeeSuggestionId, ids))
          .groupBy(suggestionVotes.tolgeeSuggestionId)
        for (const a of agg) tally.set(a.sid, { score: a.score, up: a.up, down: a.down })
        if (user) {
          const mine = await db
            .select({ sid: suggestionVotes.tolgeeSuggestionId, value: suggestionVotes.value })
            .from(suggestionVotes)
            .where(and(eq(suggestionVotes.userId, user.id), inArray(suggestionVotes.tolgeeSuggestionId, ids)))
          for (const m of mine) myVote.set(m.sid, m.value)
        }
      }

      const suggestions = rows
        .map((r) => {
          const v = tally.get(r.tolgeeSuggestionId) ?? { score: 0, up: 0, down: 0 }
          return {
            id: r.tolgeeSuggestionId,
            keyId: r.keyId,
            locale: r.locale,
            translation: r.text,
            state: 'pending',
            score: v.score,
            upvotes: v.up,
            downvotes: v.down,
            myVote: myVote.get(r.tolgeeSuggestionId) ?? 0,
            attribution: {
              author: r.authorLogin ? { login: r.authorLogin } : undefined,
              anon: !r.authorLogin,
              status: r.status,
            },
          }
        })
        .sort((a, b) => b.score - a.score || b.id - a.id)

      return { suggestions, nextCursor: undefined }
    },
    {
      query: t.Object({
        locale: t.Optional(t.String()),
        keyId: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
      }),
    },
  )
