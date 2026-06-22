import { describe, expect, it, mock } from 'bun:test'

mock.module('../src/lib/tolgee', () => ({
  tolgee: {
    listLanguages: async () => [{ id: 2, tag: 'de', name: 'German', originalName: 'Deutsch' }],
    listSuggestions: async () => ({
      suggestions: [{ id: 555, keyId: 9, languageId: 2, translation: 'Hallo', state: 'ACTIVE' }],
      nextCursor: undefined,
    }),
  },
}))
mock.module('../src/db/index', () => ({
  db: {
    select: () => ({
      from: () => ({
        leftJoin: () => ({
          where: async () => [],
        }),
      }),
    }),
  },
}))

const { default: suggestions } = await import('../src/routes/suggestions/index')

describe('GET /suggestions', () => {
  it('returns enriched suggestions for a valid locale', async () => {
    const res = await suggestions.handle(new Request('http://localhost/suggestions?locale=de'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { suggestions: unknown[] }
    expect(body.suggestions).toHaveLength(1)
  })

  it('returns 400 for unknown locale', async () => {
    const res = await suggestions.handle(new Request('http://localhost/suggestions?locale=xx'))
    expect(res.status).toBe(400)
  })

  it('enriches suggestions with null attribution when none found', async () => {
    const res = await suggestions.handle(new Request('http://localhost/suggestions?locale=de'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { suggestions: Array<{ attribution: unknown }> }
    expect(body.suggestions[0]?.attribution).toBeNull()
  })
})
