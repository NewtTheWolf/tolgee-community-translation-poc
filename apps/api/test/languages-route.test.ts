import { describe, expect, it, mock } from 'bun:test'

mock.module('../src/lib/tolgee', () => ({
  tolgee: { listLanguages: async () => [{ id: 1, tag: 'en', name: 'English', originalName: 'English' }] },
}))

const { default: languages } = await import('../src/routes/languages')

describe('GET /languages', () => {
  it('returns languages from tolgee', async () => {
    const res = await languages.handle(new Request('http://localhost/languages'))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([{ id: 1, tag: 'en', name: 'English', originalName: 'English' }])
  })
})
