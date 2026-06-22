import { Elysia, type Context, type Cookie } from 'elysia'
import { id } from '$lib/ulid'

// Elysia's cookie jar in plugin scope: Record<string, Cookie<unknown>>.
// We read value as unknown and narrow to string at runtime.
type CookieJar = Record<string, Cookie<unknown>>

// Returns the existing anon_id cookie value, or issues a fresh one.
// Accepts Elysia's Cookie<unknown> jar so the function is typed precisely
// without requiring generics that are only resolved per-route.
export function ensureAnonId(cookie: CookieJar): string {
  const existing = cookie.anon_id?.value
  if (typeof existing === 'string' && existing.length > 0) return existing
  const value = id()
  // Cookie<unknown>.value setter accepts unknown; httpOnly etc. are direct properties.
  if (cookie.anon_id) {
    cookie.anon_id.value = value
    cookie.anon_id.httpOnly = true
    cookie.anon_id.path = '/'
    cookie.anon_id.maxAge = 60 * 60 * 24 * 365
    cookie.anon_id.sameSite = 'lax'
  }
  return value
}

// In-memory sliding-window rate limiter keyed by anon_id.
// Uses Date.now() — allowed in app code (only forbidden inside Workflow scripts).
export function rateLimit(opts: { windowMs: number; max: number }) {
  const hits = new Map<string, number[]>()

  return new Elysia({ name: `rate-limit-${opts.windowMs}-${opts.max}` }).onBeforeHandle(
    // Context<{}> is the base context type for a plugin with no route-specific
    // generics — it carries Cookie<unknown>, HTTPHeaders, and the status overload
    // we need. Using the real type (not `as any`) keeps the compiler honest.
    (ctx: Context) => {
      const key = ensureAnonId(ctx.cookie)
      const now = Date.now()
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
