import { relations } from "drizzle-orm"
import {
  boolean,
  doublePrecision,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core"

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("emailVerified").notNull(),
  image: text("image"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
})

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
  ipAddress: text("ipAddress"),
  userAgent: text("userAgent"),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
})

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("accountId").notNull(),
  providerId: text("providerId").notNull(),
  userId: text("userId")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  idToken: text("idToken"),
  accessTokenExpiresAt: timestamp("accessTokenExpiresAt", { withTimezone: true, mode: "date" }),
  refreshTokenExpiresAt: timestamp("refreshTokenExpiresAt", { withTimezone: true, mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }).notNull(),
})

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expiresAt", { withTimezone: true, mode: "date" }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true, mode: "date" }),
  updatedAt: timestamp("updatedAt", { withTimezone: true, mode: "date" }),
})

export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  weatherLat: doublePrecision("weather_lat"),
  weatherLon: doublePrecision("weather_lon"),
  weatherTimezone: text("weather_timezone"),
  weatherLocation: text("weather_location"),
  googleCalendarIds: jsonb("google_calendar_ids").$type<string[]>(),
  googleCalendarTimezone: text("google_calendar_timezone"),
  homeAssistantEntityIds: jsonb("home_assistant_entity_ids").$type<string[]>(),
  nightModeEnabled: boolean("night_mode_enabled"),
  nightModeStart: text("night_mode_start"),
  nightModeEnd: text("night_mode_end"),
  productivityAlertPreference: text("productivity_alert_preference"),
  productivityNotificationEnabled: boolean("productivity_notification_enabled"),
  pomodoroFocusSeconds: integer("pomodoro_focus_seconds"),
  pomodoroShortBreakSeconds: integer("pomodoro_short_break_seconds"),
  pomodoroLongBreakSeconds: integer("pomodoro_long_break_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
})

export const userIntegrationSecrets = pgTable(
  "user_integration_secrets",
  {
    userId: text("user_id").notNull(),
    provider: text("provider").notNull(),
    key: text("key").notNull(),
    encryptedValue: text("encrypted_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.provider, table.key],
    }),
  ],
)

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
}))

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}))

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}))
