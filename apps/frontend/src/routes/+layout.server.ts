import { api, type Me } from '$lib/api'
import type { LayoutServerLoad } from './$types'

export const load: LayoutServerLoad = async ({ fetch }) => {
  try {
    return { me: await api.get<Me>('/me', fetch) }
  } catch {
    return { me: { user: null } as Me }
  }
}
