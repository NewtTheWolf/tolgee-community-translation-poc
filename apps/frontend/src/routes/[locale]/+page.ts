import type { PageLoad } from './$types'
import { api } from '$lib/api'

export interface TranslationKey {
  keyId: number
  keyName: string
  translations: Record<string, { id: number; text: string | null; state: string } | undefined>
}

export interface TranslationsPage {
  keys: TranslationKey[]
  nextCursor?: string
}

export const load: PageLoad = async ({ params, url, fetch }) => {
  const locale = params.locale
  const search = url.searchParams.get('search') ?? undefined
  let qs = `/translations?language=${encodeURIComponent(locale)}`
  if (search) qs += `&search=${encodeURIComponent(search)}`
  try {
    const data = await api.get<TranslationsPage>(qs, fetch)
    return {
      locale,
      search: search ?? '',
      keys: data?.keys ?? [],
      nextCursor: data?.nextCursor ?? null,
    }
  } catch {
    return { locale, search: search ?? '', keys: [], nextCursor: null }
  }
}
