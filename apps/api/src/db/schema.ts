import { sql } from 'drizzle-orm'
import { bigint, boolean, integer, jsonb, pgEnum, pgTable, text, timestamp, unique } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['translator', 'reviewer'])
export const applicationStatusEnum = pgEnum('application_status', ['pending', 'approved', 'rejected'])
export const attributionStatusEnum = pgEnum('attribution_status', ['pending', 'accepted', 'declined'])

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  // Tolgee/GitHub numeric IDs exceed int4 range — use bigint.
  githubId: bigint('github_id', { mode: 'number' }).notNull().unique(),
  login: text('login').notNull(),
  name: text('name'),
  avatarUrl: text('avatar_url'),
  email: text('email'),
  isAdmin: boolean('is_admin').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
})

export const roles = pgTable(
  'roles',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    locale: text('locale').notNull(),
    role: roleEnum('role').notNull(),
    grantedBy: text('granted_by').references(() => users.id),
    grantedAt: timestamp('granted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('roles_user_locale_role').on(t.userId, t.locale, t.role)],
)

export const applications = pgTable('applications', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  locale: text('locale').notNull(),
  requestedRole: roleEnum('requested_role').notNull(),
  message: text('message'),
  status: applicationStatusEnum('status').notNull().default('pending'),
  reviewedBy: text('reviewed_by').references(() => users.id),
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const suggestionAttribution = pgTable('suggestion_attribution', {
  id: text('id').primaryKey(),
  tolgeeSuggestionId: bigint('tolgee_suggestion_id', { mode: 'number' }).notNull().unique(),
  keyId: bigint('key_id', { mode: 'number' }).notNull(),
  locale: text('locale').notNull(),
  text: text('text'),
  languageId: bigint('language_id', { mode: 'number' }),
  authorUserId: text('author_user_id').references(() => users.id),
  anonId: text('anon_id'),
  status: attributionStatusEnum('status').notNull().default('pending'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  resolvedBy: text('resolved_by').references(() => users.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
})

export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  actorUserId: text('actor_user_id').references(() => users.id),
  action: text('action').notNull(),
  targetType: text('target_type').notNull(),
  targetId: text('target_id').notNull(),
  meta: jsonb('meta').notNull().default(sql`'{}'::jsonb`),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const settings = pgTable('settings', {
  id: integer('id').primaryKey().default(1),
  autoPromoteThreshold: integer('auto_promote_threshold').notNull().default(5),
})
