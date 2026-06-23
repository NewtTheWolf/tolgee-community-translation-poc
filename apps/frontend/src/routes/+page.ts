import { api } from '$lib/api'
import type { PageLoad } from './$types'

export interface Language {
  id: number
  tag: string
  name: string
  originalName: string
  flagEmoji?: string | null
  base?: boolean
}

export const load: PageLoad = async ({ fetch }) => {
  try {
    const languages = await api.get<Language[]>('/languages', fetch)
    return { languages: Array.isArray(languages) ? languages : [] }
  } catch {
    return { languages: [] }
  }
}
