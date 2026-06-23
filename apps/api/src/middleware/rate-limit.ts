import { type Cookie, Elysia } from 'elysia'
import { id } from '$lib/ulid'

// Elysia's cookie jar in plugin scope: Record<string, Cookie<unknown>>.
// We read value as unknown and narrow to string at runtime.
type CookieJar = Record<string, Cookie<unknown>>

// Returns the existing anon_id cookie value, or issues a fresh one.
// Accepts Elysia's Cookie<unknown> jar so the function is typed precisely
// without requiring generics that are only resolved per-route.
// NOTE: requires { as: 'global' } scope on the plugin hook so ctx.cookie is
// the Proxy-backed jar — accessing any key always returns a Cookie object,
// never undefined, even when the client sent no cookie. The non-null assertions
// below are justified by that runtime guarantee; noUncheckedIndexedAccess cannot
// see through the Proxy.
export function ensureAnonId(cookie: CookieJar): string {
  const existing = cookie.anon_id?.value
  if (typeof existing === 'string' && existing.length > 0) return existing
  const value = id()
  // The slot is always present via the Proxy-backed jar (see note above); bind it
  // once so the runtime guarantee is expressed without scattered non-null assertions.
  const slot = cookie.anon_id
  if (!slot) throw new Error('cookie jar not initialised — ensureAnonId requires global-scope hook')
  // Cookie<unknown>.value setter accepts unknown; httpOnly etc. are direct properties.
  slot.value = value
  slot.httpOnly = true
  slot.path = '/'
  slot.maxAge = 60 * 60 * 24 * 365
  slot.sameSite = 'lax'
  return value
}

// In-memory sliding-window rate limiter keyed by anon_id.
// Uses Date.now() — allowed in app code (only forbidden inside Workflow scripts).
export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>()
  // One-shot anonymous visitors would otherwise leave a permanent Map entry each;
  // sweep fully-expired keys every SWEEP_EVERY requests so memory stays bounded.
  const SWEEP_EVERY = 1000
  let opsSinceSweep = 0

  return new Elysia({ name: `rate-limit-${opts.windowMs}-${opts.max}` }).onBeforeHandle(
    // { as: 'global' } propagates this hook to all routes on the consuming app,
    // which is required for the plugin to intercept parent-app routes AND to
    // receive a fully initialised Proxy-backed cookie jar (ctx.cookie) so that
    // ensureAnonId can both read incoming cookies and issue Set-Cookie headers.
    // The handler type is left inferred so Elysia's overload resolution picks
    // the correct global-scope variant — explicit Context<{}> annotation is
    // incompatible with the global overload's params type.
    { as: 'global' },
    (ctx) => {
      const key = ensureAnonId(ctx.cookie)
      const now = Date.now()
      if (++opsSinceSweep >= SWEEP_EVERY) {
        opsSinceSweep = 0
        for (const [k, ts] of hits) {
          if (ts.every((t) => now - t >= opts.windowMs)) hits.delete(k)
        }
      }
      const recent = (hits.get(key) ?? []).filter((t) => now - t < opts.windowMs)
      if (recent.length >= opts.max) {
        ctx.set.headers['Retry-After'] = String(Math.ceil(opts.windowMs / 1000))
        return ctx.status(429, { error: 'rate limit exceeded' })
      }
      recent.push(now)
      hits.set(key, recent)
    },
  )
}
