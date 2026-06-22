import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { authMiddleware } from '../src/middleware/auth'

describe('authMiddleware', () => {
  it('blocks requireUser without session', async () => {
    const app = new Elysia().use(authMiddleware).get('/secret', () => 'ok', { requireUser: true })
    const res = await app.handle(new Request('http://localhost/secret'))
    expect(res.status).toBe(401)
  })
})
