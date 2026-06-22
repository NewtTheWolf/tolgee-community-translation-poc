import { describe, expect, it, beforeAll, afterAll } from 'bun:test'
import { Elysia } from 'elysia'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { eq } from 'drizzle-orm'
import { users } from '../src/db/schema'
// Import via tsconfig path aliases instead of the relative paths that other
// test files mock. Bun keys relative and alias imports separately in its module
// registry, so these aliases always resolve to the real implementations even
// when another test has called mock.module('../src/middleware/auth') or
// mock.module('../src/db/index').
import { connectDB } from '$db/index'
import { signSession } from '$lib/jwt'
import { authMiddleware } from '$middleware/auth'

// Use a direct postgres connection for seed/cleanup so this test is immune to
// mock.module('../src/db/index') leaks from other test files.
// connectDB() is still called to initialise the shared db proxy used by authMiddleware.
const TEST_USER_ID = 'test-auth-scope-user-01'
const TEST_GITHUB_ID = 999_000_001
const TEST_LOGIN = 'test-auth-scope-bot'

let client: ReturnType<typeof postgres> | null = null
let directDb: ReturnType<typeof drizzle> | null = null

beforeAll(async () => {
  const url = Bun.env.DATABASE_URL
  if (!url) return
  await connectDB(url)
  client = postgres(url, { max: 2 })
  directDb = drizzle(client)
  await directDb
    .insert(users)
    .values({ id: TEST_USER_ID, githubId: TEST_GITHUB_ID, login: TEST_LOGIN })
    .onConflictDoNothing()
})

afterAll(async () => {
  if (directDb) {
    await directDb.delete(users).where(eq(users.id, TEST_USER_ID))
  }
  if (client) await client.end()
})

describe('authMiddleware', () => {
  it('blocks requireUser without session', async () => {
    const app = new Elysia().use(authMiddleware).get('/secret', () => 'ok', { requireUser: true })
    const res = await app.handle(new Request('http://localhost/secret'))
    expect(res.status).toBe(401)
  })

  it('propagates user to consumer route with valid session cookie', async () => {
    const token = await signSession({ sub: TEST_USER_ID, login: TEST_LOGIN })
    const app = new Elysia()
      .use(authMiddleware)
      .get('/whoami', ({ user }) => ({ user }))

    const res = await app.handle(
      new Request('http://localhost/whoami', {
        headers: { cookie: `session=${token}` },
      }),
    )

    expect(res.status).toBe(200)
    const body = (await res.json()) as { user: { id: string; login: string } | null }
    expect(body.user).not.toBeNull()
    expect(body.user!.id).toBe(TEST_USER_ID)
    expect(body.user!.login).toBe(TEST_LOGIN)
  })

  it('returns user: null for missing session cookie', async () => {
    const app = new Elysia()
      .use(authMiddleware)
      .get('/whoami', ({ user }) => ({ user }))

    const res = await app.handle(new Request('http://localhost/whoami'))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { user: unknown }
    expect(body.user).toBeNull()
  })
})
