import { fetchWithRetry } from './http'
import type { ListTranslationsParams, TolgeeConfig, TolgeeLanguage, TranslationsPage } from './types'

export class TolgeeClient {
  constructor(
    private readonly cfg: TolgeeConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private base(path: string): string {
    return `${this.cfg.apiUrl}/v2/projects/${this.cfg.projectId}${path}`
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return { 'X-API-Key': this.cfg.apiKey, ...extra }
  }

  private async get(url: string): Promise<unknown> {
    const res = await fetchWithRetry(url, { headers: this.headers() }, { fetchImpl: this.fetchImpl })
    return res.json()
  }

  async listLanguages(): Promise<TolgeeLanguage[]> {
    const data = (await this.get(this.base('/languages?size=100'))) as {
      _embedded?: { languages?: TolgeeLanguage[] }
    }
    return data._embedded?.languages ?? []
  }

  async listTranslations(p: ListTranslationsParams = {}): Promise<TranslationsPage> {
    const qs = new URLSearchParams()
    for (const l of p.languages ?? []) qs.append('languages', l)
    if (p.search) qs.set('search', p.search)
    if (p.cursor) qs.set('cursor', p.cursor)
    qs.set('size', String(p.size ?? 50))
    const data = (await this.get(this.base(`/translations?${qs}`))) as {
      _embedded?: { keys?: TranslationsPage['keys'] }
      nextCursor?: string
    }
    return { keys: data._embedded?.keys ?? [], nextCursor: data.nextCursor }
  }
}
