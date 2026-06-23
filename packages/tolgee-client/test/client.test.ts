import { describe, expect, it, mock } from 'bun:test'
import { TolgeeClient } from '../src/client'

const cfg = { apiUrl: 'https://t.test', projectId: 1, apiKey: 'k' }

describe('TolgeeClient.listLanguages', () => {
  it('maps _embedded.languages and sends X-API-Key', async () => {
    const f = mock(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://t.test/v2/projects/1/languages?size=100')
      expect((init.headers as Record<string, string>)['X-API-Key']).toBe('k')
      return new Response(
        JSON.stringify({ _embedded: { languages: [{ id: 2, tag: 'de', name: 'German', originalName: 'Deutsch' }] } }),
        { status: 200 },
      )
    }) as unknown as typeof fetch
    const c = new TolgeeClient(cfg, f)
    const langs = await c.listLanguages()
    expect(langs).toEqual([{ id: 2, tag: 'de', name: 'German', originalName: 'Deutsch' }])
  })
})

describe('TolgeeClient.listTranslations', () => {
  it('passes languages + cursor and maps keys', async () => {
    const f = mock(async (url: string) => {
      expect(url).toContain('languages=de')
      expect(url).toContain('cursor=abc')
      return new Response(
        JSON.stringify({
          _embedded: {
            keys: [
              { keyId: 9, keyName: 'app.title', translations: { de: { id: 5, text: 'Titel', state: 'TRANSLATED' } } },
            ],
          },
          nextCursor: 'def',
        }),
        { status: 200 },
      )
    }) as unknown as typeof fetch
    const c = new TolgeeClient(cfg, f)
    const page = await c.listTranslations({ languages: ['de'], cursor: 'abc' })
    expect(page.keys[0]?.keyName).toBe('app.title')
    expect(page.nextCursor).toBe('def')
  })
})

describe('TolgeeClient.createSuggestion', () => {
  it('POSTs to the per-language/key path and maps response', async () => {
    const f = mock(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://t.test/v2/projects/1/languages/2/key/9/suggestion')
      expect(init.method).toBe('POST')
      expect(JSON.parse(String(init.body))).toEqual({ translation: 'Hallo' })
      return new Response(JSON.stringify({ id: 100, keyId: 9, languageId: 2, translation: 'Hallo', state: 'ACTIVE' }), {
        status: 200,
      })
    }) as unknown as typeof fetch
    const c = new TolgeeClient(cfg, f)
    const s = await c.createSuggestion({ keyId: 9, languageId: 2, text: 'Hallo' })
    expect(s.id).toBe(100)
  })
})

describe('TolgeeClient.acceptSuggestion', () => {
  it('PUTs the per-language/key accept path and resolves void', async () => {
    const f = mock(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://t.test/v2/projects/1/languages/2/key/9/suggestion/100/accept')
      expect(init.method).toBe('PUT')
      return new Response('', { status: 200 })
    }) as unknown as typeof fetch
    await new TolgeeClient(cfg, f).acceptSuggestion({ keyId: 9, languageId: 2, suggestionId: 100 })
  })
})

describe('TolgeeClient.declineSuggestion', () => {
  it('PUTs the per-language/key decline path and resolves void', async () => {
    const f = mock(async (url: string, init: RequestInit) => {
      expect(url).toBe('https://t.test/v2/projects/1/languages/2/key/9/suggestion/100/decline')
      expect(init.method).toBe('PUT')
      return new Response('', { status: 200 })
    }) as unknown as typeof fetch
    await new TolgeeClient(cfg, f).declineSuggestion({ keyId: 9, languageId: 2, suggestionId: 100 })
  })
})
