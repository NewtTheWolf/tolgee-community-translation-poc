import { describe, expect, it } from 'bun:test'
import { signSession, verifySession } from '../src/lib/jwt'

describe('session jwt', () => {
  it('round-trips a payload', async () => {
    const token = await signSession({ sub: 'u1', login: 'newt' })
    const p = await verifySession(token)
    expect(p?.sub).toBe('u1')
    expect(p?.login).toBe('newt')
  })

  it('rejects garbage', async () => {
    expect(await verifySession('not.a.jwt')).toBeNull()
  })
})
