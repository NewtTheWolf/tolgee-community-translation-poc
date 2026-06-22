import { Elysia, t } from 'elysia'
import { tolgee } from '$lib/tolgee'
import { validateIcu } from '$lib/icu'
import { authMiddleware, type CurrentUser } from '$middleware/auth'
import { rateLimit, ensureAnonId } from '$middleware/rate-limit'
import { db } from '$db/index'
import { suggestionAttribution } from '$db/schema'
import { writeAudit } from '$lib/audit'
import { id } from '$lib/ulid'

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
