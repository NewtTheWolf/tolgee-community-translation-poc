import { describe, expect, it, mock } from 'bun:test'

const created: Array<{ keyId: number; languageId: number; text: string }> = []
const inserted: Array<Record<string, unknown>> = []
mock.module('../src/lib/tolgee', () => ({
  tolgee: {
    listLanguages: async () => [{ id: 2, tag: 'de', name: 'German', originalName: 'Deutsch' }],
    createSuggestion: async (p: { keyId: number; languageId: number; text: string }) => {
      created.push(p)
      return { id: 555 }
    },
  },
}))
mock.module('../src/db/index', () => ({
  db: {
    insert: () => ({
      values: async (v: Record<string, unknown>) => {
        inserted.push(v)
      },
    }),
  },
}))
mock.module('../src/lib/audit', () => ({ writeAudit: async () => {} }))

const { default: suggestions } = await import('../src/routes/suggestions/index')

describe('POST /suggestions', () => {
  it('creates a tolgee suggestion and stores text + languageId locally', async () => {
    created.length = 0
    inserted.length = 0
    const res = await suggestions.handle(
      new Request('http://localhost/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: 9, locale: 'de', text: 'Hallo {name}' }),
      }),
    )
    expect(res.status).toBe(201)
    expect(created).toEqual([{ keyId: 9, languageId: 2, text: 'Hallo {name}' }])
    expect(inserted[0]).toMatchObject({
      tolgeeSuggestionId: 555,
      keyId: 9,
      locale: 'de',
      text: 'Hallo {name}',
      languageId: 2,
    })
  })

  it('rejects invalid ICU with 422', async () => {
    const res = await suggestions.handle(
      new Request('http://localhost/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: 9, locale: 'de', text: 'Hallo {name' }),
      }),
    )
    expect(res.status).toBe(422)
  })
})
