import { fetchWithRetry } from './http'
import type { ListTranslationsParams, TolgeeConfig, TolgeeLanguage, TolgeeSuggestion, TranslationsPage } from './types'

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

  private async send(url: string, method: string, body?: unknown): Promise<Response> {
    return fetchWithRetry(
      url,
      {
        method,
        headers: this.headers(body ? { 'Content-Type': 'application/json' } : undefined),
        body: body ? JSON.stringify(body) : undefined,
      },
      { fetchImpl: this.fetchImpl },
    )
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

  private suggestionPath(p: { languageId: number; keyId: number }): string {
    return `/languages/${p.languageId}/key/${p.keyId}/suggestion`
  }

  async createSuggestion(p: { keyId: number; languageId: number; text: string }): Promise<TolgeeSuggestion> {
    const res = await this.send(this.base(this.suggestionPath(p)), 'POST', { translation: p.text })
    return (await res.json()) as TolgeeSuggestion
  }

  async acceptSuggestion(p: { keyId: number; languageId: number; suggestionId: number }): Promise<void> {
    await this.send(this.base(`${this.suggestionPath(p)}/${p.suggestionId}/accept`), 'PUT')
  }

  async declineSuggestion(p: { keyId: number; languageId: number; suggestionId: number }): Promise<void> {
    await this.send(this.base(`${this.suggestionPath(p)}/${p.suggestionId}/decline`), 'PUT')
  }

  async setTranslation(p: { key: string; language: string; text: string }): Promise<{ translationId: number }> {
    const res = await this.send(this.base('/translations'), 'PUT', {
      key: p.key,
      translations: { [p.language]: p.text },
    })
    const data = (await res.json()) as { translations?: Record<string, { id: number }> }
    return { translationId: data.translations?.[p.language]?.id ?? 0 }
  }

  async setTranslationState(translationId: number, state: 'TRANSLATED' | 'REVIEWED' | 'UNTRANSLATED'): Promise<void> {
    await this.send(this.base(`/translations/${translationId}/set-state/${state}`), 'PUT')
  }

  async getMtSuggestions(p: { keyId: number; targetLanguageId: number }): Promise<string[]> {
    const res = await this.send(this.base('/suggest/machine-translations'), 'POST', {
      keyId: p.keyId,
      targetLanguageId: p.targetLanguageId,
    })
    const data = (await res.json()) as { machineTranslations?: Record<string, string> }
    return Object.values(data.machineTranslations ?? {})
  }

  async getTmSuggestions(p: { keyId: number; targetLanguageId: number }) {
    const res = await this.send(this.base('/suggest/translation-memory'), 'POST', {
      keyId: p.keyId,
      targetLanguageId: p.targetLanguageId,
    })
    const data = (await res.json()) as {
      _embedded?: { translationMemoryItems?: { targetText: string; similarity: number }[] }
    }
    return (data._embedded?.translationMemoryItems ?? []).map((i) => ({ text: i.targetText, similarity: i.similarity }))
  }
}
