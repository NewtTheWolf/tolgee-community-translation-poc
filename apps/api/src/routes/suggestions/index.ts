import { and, eq } from 'drizzle-orm'
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
          authorLogin: users.login,
        })
        .from(suggestionAttribution)
        .leftJoin(users, eq(users.id, suggestionAttribution.authorUserId))
        .where(and(...filters))

      return {
        suggestions: rows.map((r) => ({
          id: r.tolgeeSuggestionId,
          keyId: r.keyId,
          locale: r.locale,
          translation: r.text,
          state: 'pending',
          attribution: {
            author: r.authorLogin ? { login: r.authorLogin } : undefined,
            anon: !r.authorLogin,
            status: r.status,
          },
        })),
        nextCursor: undefined,
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
