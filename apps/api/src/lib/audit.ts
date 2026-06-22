import { db } from '$db/index'
import { auditLog } from '$db/schema'
import { id } from './ulid'

export async function writeAudit(e: {
  actorUserId?: string | null
  action: string
  targetType: string
  targetId: string
  meta?: unknown
}): Promise<void> {
  await db.insert(auditLog).values({
    id: id(),
    actorUserId: e.actorUserId ?? null,
    action: e.action,
    targetType: e.targetType,
    targetId: e.targetId,
    meta: (e.meta ?? {}) as object,
  })
}
