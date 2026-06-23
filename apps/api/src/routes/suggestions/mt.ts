import { Elysia, t } from 'elysia'
import { tolgee } from '$lib/tolgee'
import { authMiddleware } from '$middleware/auth'

export default new Elysia().use(authMiddleware).get(
  '/suggestions/mt',
  async ({ query, status }) => {
    const langs = await tolgee.listLanguages()
    const targetLanguageId = langs.find((l) => l.tag === query.locale)?.id
    if (targetLanguageId === undefined) return status(400, { error: 'unknown locale' })
    try {
      return { suggestions: await tolgee.getMtSuggestions({ keyId: Number(query.keyId), targetLanguageId }) }
    } catch {
      return status(502, { error: 'tolgee unavailable' })
    }
  },
  { query: t.Object({ keyId: t.String(), locale: t.String() }), requireRole: { locale: 'query', min: 'translator' } },
)
