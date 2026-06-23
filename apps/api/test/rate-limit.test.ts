import { describe, expect, it } from 'bun:test'
import { Elysia } from 'elysia'
import { rateLimit } from '../src/middleware/rate-limit'

describe('rateLimit', () => {
  it('issues a Set-Cookie anon_id for a first-time visitor (no cookie)', async () => {
    const app = new Elysia().use(rateLimit({ windowMs: 60000, max: 1 })).get('/x', () => 'ok')
    const res = await app.handle(new Request('http://localhost/x'))
    expect(res.status).toBe(200)
    const setCookie = res.headers.get('set-cookie')
    expect(setCookie).not.toBeNull()
    expect(setCookie).toContain('anon_id=')
  })

  it('returns 429 with Retry-After on the second request using the same anon_id', async () => {
    const app = new Elysia().use(rateLimit({ windowMs: 60000, max: 1 })).get('/x', () => 'ok')

    // First request — get the issued anon_id
    const res1 = await app.handle(new Request('http://localhost/x'))
    expect(res1.status).toBe(200)
    const setCookie = res1.headers.get('set-cookie')
    expect(setCookie).not.toBeNull()

    // Extract cookie value for the second request
    // set-cookie format: "anon_id=<value>; ..."
    const match = setCookie?.match(/anon_id=([^;]+)/)
    expect(match).not.toBeNull()
    const anonId = match?.[1]

    // Second request carrying the issued cookie
    const res2 = await app.handle(
      new Request('http://localhost/x', {
        headers: { cookie: `anon_id=${anonId}` },
      }),
    )
    expect(res2.status).toBe(429)
    expect(res2.headers.get('retry-after')).not.toBeNull()
  })
})
