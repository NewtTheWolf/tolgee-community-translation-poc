import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = Bun.env.DATABASE_URL ?? 'postgres://ct:ct@localhost:5432/ct'
const client = postgres(url, { max: 1 })
await migrate(drizzle(client), { migrationsFolder: './src/db/migrations' })
await client.end()
console.log('migrations applied')
