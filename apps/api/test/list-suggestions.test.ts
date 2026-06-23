import { describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'

// Mutable auth/role config — set per test before the request
let currentUser: { id: string; login: string; isAdmin: boolean } | null = null
let dbRoleRows: { locale: string; role: 'translator' | 'reviewer' }[] = []

// Auth middleware stub — .as('global') required for derive to propagate in Elysia 1.4
mock.module('../src/middleware/auth', () => ({
  authMiddleware: new Elysia({ name: 'auth' }).derive(() => ({ user: currentUser })).as('global'),
}))

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
        // attribution query: .from(...).leftJoin(...).where()
        leftJoin: () => ({
          where: async () => [],
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
    expect((await get('?locale=de')).status).toBe(200)
  })

  it('200 for an admin even without a locale', async () => {
    currentUser = { id: 'admin', login: 'admin', isAdmin: true }
    dbRoleRows = []
    expect((await get('')).status).toBe(200)
  })
})

describe('GET /suggestions — payload', () => {
  it('returns enriched suggestions for a valid locale', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    dbRoleRows = [{ locale: 'de', role: 'reviewer' }]
    const res = await get('?locale=de')
    expect(res.status).toBe(200)
    const body = (await res.json()) as { suggestions: Array<{ attribution: unknown }> }
    expect(body.suggestions).toHaveLength(1)
    // No matching attribution row → null attribution
    expect(body.suggestions[0]?.attribution).toBeNull()
  })

  it('returns 400 for unknown locale', async () => {
    currentUser = { id: 'admin', login: 'admin', isAdmin: true }
    expect((await get('?locale=xx')).status).toBe(400)
  })
})
