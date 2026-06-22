import { describe, expect, it } from 'bun:test'
import { connectDB, db } from '../src/db/index'
import { settings } from '../src/db/schema'

describe('db', () => {
  it('connects and seeds settings row idempotently', async () => {
    await connectDB(Bun.env.DATABASE_URL ?? 'postgres://ct:ct@localhost:5432/ct')
    await db.insert(settings).values({ id: 1 }).onConflictDoNothing()
    const rows = await db.select().from(settings)
    expect(rows[0]?.autoPromoteThreshold).toBe(5)
  })
})
