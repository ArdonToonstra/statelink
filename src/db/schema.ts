import { pgTable, serial, text, integer, boolean, timestamp, varchar, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums
export const intervalModeEnum = pgEnum('interval_mode', ['random', 'fixed'])
export const groupRoleEnum = pgEnum('group_role', ['owner', 'member'])

// ============================================
// Better Auth required tables
// ============================================
export const users = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),

  // App-specific fields
  displayName: text('display_name'),
  groupId: text('group_id').references(() => groups.id), // DEPRECATED: kept for migration, use userGroups
  activeGroupId: text('active_group_id').references(() => groups.id), // Currently focused group
  timezone: text('timezone').default('UTC'), // User's timezone for quiet hours calculation
  customActivityIds: text('custom_activity_ids').array(), // User's selected activity tag IDs
  shareCheckInsGlobally: boolean('share_check_ins_globally').default(false), // When true, check-ins visible to all groups
})

export const sessions = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
})

export const accounts = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const verifications = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================
// Groups table
// ============================================
export const groups = pgTable('groups', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  inviteCode: varchar('invite_code', { length: 8 }).notNull().unique(),
  inviteCodeCreated: timestamp('invite_code_created').defaultNow(),
  frequency: integer('frequency').notNull().default(7), // Pings per week (1 per day)
  intervalMode: intervalModeEnum('interval_mode').notNull().default('random'),
  quietHoursStart: integer('quiet_hours_start'), // Hour 0-23
  quietHoursEnd: integer('quiet_hours_end'), // Hour 0-23
  vibeAverageHours: integer('vibe_average_hours').notNull().default(24), // Hours to average vibe score (default 24)
  ownerId: text('owner_id').notNull(),
  lastPingTime: timestamp('last_ping_time'), // When the last ping was sent
  nextPingTime: timestamp('next_ping_time'), // When the next ping should be sent
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================
// User-Groups junction table (many-to-many)
// ============================================
export const userGroups = pgTable('user_groups', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  role: groupRoleEnum('role').notNull().default('member'), // 'owner' or 'member'
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, (table) => ({
  userGroupUnique: uniqueIndex('user_group_unique_idx').on(table.userId, table.groupId),
}))

// ============================================
// Check-ins table
// ============================================
export const checkIns = pgTable('check_ins', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  groupId: text('group_id').references(() => groups.id, { onDelete: 'set null' }),
  vibeScore: integer('vibe_score').notNull(),
  tags: text('tags').array(), // Store as array of strings
  customNote: text('custom_note'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================
// Push Subscriptions table
// ============================================
export const pushSubscriptions = pgTable('push_subscriptions', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'cascade' }), // Auto-cleanup when session expires/revoked
  endpoint: text('endpoint').notNull(),
  p256dh: text('p256dh').notNull(),
  auth: text('auth').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================
// Relations
// ============================================
export const usersRelations = relations(users, ({ one, many }) => ({
  // Legacy single group relation (deprecated, use userGroups)
  group: one(groups, {
    fields: [users.groupId],
    references: [groups.id],
  }),
  // Active group relation
  activeGroup: one(groups, {
    fields: [users.activeGroupId],
    references: [groups.id],
  }),
  // Many-to-many through userGroups
  userGroups: many(userGroups),
  checkIns: many(checkIns),
  pushSubscriptions: many(pushSubscriptions),
}))

export const groupsRelations = relations(groups, ({ one, many }) => ({
  owner: one(users, {
    fields: [groups.ownerId],
    references: [users.id],
  }),
  // Many-to-many through userGroups
  userGroups: many(userGroups),
  checkIns: many(checkIns),
}))

export const userGroupsRelations = relations(userGroups, ({ one }) => ({
  user: one(users, {
    fields: [userGroups.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [userGroups.groupId],
    references: [groups.id],
  }),
}))

export const checkInsRelations = relations(checkIns, ({ one }) => ({
  user: one(users, {
    fields: [checkIns.userId],
    references: [users.id],
  }),
  group: one(groups, {
    fields: [checkIns.groupId],
    references: [groups.id],
  }),
}))

export const pushSubscriptionsRelations = relations(pushSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [pushSubscriptions.userId],
    references: [users.id],
  }),
  session: one(sessions, {
    fields: [pushSubscriptions.sessionId],
    references: [sessions.id],
  }),
}))

// ============================================
// Types
// ============================================
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Group = typeof groups.$inferSelect
export type NewGroup = typeof groups.$inferInsert
export type UserGroup = typeof userGroups.$inferSelect
export type NewUserGroup = typeof userGroups.$inferInsert
export type CheckIn = typeof checkIns.$inferSelect
export type NewCheckIn = typeof checkIns.$inferInsert
export type PushSubscription = typeof pushSubscriptions.$inferSelect
export type NewPushSubscription = typeof pushSubscriptions.$inferInsert
