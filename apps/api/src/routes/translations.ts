import { Elysia, t } from 'elysia'
import { tolgee } from '$lib/tolgee'
import { authMiddleware } from '$middleware/auth'

export default new Elysia()
  .use(authMiddleware)
  .get(
    '/translations',
    async ({ query, set }) => {
      try {
        return await tolgee.listTranslations({
          languages: query.language ? [query.language] : undefined,
          search: query.search,
          cursor: query.cursor,
          size: query.size ? Number(query.size) : undefined,
        })
      } catch {
        set.status = 502
        return { error: 'tolgee unavailable' }
      }
    },
    {
      query: t.Object({
        language: t.Optional(t.String()),
        search: t.Optional(t.String()),
        cursor: t.Optional(t.String()),
        size: t.Optional(t.String()),
      }),
    },
  )
  .put(
    '/translations/:keyId/:locale',
    async ({ params, body, status }) => {
      try {
        const r = await tolgee.setTranslation({ key: body.key, language: params.locale, text: body.text })
        return r
      } catch {
        return status(502, { error: 'tolgee unavailable' })
      }
    },
    {
      params: t.Object({ keyId: t.String(), locale: t.String() }),
      body: t.Object({ key: t.String(), text: t.String() }),
      requireRole: { locale: 'param', min: 'translator' },
    },
  )
