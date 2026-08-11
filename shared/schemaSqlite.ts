import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const diagnosticsStateEnum = z.enum([
  "None",
  "Requested",
  "Completed",
  "Error_InitConnectionFailed",
  "Error_NoResponse",
  "Error_TransferFailed",
  "Error_PasswordRequestFailed",
  "Error_LoginFailed",
  "Error_NoTransferMode",
  "Error_NoPASV",
  "Error_IncorrectSize",
  "Error_Timeout",
  "Error_Other"
]);
// PARAMETERS TABLE
export const parameters = sqliteTable("parameters", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  value: text("value").notNull(),
  type: text("type").notNull(), // string, int, boolean, dateTime
  writable: integer("writable", { mode: "boolean" }).notNull().default(true),
  notification: integer("notification").default(0).notNull(), // 0: Off, 1: Passive, 2: Active
  updatedAt: integer("updatedAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// SETTINGS TABLE
export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// LOGS TABLE
export const logs = sqliteTable("logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  timestamp: integer("timestamp", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  type: text("type").notNull(), // INFO, ERROR, SOAP_IN, SOAP_OUT
  message: text("message").notNull(),
  details: text("details"),
});

// TRANSFERS TABLE
export const transfers = sqliteTable("transfers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  commandKey: text("command_key").notNull(),
  fileType: text("file_type").notNull(),
  url: text("url").notNull(),
  username: text("username"),
  password: text("password"),
  fileSize: integer("file_size"),
  targetFileName: text("target_file_name"),
  status: text("status").notNull(), // PENDING, IN_PROGRESS, COMPLETED, FAILED
  startTime: integer("startTime", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completeTime: integer("completeTime", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  faultCode: text("fault_code"),
  faultString: text("fault_string"),
  isUpload: integer("isUpload", { mode: "boolean" }).notNull().default(true),
});

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }), // UUID generated in app code
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: integer("createdAt", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),

});

export type DiagnosticsState = z.infer<typeof diagnosticsStateEnum>;

export const downloadDiagnostics = sqliteTable("download_diagnostics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  diagnosticsState: text("diagnostics_state").notNull().default("None"),
  interface: text("interface"),
  downloadUrl: text("download_url").notNull(),
  dscp: integer("dscp").default(0),
  ethernetPriority: integer("ethernet_priority").default(0),
  protocolVersion: text("protocol_version").default("Any"),
  numberOfConnections: integer("number_of_connections").default(1),
  enablePerConnectionResults: integer("enable_per_connection_results", { mode: "boolean" }).default(false),
  timeBasedTestDuration: integer("time_based_test_duration").default(0),

  // Results - Using integer mode: timestamp for JS Date object compatibility
  romTime: integer("rom_time", { mode: "timestamp" }),
  bomTime: integer("bom_time", { mode: "timestamp" }),
  eomTime: integer("eom_time", { mode: "timestamp" }),
  testBytesReceived: integer("test_bytes_received").default(0),
  totalBytesReceived: integer("total_bytes_received").default(0),
  tcpOpenRequestTime: integer("tcp_open_request_time", { mode: "timestamp" }),
  tcpOpenResponseTime: integer("tcp_open_response_time", { mode: "timestamp" }),
});

export const uploadDiagnostics = sqliteTable("upload_diagnostics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  diagnosticsState: text("diagnostics_state").notNull().default("None"),
  interface: text("interface"),
  uploadUrl: text("upload_url").notNull(),
  dscp: integer("dscp").default(0),
  ethernetPriority: integer("ethernet_priority").default(0),
  testFileLength: integer("test_file_length").notNull(),
  protocolVersion: text("protocol_version").default("Any"),
  numberOfConnections: integer("number_of_connections").default(1),
  enablePerConnectionResults: integer("enable_per_connection_results", { mode: "boolean" }).default(false),
  timeBasedTestDuration: integer("time_based_test_duration").default(0),

  // Results
  romTime: integer("rom_time", { mode: "timestamp" }),
  bomTime: integer("bom_time", { mode: "timestamp" }),
  eomTime: integer("eom_time", { mode: "timestamp" }),
  testBytesSent: integer("test_bytes_sent").default(0),
  totalBytesReceived: integer("total_bytes_received").default(0),
  totalBytesSent: integer("total_bytes_sent").default(0),
  tcpOpenRequestTime: integer("tcp_open_request_time", { mode: "timestamp" }),
  tcpOpenResponseTime: integer("tcp_open_response_time", { mode: "timestamp" }),
});

export const testHistory = sqliteTable("test_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  testType: text("test_type").notNull(),
  startTime: integer("start_time", { mode: "timestamp" }).notNull(),
  endTime: integer("end_time", { mode: "timestamp" }),
  status: text("status").notNull(),
  url: text("url").notNull(),
  throughputMbps: integer("throughput_mbps"),
  bytesTransferred: integer("bytes_transferred"),
});

// Zod Schemas (remains the same logic)
export const insertDownloadSchema = createInsertSchema(downloadDiagnostics).omit({
  id: true,
  romTime: true, bomTime: true, eomTime: true,
  testBytesReceived: true, totalBytesReceived: true,
  tcpOpenRequestTime: true, tcpOpenResponseTime: true
});

export const insertUploadSchema = createInsertSchema(uploadDiagnostics).omit({
  id: true,
  romTime: true, bomTime: true, eomTime: true,
  testBytesSent: true, totalBytesReceived: true, totalBytesSent: true,
  tcpOpenRequestTime: true, tcpOpenResponseTime: true
});

// ZOD SCHEMAS
export const insertParameterSchema = createInsertSchema(parameters).omit({
  id: true,
  updatedAt: true,
});

export const insertSettingSchema = createInsertSchema(settings);

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true,
});

export const insertTransferSchema = createInsertSchema(transfers).omit({
  id: true,
  startTime: true,
  completeTime: true,
});

// TYPES
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

export type DownloadDiagnostics = typeof downloadDiagnostics.$inferSelect;
export type InsertDownloadDiagnostics = z.infer<typeof insertDownloadSchema>;

export type UploadDiagnostics = typeof uploadDiagnostics.$inferSelect;
export type InsertUploadDiagnostics = z.infer<typeof insertUploadSchema>;

export type TestHistory = typeof testHistory.$inferSelect;