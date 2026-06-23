import { api } from '$lib/api'
import type { PageLoad } from './$types'

export interface SuggestionWithAttribution {
  id: number
  keyId: number
  locale?: string
  languageId?: number
  translation?: string
  state?: string
  score?: number
  upvotes?: number
  downvotes?: number
  myVote?: number
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

  const isAdmin = me.user?.isAdmin ?? false
  const reviewerLocales = (me.roles ?? []).filter((r) => r.role === 'reviewer').map((r) => r.locale)

  // The suggestions endpoint is public; everyone gets a default locale view.
  // Admins default to the "All" view; otherwise default to the first reviewer
  // locale (if any) so moderators land on a locale they can act on.
  const defaultLocale = isAdmin ? null : (reviewerLocales[0] ?? null)
  const qs = defaultLocale ? `/suggestions?locale=${encodeURIComponent(defaultLocale)}` : '/suggestions'

  // Voting requires a session; moderation requires admin or reviewer-for-locale.
  const canVote = !!me.user
  const canModerate = isAdmin || (me.roles ?? []).some((r) => r.role === 'reviewer' && r.locale === defaultLocale)

  try {
    const data = await api.get<SuggestionsResponse>(qs, fetch)
    return {
      suggestions: data?.suggestions ?? [],
      locale: defaultLocale,
      reviewerLocales,
      isAdmin,
      canVote,
      canModerate,
    }
  } catch {
    return { suggestions: [], locale: defaultLocale, reviewerLocales, isAdmin, canVote, canModerate }
  }
}
