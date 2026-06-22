export interface TolgeeLanguage {
  id: number
  tag: string
  name: string
  originalName: string
}

export interface TranslationKey {
  keyId: number
  keyName: string
  translations: Record<string, { id: number; text: string | null; state: string }>
}

export interface TranslationsPage {
  keys: TranslationKey[]
  nextCursor?: string
}

export interface ListTranslationsParams {
  languages?: string[]
  search?: string
  cursor?: string
  size?: number
}

export interface TolgeeConfig {
  apiUrl: string
  projectId: number
  apiKey: string
}

export interface TolgeeSuggestion {
  id: number
  keyId: number
  languageId: number
  translation: string
  state: string
  author?: { id: number; name?: string }
}
