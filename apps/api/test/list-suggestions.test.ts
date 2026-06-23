import { describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'

// Mutable auth/role config — set per test before the request
let currentUser: { id: string; login: string; isAdmin: boolean } | null = null
let dbRoleRows: { locale: string; role: 'translator' | 'reviewer' }[] = []
// Pending attribution rows returned by the DB-driven queue query
let dbAttrRows: Array<Record<string, unknown>> = []

// Auth middleware stub — .as('global') required for derive to propagate in Elysia 1.4
mock.module('../src/middleware/auth', () => ({
  authMiddleware: new Elysia({ name: 'auth' }).derive(() => ({ user: currentUser })).as('global'),
}))

// The GET queue no longer hits Tolgee; keep a stub so the route import resolves.
mock.module('../src/lib/tolgee', () => ({
  tolgee: {
    listLanguages: async () => [{ id: 2, tag: 'de', name: 'German', originalName: 'Deutsch' }],
  },
}))
mock.module('../src/db/index', () => ({
  db: {
    select: () => ({
      from: () => ({
        // queue query: .from(...).leftJoin(...).where()
        leftJoin: () => ({
          where: async () => dbAttrRows,
        }),
        // roles query: .from(roles).where()
        where: async () => dbRoleRows,
      }),
    }),
  },
}))

const { default: suggestions } = await import('../src/routes/suggestions/index')

const get = (qs: string) => suggestions.handle(new Request(`http://localhost/suggestions${qs}`))

describe('GET /suggestions — authorization', () => {
  it('401 for anonymous (no session)', async () => {
    currentUser = null
    expect((await get('?locale=de')).status).toBe(401)
  })

  it('400 when a non-admin omits the locale', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    dbRoleRows = []
    expect((await get('')).status).toBe(400)
  })

  it('403 for a logged-in user without reviewer for the locale', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    dbRoleRows = [{ locale: 'de', role: 'translator' }]
    expect((await get('?locale=de')).status).toBe(403)
  })

  it('200 for a reviewer of the requested locale', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    dbRoleRows = [{ locale: 'de', role: 'reviewer' }]
    dbAttrRows = []
    expect((await get('?locale=de')).status).toBe(200)
  })

  it('200 for an admin even without a locale', async () => {
    currentUser = { id: 'admin', login: 'admin', isAdmin: true }
    dbRoleRows = []
    dbAttrRows = []
    expect((await get('')).status).toBe(200)
  })
})

describe('GET /suggestions — payload', () => {
  it('shapes pending DB rows into the queue response', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    dbRoleRows = [{ locale: 'de', role: 'reviewer' }]
    dbAttrRows = [
      { tolgeeSuggestionId: 555, keyId: 9, locale: 'de', text: 'Hallo', status: 'pending', authorLogin: 'octocat' },
    ]
    const res = await get('?locale=de')
    expect(res.status).toBe(200)
    const body = (await res.json()) as {
      suggestions: Array<{
        id: number
        keyId: number
        locale: string
        translation: string
        state: string
        attribution: { author?: { login: string }; anon: boolean; status: string }
      }>
      nextCursor: unknown
    }
    expect(body.suggestions).toEqual([
      {
        id: 555,
        keyId: 9,
        locale: 'de',
        translation: 'Hallo',
        state: 'pending',
        attribution: { author: { login: 'octocat' }, anon: false, status: 'pending' },
      },
    ])
    expect(body.nextCursor).toBeUndefined()
  })

  it('marks rows without an author login as anonymous', async () => {
    currentUser = { id: 'admin', login: 'admin', isAdmin: true }
    dbRoleRows = []
    dbAttrRows = [
      { tolgeeSuggestionId: 1, keyId: 2, locale: 'fr', text: 'Bonjour', status: 'pending', authorLogin: null },
    ]
    const res = await get('')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { suggestions: Array<{ attribution: { author?: unknown; anon: boolean } }> }
    expect(body.suggestions[0]?.attribution.author).toBeUndefined()
    expect(body.suggestions[0]?.attribution.anon).toBe(true)
  })
})
