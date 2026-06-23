import { cors } from '@elysiajs/cors'
import { openapi } from '@elysiajs/openapi'
import { Elysia } from 'elysia'
import { fsr } from 'elysia-fsr'
import { connectDB } from '$db/index'
import { allowedOrigins, env } from '$lib/env'
import { logger } from '$lib/logger'
import { loggerMiddleware } from '$middleware/logger'

await connectDB(env.DATABASE_URL)

export async function createApp() {
  const router = await fsr({ dir: './routes', types: false })
  return new Elysia({ systemRouter: false })
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
    .use(router)
}

const app = await createApp()
const port = Number(env.PORT ?? 3000)
app.listen(port)
logger.info(`API listening on :${port}`)
