import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { connectDB } from '$db/index'
import { allowedOrigins, env } from '$lib/env'
import { logger } from '$lib/logger'
import { loggerMiddleware } from '$middleware/logger'
import adminRoles from './routes/admin/roles'
import adminSettings from './routes/admin/settings'
import adminUsers from './routes/admin/users'
import applicationApprove from './routes/applications/[id]/approve'
import applicationReject from './routes/applications/[id]/reject'
import applications from './routes/applications/index'
import authGithub from './routes/auth/github'
import authGithubCallback from './routes/auth/github/callback'
import authLogout from './routes/auth/logout'
import healthz from './routes/healthz'
import languages from './routes/languages'
import me from './routes/me'
import suggestionAccept from './routes/suggestions/[id]/accept'
import suggestionDecline from './routes/suggestions/[id]/decline'
import suggestionVote from './routes/suggestions/[id]/vote'
import suggestions from './routes/suggestions/index'
import suggestionsMt from './routes/suggestions/mt'
import suggestionsTm from './routes/suggestions/tm'
import translations from './routes/translations'

await connectDB(env.DATABASE_URL)

// Routes declare absolute paths in-file (and are tested that way), so they are
// mounted at the root rather than file-system-prefixed.
export function createApp() {
  return new Elysia()
    .use(loggerMiddleware)
    .use(
      cors({
        origin: allowedOrigins(),
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      }),
    )
    .use(openapi({ documentation: { info: { title: 'Community Translations API', version: '0.1.0' } } }))
    .use(healthz)
    .use(authGithub)
    .use(authGithubCallback)
    .use(authLogout)
    .use(me)
    .use(languages)
    .use(translations)
    .use(suggestions)
    .use(suggestionAccept)
    .use(suggestionDecline)
    .use(suggestionVote)
    .use(suggestionsMt)
    .use(suggestionsTm)
    .use(applications)
    .use(applicationApprove)
    .use(applicationReject)
    .use(adminRoles)
    .use(adminSettings)
    .use(adminUsers)
}

const app = await createApp()
const port = Number(env.PORT ?? 3000)
app.listen(port)
logger.info(`API listening on :${port}`)
