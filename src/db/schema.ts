import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, } from 'drizzle-orm/sqlite-core';

export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').unique().notNull(),
  emailVerified: integer('emailVerified', { mode: 'boolean' }).default(false),
  image: text('image'),
  createdAt: text('created_at').default(sql`(datetime('now'))`),
  updatedAt: text('updated_at').default(sql`(datetime('now'))`),
});

// better-auth required tables
export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  expiresAt: integer('expiresAt').notNull(),
  token: text('token').notNull(),
  createdAt: text('createdAt').default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt').default(sql`(datetime('now'))`),
  ipAddress: text('ipAddress'),
  userAgent: text('userAgent'),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  idToken: text('idToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt'),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt'),
  scope: text('scope'),
  password: text('password'),
  createdAt: text('createdAt').default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt').default(sql`(datetime('now'))`),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt').notNull(),
  createdAt: text('createdAt').default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt').default(sql`(datetime('now'))`),
});

export type InsertUser = typeof user.$inferInsert;
export type SelectUser = typeof user.$inferSelect;

export const schema = {
  user,
  session,
  account,
  verification,
};