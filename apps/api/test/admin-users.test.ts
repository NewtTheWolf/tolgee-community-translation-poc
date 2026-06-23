import { describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'

let currentUser: { id: string; login: string; isAdmin: boolean } | null = null
let dbRows: unknown[] = []
let lastLimit: number | null = null

// Stub the middleware WITH a requireAdmin macro mirroring the real one, since
// this route is gated entirely by the macro (no manual check in the handler).
mock.module('../src/middleware/auth', () => ({
  authMiddleware: new Elysia({ name: 'auth' })
    .derive(() => ({ user: currentUser }))
    .as('global')
    .macro({
      requireAdmin: {
        resolve({ user, status }: { user: typeof currentUser; status: (c: number, b: unknown) => unknown }) {
          if (!user) return status(401, { error: 'authentication required' })
          if (!user.isAdmin) return status(403, { error: 'admin only' })
          return { user }
        },
      },
      // biome-ignore lint/suspicious/noExplicitAny: Elysia macro generics are too complex for a test stub
    } as any),
}))
mock.module('../src/db/index', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async (n: number) => {
            lastLimit = n
            return dbRows
          },
        }),
      }),
    }),
  },
}))

const { default: adminUsers } = await import('../src/routes/admin/users')
const get = (qs: string) => adminUsers.handle(new Request(`http://localhost/admin/users${qs}`))

describe('GET /admin/users', () => {
  it('403 for non-admin', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    expect((await get('?q=ne')).status).toBe(403)
  })

  it('401 for anonymous', async () => {
    currentUser = null
    expect((await get('?q=ne')).status).toBe(401)
  })

  it('returns [] for an empty query without hitting the db', async () => {
    currentUser = { id: 'a', login: 'admin', isAdmin: true }
    lastLimit = null
    const res = await get('')
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
    expect(lastLimit).toBeNull() // short-circuited before the query
  })

  it('searches and caps results at 20 for an admin', async () => {
    currentUser = { id: 'a', login: 'admin', isAdmin: true }
    dbRows = [{ id: 'u1', login: 'newt', name: 'Newt', avatarUrl: null, isAdmin: false }]
    const res = await get('?q=new')
    expect(res.status).toBe(200)
    expect((await res.json()) as unknown[]).toHaveLength(1)
    expect(lastLimit).toBe(20)
  })
})
