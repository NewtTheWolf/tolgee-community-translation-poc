import type { LayoutServerLoad } from './$types'
import { api, type Me } from '$lib/api'

export const load: LayoutServerLoad = async ({ fetch }) => {
  try {
    return { me: await api.get<Me>('/me', fetch) }
  } catch {
    return { me: { user: null } as Me }
  }
}
