import type { PageLoad } from './$types'
import { api } from '$lib/api'

export interface Language {
  id: number
  tag: string
  name: string
  originalName: string
}

export const load: PageLoad = async ({ fetch }) => {
  try {
    const languages = await api.get<Language[]>('/languages', fetch)
    return { languages: Array.isArray(languages) ? languages : [] }
  } catch {
    return { languages: [] }
  }
}
