import { describe, expect, it } from 'bun:test'
import { parseEnv } from '../src/lib/env'

describe('parseEnv', () => {
  it('rejects short JWT_SECRET', () => {
    expect(() =>
      parseEnv({
        JWT_SECRET: 'short',
        DATABASE_URL: 'x',
        BASE_URL: 'http://x',
        TOLGEE_API_URL: 'http://x',
        TOLGEE_PROJECT_ID: '1',
        TOLGEE_API_KEY: 'k',
      }),
    ).toThrow()
  })

  it('accepts a valid env', () => {
    const e = parseEnv({
      JWT_SECRET: 'a'.repeat(32),
      DATABASE_URL: 'postgres://x',
      BASE_URL: 'http://localhost:3000',
      TOLGEE_API_URL: 'https://app.tolgee.io',
      TOLGEE_PROJECT_ID: '32587',
      TOLGEE_API_KEY: 'tgpak_x',
    })
    expect(e.TOLGEE_PROJECT_ID).toBe(32587)
  })
})
