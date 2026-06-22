import { Elysia } from 'elysia'
import { tolgee } from '$lib/tolgee'
// TASK5: restore when db/index exists
// import { db } from '$db/index'
// TASK5: restore when db/index exists
// import { sql } from 'drizzle-orm'

export default new Elysia().get('/healthz', async ({ set }) => {
  const checks: Record<string, boolean> = { db: false, tolgee: false }
  // TASK5: restore when db/index exists
  // try {
  //   await db.execute(sql`select 1`)
  //   checks.db = true
  // } catch {}
  try {
    await tolgee.listLanguages()
    checks.tolgee = true
  } catch {}
  const ok = checks.db && checks.tolgee
  set.status = ok ? 200 : 503
  return { ok, checks }
})
