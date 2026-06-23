import { describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'

// Mutable user — changed per test before the request
let currentUser: { id: string; login: string; isAdmin: boolean } | null = {
  id: 'u-member',
  login: 'member',
  isAdmin: false,
}

// Auth middleware stub — .as('global') required for derive to propagate in Elysia 1.4
mock.module('../src/middleware/auth', () => ({
  authMiddleware: new Elysia({ name: 'auth' }).derive(() => ({ user: currentUser })).as('global'),
}))

// Per-test db config
let dbAppRow: unknown | null = null
let dbRoleRows: unknown[] = []
let insertCalled = false
let updateCalled = false

mock.module('../src/db/index', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          // applications query uses .limit(1)
          limit: async () => (dbAppRow ? [dbAppRow] : []),
          // roles query has no .limit() — accessed as a Promise directly.
          // biome-ignore lint/suspicious/noThenProperty: intentional thenable to mock an awaited Drizzle query builder
          then: (resolve: (rows: unknown[]) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(dbRoleRows).then(resolve, reject),
        }),
      }),
    }),
    insert: () => {
      insertCalled = true
      return {
        values: () => ({
          onConflictDoNothing: async () => {},
        }),
      }
    },
    update: () => {
      updateCalled = true
      return {
        set: () => ({
          where: async () => {},
        }),
      }
    },
  },
}))

mock.module('../src/lib/audit', () => ({ writeAudit: async () => {} }))
mock.module('../src/lib/ulid', () => ({ id: () => 'test-id-generated' }))

const { default: applicationsRoute } = await import('../src/routes/applications/index')
const { default: approveRoute } = await import('../src/routes/applications/[id]/approve')

const PENDING_APP = {
  id: 'app-1',
  userId: 'u-applicant',
  locale: 'de',
  requestedRole: 'translator' as const,
  message: null,
  status: 'pending' as const,
  reviewedBy: null,
  reviewedAt: null,
  createdAt: new Date(),
}

describe('POST /applications', () => {
  it('member creates application → db.insert called, returns { id: string }', async () => {
    insertCalled = false
    currentUser = { id: 'u-member', login: 'member', isAdmin: false }

    const res = await applicationsRoute.handle(
      new Request('http://localhost/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: 'de', requestedRole: 'translator', message: 'please add me' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { id: string }
    expect(typeof body.id).toBe('string')
    expect(insertCalled).toBe(true)
  })
})

describe('POST /applications/:id/approve', () => {
  it('reviewer-for-locale approves → role inserted, returns { ok: true }', async () => {
    insertCalled = false
    updateCalled = false
    currentUser = { id: 'u-reviewer', login: 'reviewer', isAdmin: false }
    dbAppRow = PENDING_APP
    dbRoleRows = [{ id: 'r1', userId: 'u-reviewer', locale: 'de', role: 'reviewer' }]

    const res = await approveRoute.handle(
      new Request('http://localhost/applications/app-1/approve', { method: 'POST' }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { ok: boolean }
    expect(body.ok).toBe(true)
    expect(insertCalled).toBe(true)
    expect(updateCalled).toBe(true)
  })

  it('non-reviewer trying to approve → 403', async () => {
    insertCalled = false
    updateCalled = false
    currentUser = { id: 'u-nobody', login: 'nobody', isAdmin: false }
    dbAppRow = PENDING_APP
    dbRoleRows = [] // no roles for this user

    const res = await approveRoute.handle(
      new Request('http://localhost/applications/app-1/approve', { method: 'POST' }),
    )
    expect(res.status).toBe(403)
    expect(insertCalled).toBe(false)
  })
})
