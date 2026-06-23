import type { PageLoad } from './$types'
import { api } from '$lib/api'
import { redirect } from '@sveltejs/kit'

export interface SuggestionWithAttribution {
  id: number
  keyId: number
  languageId?: number
  translation?: string
  state?: string
  attribution?: {
    author?: { login: string }
    anon?: boolean
    status?: string
  } | null
}

export interface SuggestionsResponse {
  suggestions: SuggestionWithAttribution[]
  nextCursor?: string
}

export const load: PageLoad = async ({ parent, fetch }) => {
  const { me } = await parent()

  if (!me.user) throw redirect(303, '/login')

  const isAdmin = me.user.isAdmin
  const reviewerLocales = (me.roles ?? []).filter((r) => r.role === 'reviewer').map((r) => r.locale)

  if (!isAdmin && reviewerLocales.length === 0) {
    return { suggestions: [], locale: null, reviewerLocales: [], isAdmin }
  }

  // Use the first reviewer locale (or empty for admin to show all)
  const defaultLocale = isAdmin ? (reviewerLocales[0] ?? null) : reviewerLocales[0]
  const qs = defaultLocale ? `/suggestions?locale=${encodeURIComponent(defaultLocale)}` : '/suggestions'

  try {
    const data = await api.get<SuggestionsResponse>(qs, fetch)
    return {
      suggestions: data?.suggestions ?? [],
      locale: defaultLocale,
      reviewerLocales,
      isAdmin,
    }
  } catch {
    return { suggestions: [], locale: defaultLocale, reviewerLocales, isAdmin }
  }
}
