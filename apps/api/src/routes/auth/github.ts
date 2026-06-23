import { GitHub, generateState } from 'arctic'
import { Elysia } from 'elysia'
import { env } from '$lib/env'

const github = new GitHub(
  env.GITHUB_CLIENT_ID ?? '',
  env.GITHUB_CLIENT_SECRET ?? '',
  `${env.BASE_URL}/auth/github/callback`,
)

export default new Elysia().get('/auth/github', ({ cookie, redirect }) => {
  const state = generateState()
  const url = github.createAuthorizationURL(state, ['read:user'])
  cookie.oauth_state?.set({
    value: state,
    httpOnly: true,
    path: '/',
    maxAge: 600,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  })
  return redirect(url.toString())
})

export { github }
