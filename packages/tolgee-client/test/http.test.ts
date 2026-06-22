import { describe, expect, it, mock } from 'bun:test'
import { fetchWithRetry, TolgeeApiError } from '../src/http'

describe('fetchWithRetry', () => {
  it('retries on 429 then succeeds', async () => {
    let calls = 0
    const f = mock(async () => {
      calls++
      return calls < 2 ? new Response('rate', { status: 429 }) : new Response('ok', { status: 200 })
    }) as unknown as typeof fetch
    const res = await fetchWithRetry('http://x', {}, { retries: 3, fetchImpl: f, baseDelayMs: 1 })
    expect(res.status).toBe(200)
    expect(calls).toBe(2)
  })

  it('throws TolgeeApiError on non-retryable 400', async () => {
    const f = mock(async () => new Response(JSON.stringify({ code: 'bad' }), { status: 400 })) as unknown as typeof fetch
    await expect(fetchWithRetry('http://x', {}, { fetchImpl: f })).rejects.toBeInstanceOf(TolgeeApiError)
  })
})
