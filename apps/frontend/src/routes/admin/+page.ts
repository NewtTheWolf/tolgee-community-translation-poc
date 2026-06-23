import { redirect } from '@sveltejs/kit'
import { api } from '$lib/api'
import type { PageLoad } from './$types'

export interface Application {
  id: string
  userId: string
  locale: string
  requestedRole: 'translator' | 'reviewer'
  message?: string | null
  status: string
}

export interface Role {
  id: string
  userId: string
  locale: string
  role: 'translator' | 'reviewer'
  grantedBy?: string | null
}

export interface Settings {
  id: number
  autoPromoteThreshold: number
}

export const load: PageLoad = async ({ parent, fetch }) => {
  const { me } = await parent()

  if (!me.user?.isAdmin) throw redirect(303, '/')

  const [applications, roles, settings] = await Promise.all([
    api.get<Application[]>('/applications', fetch).catch(() => [] as Application[]),
    api.get<Role[]>('/admin/roles', fetch).catch(() => [] as Role[]),
    api.get<Settings>('/admin/settings', fetch).catch(() => ({ id: 1, autoPromoteThreshold: 5 }) as Settings),
  ])

  return { applications, roles, settings }
}
