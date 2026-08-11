import { sql } from "drizzle-orm";
import { pgTable, text, serial, boolean, timestamp, integer, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const parameters = pgTable("parameters", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  value: text("value").notNull(),
  type: text("type").notNull(), // string, int, boolean, dateTime
  writable: boolean("writable").default(false).notNull(),
  notification: integer("notification").default(0).notNull(), // 0: Off, 1: Passive, 2: Active
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(), // acsUrl, username, password, interval, connectionRequestUsername, connectionRequestPassword
  value: text("value").notNull(),
});

export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  type: text("type").notNull(), // INFO, ERROR, SOAP_IN, SOAP_OUT
  message: text("message").notNull(),
  details: text("details"), // Full XML or error stack
});

export const transfers = pgTable("transfers", {
  id: serial("id").primaryKey(),
  commandKey: text("command_key").notNull(),
  fileType: text("file_type").notNull(),
  url: text("url").notNull(),
  username: text("username"),
  password: text("password"),
  fileSize: integer("file_size"),
  targetFileName: text("target_file_name"),
  status: text("status").notNull(), // PENDING, IN_PROGRESS, COMPLETED, FAILED
  startTime: timestamp("start_time").defaultNow(),
  completeTime: timestamp("complete_time"),
  faultCode: text("fault_code"),
  faultString: text("fault_string"),
  isUpload: boolean("is_upload").notNull(),
});

// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertParameterSchema = createInsertSchema(parameters).omit({ id: true, updatedAt: true });
export const insertSettingSchema = createInsertSchema(settings);
export const insertLogSchema = createInsertSchema(logs).omit({ id: true, timestamp: true });
export const insertTransferSchema = createInsertSchema(transfers).omit({ id: true, startTime: true, completeTime: true });

export type Parameter = typeof parameters.$inferSelect;
export type InsertParameter = z.infer<typeof insertParameterSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;
export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;
export type Transfer = typeof transfers.$inferSelect;
export type InsertTransfer = z.infer<typeof insertTransferSchema>;
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
