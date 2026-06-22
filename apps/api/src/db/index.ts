import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

export type DB = ReturnType<typeof drizzle<typeof schema>>

let _db: DB | null = null

export const db: DB = new Proxy({} as DB, {
  get(_t, prop, recv) {
    if (!_db) throw new Error('DB accessed before connectDB()')
    return Reflect.get(_db, prop, recv)
  },
})

export async function connectDB(url: string): Promise<void> {
  if (_db) return
  const client = postgres(url, { max: 10 })
  _db = drizzle(client, { schema })
}

export { schema }
