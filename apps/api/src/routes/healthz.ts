import { sql } from 'drizzle-orm'
import { Elysia } from 'elysia'
import { db } from '$db/index'
import { tolgee } from '$lib/tolgee'

export default new Elysia().get('/healthz', async ({ set }) => {
  const checks: Record<string, boolean> = { db: false, tolgee: false }
  try {
    await db.execute(sql`select 1`)
    checks.db = true
  } catch {}
  try {
    await tolgee.listLanguages()
    checks.tolgee = true
  } catch {}
  const ok = checks.db && checks.tolgee
  set.status = ok ? 200 : 503
  return { ok, checks }
})
