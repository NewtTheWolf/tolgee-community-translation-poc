import { describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'

// Mutable user — changed per test before the request
let currentUser: { id: string; login: string; isAdmin: boolean } | null = {
  id: 'u-reviewer',
  login: 'reviewer',
  isAdmin: false,
}

// Auth middleware stub — .as('global') required for derive to propagate in Elysia 1.4
mock.module('../src/middleware/auth', () => ({
  authMiddleware: new Elysia({ name: 'auth' })
    .derive(() => ({ user: currentUser }))
    .as('global'),
}))

let acceptCalled = false
mock.module('../src/lib/tolgee', () => ({
  tolgee: {
    acceptSuggestion: async () => { acceptCalled = true },
    declineSuggestion: async () => {},
  },
}))

// Per-test db config — caller sets these before each request
let dbAttrRow: unknown | null = null
let dbRoleRows: unknown[] = []

mock.module('../src/db/index', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          // attribution query uses .limit(1)
          limit: async () => (dbAttrRow ? [dbAttrRow] : []),
          // roles query has no .limit() — accessed as a Promise directly
          then: (resolve: (rows: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(dbRoleRows).then(resolve, reject),
        }),
      }),
    }),
    update: () => ({
      set: () => ({
        where: async () => {},
      }),
    }),
    insert: () => ({
      values: async () => {},
    }),
  },
}))

mock.module('../src/lib/audit', () => ({ writeAudit: async () => {} }))
mock.module('../src/lib/promotion', () => ({
  maybeAutoPromote: async () => false,
}))

const { default: acceptRoute } = await import('../src/routes/suggestions/[id]/accept')

const ATTR = {
  id: 'attr-1',
  tolgeeSuggestionId: 42,
  keyId: 9,
  locale: 'de',
  authorUserId: 'u-author',
  anonId: null,
  status: 'pending',
  createdAt: new Date(),
  resolvedBy: null,
  resolvedAt: null,
}

describe('POST /suggestions/:id/accept', () => {
  it('returns 403 for non-reviewer', async () => {
    acceptCalled = false
    currentUser = { id: 'u-nobody', login: 'nobody', isAdmin: false }
    dbAttrRow = ATTR
    dbRoleRows = [] // no roles for this user
    const res = await acceptRoute.handle(
      new Request('http://localhost/suggestions/42/accept', { method: 'POST' }),
    )
    expect(res.status).toBe(403)
    expect(acceptCalled).toBe(false)
  })

  it('reviewer calls tolgee.acceptSuggestion and returns {ok:true}', async () => {
    acceptCalled = false
    currentUser = { id: 'u-reviewer', login: 'reviewer', isAdmin: false }
    dbAttrRow = ATTR
    dbRoleRows = [{ id: 'r1', userId: 'u-reviewer', locale: 'de', role: 'reviewer' }]
    const res = await acceptRoute.handle(
      new Request('http://localhost/suggestions/42/accept', { method: 'POST' }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
    expect(acceptCalled).toBe(true)
  })
})
