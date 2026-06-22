import { Elysia } from 'elysia'
import { logger } from '$lib/logger'

export const loggerMiddleware = new Elysia({ name: 'logger' }).onAfterResponse(({ request, set }) => {
  logger.info({ method: request.method, url: request.url, status: set.status }, 'request')
})
