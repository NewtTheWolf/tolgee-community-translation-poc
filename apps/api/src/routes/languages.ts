import { Elysia } from 'elysia'
import { tolgee } from '$lib/tolgee'

export default new Elysia().get('/languages', async ({ set }) => {
  try {
    return await tolgee.listLanguages()
  } catch {
    set.status = 502
    return { error: 'tolgee unavailable' }
  }
})
