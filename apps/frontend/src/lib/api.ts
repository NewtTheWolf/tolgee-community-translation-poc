import { PUBLIC_API_URL } from '$env/static/public'

async function req<T>(method: string, path: string, body?: unknown, fetchImpl: typeof fetch = fetch): Promise<T> {
  const res = await fetchImpl(`${PUBLIC_API_URL}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  return (await res.json()) as T
}

export const api = {
  get: <T>(p: string, f?: typeof fetch) => req<T>('GET', p, undefined, f),
  post: <T>(p: string, b?: unknown, f?: typeof fetch) => req<T>('POST', p, b, f),
  put: <T>(p: string, b?: unknown, f?: typeof fetch) => req<T>('PUT', p, b, f),
  del: <T>(p: string, f?: typeof fetch) => req<T>('DELETE', p, undefined, f),
}

export type Me = { user: { id: string; login: string; isAdmin: boolean } | null; roles?: { locale: string; role: 'translator' | 'reviewer' }[] }
