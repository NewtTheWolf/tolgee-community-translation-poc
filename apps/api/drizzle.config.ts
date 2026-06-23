import { defineConfig } from 'drizzle-kit'

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dbCredentials: {
    url:
      (typeof Bun !== 'undefined' ? Bun.env.DATABASE_URL : process.env.DATABASE_URL) ??
      'postgres://ct:ct@localhost:5432/ct',
  },
})
