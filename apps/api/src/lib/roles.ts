export type EffectiveRole = 'admin' | 'reviewer' | 'translator'

const RANK: Record<EffectiveRole, number> = { translator: 1, reviewer: 2, admin: 3 }

export function effectiveRoleFor(
  user: { isAdmin: boolean },
  userRoles: { locale: string; role: 'translator' | 'reviewer' }[],
  locale: string,
): EffectiveRole | null {
  if (user.isAdmin) return 'admin'
  const here = userRoles.filter((r) => r.locale === locale)
  if (here.some((r) => r.role === 'reviewer')) return 'reviewer'
  if (here.some((r) => r.role === 'translator')) return 'translator'
  return null
}

export function roleSatisfies(have: EffectiveRole | null, need: EffectiveRole): boolean {
  if (!have) return false
  return RANK[have] >= RANK[need]
}
