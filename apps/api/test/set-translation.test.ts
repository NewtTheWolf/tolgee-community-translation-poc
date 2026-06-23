import { describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'
import { effectiveRoleFor, roleSatisfies } from '../src/lib/roles'

// Mutable user — changed per test before the request
let currentUser: { id: string; login: string; isAdmin: boolean } | null = {
  id: 'u-translator',
  login: 'translator',
  isAdmin: false,
}

// Per-test db config — caller sets these before each request
let dbRoleRows: { id: string; userId: string; locale: string; role: 'translator' | 'reviewer' }[] = []

// Auth middleware stub with requireRole macro — .as('global') required for derive to propagate in Elysia 1.4
const requireRoleMacro = (cfg: { locale: 'param' | 'body' | 'query'; min: 'translator' | 'reviewer' }) => ({
  resolve(ctx: unknown) {
    const { user, params, body, query, status } = ctx as {
      user: typeof currentUser
      params: Record<string, string>
      body: Record<string, string>
      query: Record<string, string>
      status: (code: number, body: unknown) => unknown
    }
    if (!user) return status(401, { error: 'authentication required' })
    const p = params as Record<string, string>
    const b = body as { locale?: string }
    const q = query as Record<string, string>
    const locale = cfg.locale === 'param' ? p.locale : cfg.locale === 'query' ? q.locale : b?.locale
    if (!locale) return status(400, { error: 'locale required' })
    const eff = effectiveRoleFor(user, dbRoleRows, locale)
    if (!roleSatisfies(eff, cfg.min)) return status(403, { error: `requires ${cfg.min} for ${locale}` })
    return { user, locale, effectiveRole: eff }
  },
})

mock.module('../src/middleware/auth', () => ({
  authMiddleware: new Elysia({ name: 'auth' })
    .derive(() => ({ user: currentUser }))
    .as('global')
    // biome-ignore lint/suspicious/noExplicitAny: Elysia's macro() generic signature is too complex to satisfy for a test stub
    .macro({ requireRole: requireRoleMacro } as any),
}))

let setTranslationCalled = false
const setTranslationResult: { translationId: number } = { translationId: 99 }
mock.module('../src/lib/tolgee', () => ({
  tolgee: {
    setTranslation: async () => {
      setTranslationCalled = true
      return setTranslationResult
    },
  },
}))

const { default: translationsRoute } = await import('../src/routes/translations')

describe('PUT /translations/:keyId/:locale', () => {
  it('returns 403 for non-translator', async () => {
    setTranslationCalled = false
    currentUser = { id: 'u-nobody', login: 'nobody', isAdmin: false }
    dbRoleRows = [] // no roles for this user

    const res = await translationsRoute.handle(
      new Request('http://localhost/translations/key-1/de', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'app.title', text: 'Hallo Welt' }),
      }),
    )
    expect(res.status).toBe(403)
    expect(setTranslationCalled).toBe(false)
  })

  it('translator can PUT and gets {translationId}', async () => {
    setTranslationCalled = false
    currentUser = { id: 'u-translator', login: 'translator', isAdmin: false }
    dbRoleRows = [{ id: 'r1', userId: 'u-translator', locale: 'de', role: 'translator' }]

    const res = await translationsRoute.handle(
      new Request('http://localhost/translations/key-1/de', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'app.title', text: 'Hallo Welt' }),
      }),
    )
    expect(res.status).toBe(200)
    const body = (await res.json()) as { translationId: number }
    expect(body.translationId).toBe(99)
    expect(setTranslationCalled).toBe(true)
  })
})
