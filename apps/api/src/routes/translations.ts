import { Elysia, t } from 'elysia'
import { tolgee } from '$lib/tolgee'

export default new Elysia().get(
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
