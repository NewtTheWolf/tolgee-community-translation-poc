import { describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'

// Mutable config — set per test before the request
let currentUser: { id: string; login: string; isAdmin: boolean } | null = null
let dbAttrRows: Array<Record<string, unknown>> = []
let dbVoteAgg: Array<{ sid: number; score: number; up: number; down: number }> = []
let dbMyVotes: Array<{ sid: number; value: number }> = []

mock.module('../src/middleware/auth', () => ({
  authMiddleware: new Elysia({ name: 'auth' }).derive(() => ({ user: currentUser })).as('global'),
}))
mock.module('../src/lib/tolgee', () => ({ tolgee: { listLanguages: async () => [{ id: 2, tag: 'de' }] } }))

mock.module('../src/db/index', () => ({
  db: {
    select: () => ({
      from: () => ({
        // attribution query: .from(...).leftJoin(users).where()
        leftJoin: () => ({ where: async () => dbAttrRows }),
        // vote queries: .from(votes).where(...).groupBy(...)  AND  .from(votes).where(...) (awaited)
        where: () => ({
          groupBy: async () => dbVoteAgg,
          // biome-ignore lint/suspicious/noThenProperty: intentional thenable to mock an awaited Drizzle query
          then: (resolve: (r: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(dbMyVotes).then(resolve, reject),
        }),
      }),
    }),
  },
}))

const { default: suggestions } = await import('../src/routes/suggestions/index')
const get = (qs: string) => suggestions.handle(new Request(`http://localhost/suggestions${qs}`))

describe('GET /suggestions — public read', () => {
  it('200 for anonymous (no auth required)', async () => {
    currentUser = null
    dbAttrRows = []
    dbVoteAgg = []
    dbMyVotes = []
    expect((await get('?locale=de')).status).toBe(200)
  })

  it('shapes rows and merges vote tallies', async () => {
    currentUser = null
    dbAttrRows = [
      { tolgeeSuggestionId: 555, keyId: 9, locale: 'de', text: 'Hallo', status: 'pending', authorLogin: 'octocat' },
    ]
    dbVoteAgg = [{ sid: 555, score: 3, up: 4, down: 1 }]
    dbMyVotes = []
    const body = (await (await get('?locale=de')).json()) as {
      suggestions: Array<{
        id: number
        translation: string
        score: number
        upvotes: number
        downvotes: number
        myVote: number
        attribution: { author?: { login: string }; anon: boolean }
      }>
    }
    expect(body.suggestions).toHaveLength(1)
    const s = body.suggestions[0]
    expect(s).toMatchObject({ id: 555, translation: 'Hallo', score: 3, upvotes: 4, downvotes: 1, myVote: 0 })
    expect(s?.attribution.author).toEqual({ login: 'octocat' })
  })

  it('sorts by score descending', async () => {
    currentUser = null
    dbAttrRows = [
      { tolgeeSuggestionId: 1, keyId: 9, locale: 'de', text: 'low', status: 'pending', authorLogin: null },
      { tolgeeSuggestionId: 2, keyId: 9, locale: 'de', text: 'high', status: 'pending', authorLogin: null },
    ]
    dbVoteAgg = [
      { sid: 1, score: 1, up: 1, down: 0 },
      { sid: 2, score: 9, up: 9, down: 0 },
    ]
    dbMyVotes = []
    const body = (await (await get('?locale=de')).json()) as { suggestions: Array<{ id: number; score: number }> }
    expect(body.suggestions.map((s) => s.id)).toEqual([2, 1])
  })

  it('includes the caller’s own vote when logged in', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    dbAttrRows = [
      { tolgeeSuggestionId: 555, keyId: 9, locale: 'de', text: 'Hallo', status: 'pending', authorLogin: null },
    ]
    dbVoteAgg = [{ sid: 555, score: 1, up: 1, down: 0 }]
    dbMyVotes = [{ sid: 555, value: 1 }]
    const body = (await (await get('?locale=de')).json()) as { suggestions: Array<{ myVote: number }> }
    expect(body.suggestions[0]?.myVote).toBe(1)
  })
})
