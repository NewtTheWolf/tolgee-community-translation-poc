import { describe, expect, it } from 'bun:test'

// This test deliberately does NOT mock the auth middleware: it exercises the real
// `requireAdmin` macro wiring against an admin-only route to prove the gate runs
// (every other route test stubs auth away, so the macro itself was untested).
const { default: adminRoles } = await import('../src/routes/admin/roles')

describe('requireAdmin gate (real auth middleware)', () => {
  it('401 for GET /admin/roles without a session', async () => {
    const res = await adminRoles.handle(new Request('http://localhost/admin/roles'))
    expect(res.status).toBe(401)
  })

  it('401 for GET /admin/roles with an invalid session cookie', async () => {
    const res = await adminRoles.handle(
      new Request('http://localhost/admin/roles', { headers: { cookie: 'session=not-a-valid-jwt' } }),
    )
    expect(res.status).toBe(401)
  })

  it('401 for POST /admin/roles without a session (no role granted)', async () => {
    const res = await adminRoles.handle(
      new Request('http://localhost/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'victim', locale: 'de', role: 'reviewer' }),
      }),
    )
    expect(res.status).toBe(401)
  })
})
