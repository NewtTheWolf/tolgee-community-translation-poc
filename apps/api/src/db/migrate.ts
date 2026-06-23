import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { settings } from './schema'

const url = Bun.env.DATABASE_URL ?? 'postgres://ct:ct@localhost:5432/ct'
const client = postgres(url, { max: 1 })
const db = drizzle(client)
await migrate(db, { migrationsFolder: './src/db/migrations' })
await db.insert(settings).values({ id: 1 }).onConflictDoNothing()
await client.end()
console.log('migrations applied')
