import { eq, inArray } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { db } from '$db/index'
import { roles, suggestionAttribution, users } from '$db/schema'
import { writeAudit } from '$lib/audit'
import { validateIcu } from '$lib/icu'
import { effectiveRoleFor, roleSatisfies } from '$lib/roles'
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
      const { query, status } = ctx
      // The review queue exposes pending suggestions and contributor logins —
      // restrict it to reviewers (for the requested locale) and admins. Anonymous
      // and plain logged-in users must not read it.
      const user = (ctx as typeof ctx & { user: CurrentUser | null }).user
      if (!user) return status(401, { error: 'authentication required' })
      if (!user.isAdmin) {
        if (!query.locale) return status(400, { error: 'locale required' })
        const userRoles = await db.select().from(roles).where(eq(roles.userId, user.id))
        if (!roleSatisfies(effectiveRoleFor(user, userRoles, query.locale), 'reviewer')) {
          return status(403, { error: `requires reviewer for ${query.locale}` })
        }
      }

      let languageId: number | undefined
      if (query.locale) {
        const langs = await tolgee.listLanguages()
        languageId = langs.find((l) => l.tag === query.locale)?.id
        if (languageId === undefined) return status(400, { error: 'unknown locale' })
      }

      let page: Awaited<ReturnType<typeof tolgee.listSuggestions>>
      try {
        page = await tolgee.listSuggestions({
          languageId,
          keyId: query.keyId ? Number(query.keyId) : undefined,
          cursor: query.cursor,
        })
      } catch {
        return status(502, { error: 'tolgee unavailable' })
      }

      const ids = page.suggestions.map((s) => s.id)
      const attrs = ids.length
        ? await db
            .select({
              tolgeeSuggestionId: suggestionAttribution.tolgeeSuggestionId,
              status: suggestionAttribution.status,
              authorLogin: users.login,
              anonId: suggestionAttribution.anonId,
            })
            .from(suggestionAttribution)
            .leftJoin(users, eq(users.id, suggestionAttribution.authorUserId))
            .where(inArray(suggestionAttribution.tolgeeSuggestionId, ids))
        : []

      const byId = new Map(attrs.map((a) => [a.tolgeeSuggestionId, a]))
      return {
        suggestions: page.suggestions.map((s) => {
          const a = byId.get(s.id)
          return {
            ...s,
            attribution: a
              ? {
                  author: a.authorLogin ? { login: a.authorLogin } : undefined,
                  anon: !a.authorLogin,
                  status: a.status,
                }
              : null,
          }
        }),
        nextCursor: page.nextCursor,
      }
    },
    {
      query: t.Object({
        locale: t.Optional(t.String()),
        keyId: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
      }),
    },
  )
