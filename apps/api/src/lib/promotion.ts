import { and, count, eq } from 'drizzle-orm'
import { db } from '$db/index'
import { roles, settings, suggestionAttribution } from '$db/schema'
import { writeAudit } from './audit'
import { id } from './ulid'

export interface PromotionRepo {
  countAccepted(userId: string, locale: string): Promise<number>
  getThreshold(): Promise<number>
  hasTranslatorRole(userId: string, locale: string): Promise<boolean>
  grantTranslator(userId: string, locale: string): Promise<void>
}

export function makeMaybeAutoPromote(repo: PromotionRepo) {
  return async function maybeAutoPromote(userId: string, locale: string): Promise<boolean> {
    if (await repo.hasTranslatorRole(userId, locale)) return false
    const [n, threshold] = await Promise.all([repo.countAccepted(userId, locale), repo.getThreshold()])
    if (n < threshold) return false
    await repo.grantTranslator(userId, locale)
    return true
  }
}

export const promotionRepo: PromotionRepo = {
  async countAccepted(userId, locale) {
    const rows = await db
      .select({ c: count() })
      .from(suggestionAttribution)
      .where(and(eq(suggestionAttribution.authorUserId, userId), eq(suggestionAttribution.locale, locale), eq(suggestionAttribution.status, 'accepted')))
    return rows[0]?.c ?? 0
  },
  async getThreshold() {
    const rows = await db.select({ t: settings.autoPromoteThreshold }).from(settings).where(eq(settings.id, 1))
    return rows[0]?.t ?? 5
  },
  async hasTranslatorRole(userId, locale) {
    const rows = await db.select({ id: roles.id }).from(roles).where(and(eq(roles.userId, userId), eq(roles.locale, locale), eq(roles.role, 'translator')))
    return rows.length > 0
  },
  async grantTranslator(userId, locale) {
    await db.insert(roles).values({ id: id(), userId, locale, role: 'translator', grantedBy: null }).onConflictDoNothing()
    await writeAudit({ actorUserId: null, action: 'role.auto_promote', targetType: 'user', targetId: userId, meta: { locale, role: 'translator' } })
  },
}

export const maybeAutoPromote = makeMaybeAutoPromote(promotionRepo)
