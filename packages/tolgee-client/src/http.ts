export class TolgeeApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(`Tolgee API error ${status}`)
    this.name = 'TolgeeApiError'
  }
}

export interface RetryOpts {
  retries?: number
  baseDelayMs?: number
  fetchImpl?: typeof fetch
}

const RETRYABLE = new Set([429, 500, 502, 503, 504])

export async function fetchWithRetry(url: string, init: RequestInit, opts: RetryOpts = {}): Promise<Response> {
  const { retries = 3, baseDelayMs = 200, fetchImpl = fetch } = opts
  let attempt = 0
  // Loop bounded by `retries`; only retryable statuses and network errors re-loop.
  for (;;) {
    let res: Response
    try {
      res = await fetchImpl(url, init)
    } catch (err) {
      if (attempt >= retries) throw err
      await sleep(baseDelayMs * 2 ** attempt)
      attempt++
      continue
    }
    if (res.ok) return res
    if (RETRYABLE.has(res.status) && attempt < retries) {
      await sleep(baseDelayMs * 2 ** attempt)
      attempt++
      continue
    }
    let body: unknown = null
    try {
      body = await res.clone().json()
    } catch {
      body = await res.clone().text()
    }
    throw new TolgeeApiError(res.status, body)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
