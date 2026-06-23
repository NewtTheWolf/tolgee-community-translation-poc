import { describe, expect, it, mock } from 'bun:test'
import { Elysia } from 'elysia'

let currentUser: { id: string; login: string; isAdmin: boolean } | null = null
let upserted: { value?: number } | null = null
let deleteCalled = false

mock.module('../src/middleware/auth', () => ({
  authMiddleware: new Elysia({ name: 'auth' }).derive(() => ({ user: currentUser })).as('global'),
}))
mock.module('../src/lib/ulid', () => ({ id: () => 'vote-id' }))
mock.module('../src/db/index', () => ({
  db: {
    insert: () => ({
      values: (v: { value: number }) => ({
        onConflictDoUpdate: async () => {
          upserted = v
        },
      }),
    }),
    delete: () => ({
      where: async () => {
        deleteCalled = true
      },
    }),
  },
}))

const { default: vote } = await import('../src/routes/suggestions/[id]/vote')
const post = (id: string, value: number) =>
  vote.handle(
    new Request(`http://localhost/suggestions/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    }),
  )

describe('POST /suggestions/:id/vote', () => {
  it('401 for anonymous', async () => {
    currentUser = null
    expect((await post('555', 1)).status).toBe(401)
  })

  it('upserts an upvote for a logged-in user', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    upserted = null
    const res = await post('555', 1)
    expect(res.status).toBe(200)
    expect((await res.json()) as { myVote: number }).toMatchObject({ ok: true, myVote: 1 })
    expect(upserted?.value).toBe(1)
  })

  it('clears the vote when value is 0', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    deleteCalled = false
    const res = await post('555', 0)
    expect(res.status).toBe(200)
    expect((await res.json()) as { myVote: number }).toMatchObject({ ok: true, myVote: 0 })
    expect(deleteCalled).toBe(true)
  })

  it('rejects an out-of-range value', async () => {
    currentUser = { id: 'u1', login: 'u', isAdmin: false }
    expect((await post('555', 5)).status).toBe(422)
  })
})
