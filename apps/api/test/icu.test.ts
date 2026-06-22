import { describe, expect, it } from 'bun:test'
import { validateIcu } from '../src/lib/icu'

describe('validateIcu', () => {
  it('accepts plain + simple placeholder', () => {
    expect(validateIcu('Hello {name}').ok).toBe(true)
  })
  it('accepts plural', () => {
    expect(validateIcu('{count, plural, one {# item} other {# items}}').ok).toBe(true)
  })
  it('rejects unbalanced braces', () => {
    expect(validateIcu('Hello {name').ok).toBe(false)
  })
})
