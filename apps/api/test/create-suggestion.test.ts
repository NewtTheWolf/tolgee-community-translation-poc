import { describe, expect, it, mock } from 'bun:test'

const created: unknown[] = []
mock.module('../src/lib/tolgee', () => ({
  tolgee: {
    listLanguages: async () => [{ id: 2, tag: 'de', name: 'German', originalName: 'Deutsch' }],
    createSuggestion: async (p: object) => { created.push(p); return { id: 555 } },
  },
}))
mock.module('../src/db/index', () => ({
  db: { insert: () => ({ values: async () => {} }) },
}))
mock.module('../src/lib/audit', () => ({ writeAudit: async () => {} }))

const { default: suggestions } = await import('../src/routes/suggestions/index')

describe('POST /suggestions', () => {
  it('creates a tolgee suggestion for a valid anon submission', async () => {
    const res = await suggestions.handle(
      new Request('http://localhost/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: 9, locale: 'de', text: 'Hallo {name}' }),
      }),
    )
    expect(res.status).toBe(201)
    expect(created).toHaveLength(1)
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
