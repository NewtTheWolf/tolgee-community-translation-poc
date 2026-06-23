import { describe, expect, it } from 'bun:test'
import { makeMaybeAutoPromote } from '../src/lib/promotion'

describe('maybeAutoPromote', () => {
  it('promotes at threshold when no role yet', async () => {
    let granted = false
    const fn = makeMaybeAutoPromote({
      countAccepted: async () => 5,
      getThreshold: async () => 5,
      hasTranslatorRole: async () => false,
      grantTranslator: async () => {
        granted = true
      },
    })
    expect(await fn('u1', 'de')).toBe(true)
    expect(granted).toBe(true)
  })
  it('does not promote below threshold', async () => {
    const fn = makeMaybeAutoPromote({
      countAccepted: async () => 4,
      getThreshold: async () => 5,
      hasTranslatorRole: async () => false,
      grantTranslator: async () => {},
    })
    expect(await fn('u1', 'de')).toBe(false)
  })
  it('is idempotent when role already exists', async () => {
    const fn = makeMaybeAutoPromote({
      countAccepted: async () => 9,
      getThreshold: async () => 5,
      hasTranslatorRole: async () => true,
      grantTranslator: async () => {
        throw new Error('should not grant')
      },
    })
    expect(await fn('u1', 'de')).toBe(false)
  })
})
