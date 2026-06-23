import { eq } from 'drizzle-orm'
import { Elysia, t } from 'elysia'
import { db } from '$db/index'
import { users } from '$db/schema'
import { writeAudit } from '$lib/audit'
import { adminLogins, env } from '$lib/env'
import { signSession } from '$lib/jwt'
import { id } from '$lib/ulid'
import { github } from '../github'

export default new Elysia().get(
  '/auth/github/callback',
  async ({ query, cookie, redirect, status }) => {
    if (!query.code || !query.state || query.state !== cookie.oauth_state?.value) {
      return status(400, { error: 'invalid oauth state' })
    }
    const tokens = await github.validateAuthorizationCode(query.code)
    const ghRes = await fetch('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${tokens.accessToken()}`, 'User-Agent': 'community-translations' },
    })
    if (!ghRes.ok) return status(502, { error: 'github api error' })
    const gh = (await ghRes.json()) as { id: number; login: string; name?: string; avatar_url?: string }

    const isAdmin = adminLogins().has(gh.login.toLowerCase())
    const existing = (await db.select().from(users).where(eq(users.githubId, gh.id)).limit(1))[0]
    let userId: string
    if (existing) {
      userId = existing.id
      await db
        .update(users)
        .set({
          login: gh.login,
          name: gh.name,
          avatarUrl: gh.avatar_url,
          isAdmin: existing.isAdmin || isAdmin,
          lastSeenAt: new Date(),
        })
        .where(eq(users.id, userId))
    } else {
      userId = id()
      await db
        .insert(users)
        .values({ id: userId, githubId: gh.id, login: gh.login, name: gh.name, avatarUrl: gh.avatar_url, isAdmin })
      await writeAudit({
        actorUserId: userId,
        action: 'user.register',
        targetType: 'user',
        targetId: userId,
        meta: { login: gh.login },
      })
    }

    const token = await signSession({ sub: userId, login: gh.login })
    cookie.session?.set({
      value: token,
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
      sameSite: 'lax',
      secure: env.NODE_ENV === 'production',
    })
    cookie.oauth_state?.remove()
    return redirect(env.WEB_BASE_URL ?? 'http://localhost:5173')
  },
  { query: t.Object({ code: t.Optional(t.String()), state: t.Optional(t.String()) }) },
)
