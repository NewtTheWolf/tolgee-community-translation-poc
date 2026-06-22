import { describe, expect, it } from 'bun:test'
import { effectiveRoleFor, roleSatisfies } from '../src/lib/roles'

describe('effectiveRoleFor', () => {
  const r = (locale: string, role: 'translator' | 'reviewer') => ({ locale, role })

  it('admin overrides every locale', () => {
    expect(effectiveRoleFor({ isAdmin: true }, [], 'de')).toBe('admin')
  })
  it('reviewer for de but nothing for it', () => {
    const roles = [r('de', 'reviewer')]
    expect(effectiveRoleFor({ isAdmin: false }, roles, 'de')).toBe('reviewer')
    expect(effectiveRoleFor({ isAdmin: false }, roles, 'it')).toBeNull()
  })
  it('reviewer satisfies translator requirement', () => {
    expect(roleSatisfies('reviewer', 'translator')).toBe(true)
    expect(roleSatisfies('translator', 'reviewer')).toBe(false)
  })
})
