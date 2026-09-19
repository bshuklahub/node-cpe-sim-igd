import { db } from "./db";
import { eq, gt, desc, like, ilike, sql, or, and, ne, notLike } from "drizzle-orm";
import {
  parameters, settings, logs, transfers,
  type Parameter, type InsertParameter,
  type Setting, type InsertSetting,
  type Log, type InsertLog, type InsertTransfer, type Transfer
} from "@shared/schema";
import { users, type User, type UpsertUser } from "@shared/schema";
//WHenever any table is added you must execute
//npx drizzle-kit generate 
/*TR 143 exports */
import {
  downloadDiagnostics,
  uploadDiagnostics,
  testHistory,
  type DownloadDiagnostics,
  type UploadDiagnostics,
  type InsertDownloadDiagnostics,
  type InsertUploadDiagnostics,
  type TestHistory,
  type DiagnosticsState
} from "@shared/schema";
import { getLogger } from "log4js";
/* End Diagnostics */
export interface IStorage {
  // Parameters
  getParameters(): Promise<Parameter[]>;
  getParameter(name: string): Promise<Parameter | undefined>;
  updateParameter(name: string, value: string, notification?: number): Promise<Parameter>;
  getMatchingParameters(name: string): Promise<Parameter[]>;
  createParameter(param: InsertParameter): Promise<Parameter>;
  resetParameters(): Promise<void>;

  // Settings
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  updateSetting(key: string, value: string): Promise<Setting>;

  // Logs
  getLogs(limit?: number): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;
  clearLogs(): Promise<void>;
  // Transfers
  getTransfers(): Promise<Transfer[]>;
  getTransfer(id: number): Promise<Transfer | undefined>;
  createTransfer(transfer: InsertTransfer): Promise<Transfer>;
  updateTransfer(id: number, updates: Partial<Transfer>): Promise<Transfer>;
  // Auth (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  /*  TR143 Code */
  // Download
  getDownloadDiagnostics(): Promise<DownloadDiagnostics>;
  updateDownloadDiagnostics(data: Partial<InsertDownloadDiagnostics> & { diagnosticsState?: DiagnosticsState }): Promise<DownloadDiagnostics>;
  updateDownloadProgress(id: number, progress: Partial<DownloadDiagnostics>): Promise<void>;

  // Upload
  getUploadDiagnostics(): Promise<UploadDiagnostics>;
  updateUploadDiagnostics(data: Partial<InsertUploadDiagnostics> & { diagnosticsState?: DiagnosticsState }): Promise<UploadDiagnostics>;
  updateUploadProgress(id: number, progress: Partial<UploadDiagnostics>): Promise<void>;

  // History
  addTestHistory(entry: Omit<TestHistory, "id">): Promise<TestHistory>;
  getTestHistory(): Promise<TestHistory[]>;

  // Initialization
}


export class DatabaseStorage implements IStorage {
  async init() {
    // Ensure singletons exist
    const dl = await db.select().from(downloadDiagnostics).limit(1);
    if (dl.length === 0) {
      await db.insert(downloadDiagnostics).values({
        downloadUrl: "",
        diagnosticsState: "None"
      });
    }

    const ul = await db.select().from(uploadDiagnostics).limit(1);
    if (ul.length === 0) {
      await db.insert(uploadDiagnostics).values({
        uploadUrl: "",
        testFileLength: 1000000, // 1MB default
        diagnosticsState: "None"
      });
    }
  }
  // Auth
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, parseInt(id)));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: userData,
      })
      .returning();
    return user;
  }

  // Parameters
  async getParameters(limit: number = 5000): Promise<Parameter[]> {
    return await db.select().from(parameters).orderBy(parameters.name).limit(limit);;
  }

  // Parameters
  async getParametersNotifications(limit: number = 5000): Promise<Parameter[]> {
    return await db.select().from(parameters).where(gt(parameters.notification, 0)).orderBy(parameters.name).limit(limit);;
  }

  // Parameters
  async getMatchingParameters(name: string): Promise<Parameter[]> {
    console.log("getMatchingParameters-->" + name);
    return await db.select().from(parameters).where(
      and(like(parameters.name, `${name}%`),
        notLike(parameters.name, "%."))).
      orderBy(parameters.name).limit(5000);
  }

  async getParameter(name: string): Promise<Parameter | undefined> {
    const [param] = await db.select().from(parameters).where(
      and(
        eq(parameters.name, name)
      )
    );

    return param;
  }


  /**
  * Fetches only the direct children of a given path.
  * Example: 'Device' returns 'Device.Model' but not 'Device.WiFi.Status'
  */
  async getMatchingParameterParentOnly(name: string): Promise<Parameter[]> {
    const cleanName = name.endsWith('.') ? name.slice(0, -1) : name;
    console.log("getMatchingParameterParentOnly-->" + cleanName);
    return await db
      .select()
      .from(parameters)
      .where(
        and(
          like(parameters.name, `${cleanName}.%`),
          notLike(parameters.name, `${cleanName}.%._%`)
        )
      );
  }
  async updateParameter(name: string, valuePassed: string, notification?: number): Promise<Parameter> {
    const value = String(valuePassed);
    const [updated] = await db
      .update(parameters)
      .set({ value, notification, updatedAt: new Date() })
      .where(eq(parameters.name, name))
      .returning();

    if (!updated) {
      throw new Error(`Parameter ${name} not found`);
    }
    return updated;
  }

  async createParameter(param: InsertParameter): Promise<Parameter> {
    console.log(JSON.stringify(param));
    const [created] = await db.insert(parameters).values(param).returning();
    return created;
  }

  async resetParameters(): Promise<void> {
    // Logic to reset to defaults would go here, or handled by seeding. 
    // For now, we might just re-seed in the service layer.
    await db.delete(parameters);
  }


  // Settings
  async getSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async updateSetting(key: string, value: string): Promise<Setting> {
    const [result] = await db
      .insert(settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: settings.key, // Requires a unique constraint or primary key on 'key'
        set: { value },
      })
      .returning();

    return result;

  }

  // Logs
  async getLogs(limit: number = 50): Promise<Log[]> {
    //return await db.select().from(logs).orderBy(desc(logs.timestamp)).limit(limit);
    return await db.select().from(logs).orderBy(desc(logs.id)).limit(limit);
  }

  async createLog(log: InsertLog): Promise<Log> {
    const [created] = await db.insert(logs).values(log).returning();
    console.log(" createLog....." + created);
    return created;
  }

  async clearLogs(): Promise<void> {
    await db.delete(logs);
  }

  // Transfers
  async getTransfers(): Promise<Transfer[]> {
    return await db.select().from(transfers).orderBy(desc(transfers.startTime));
  }

  async getTransfer(id: number): Promise<Transfer | undefined> {
    const [transfer] = await db.select().from(transfers).where(eq(transfers.id, id));
    return transfer;
  }

  async createTransfer(transfer: InsertTransfer): Promise<Transfer> {
    const [created] = await db.insert(transfers).values(transfer).returning();
    return created;
  }

  async updateTransfer(id: number, updates: Partial<Transfer>): Promise<Transfer> {
    const [updated] = await db
      .update(transfers)
      .set(updates)
      .where(eq(transfers.id, id))
      .returning();
    if (!updated) throw new Error(`Transfer ${id} not found`);
    return updated;
  }
  /* TR143 Storage Methods */
  async getDownloadDiagnostics(): Promise<DownloadDiagnostics> {
    const [row] = await db.select().from(downloadDiagnostics).limit(1);
    return row;
  }

  async updateDownloadDiagnostics(data: Partial<InsertDownloadDiagnostics> & { diagnosticsState?: DiagnosticsState }): Promise<DownloadDiagnostics> {
    console.log("updateDownloadDiagnostics data...." + JSON.stringify(data));
    const [updated] = await db.update(downloadDiagnostics)
      .set(data)
      .where(eq(downloadDiagnostics.id, 1)) // Singleton
      .returning();
    return updated;
  }

  async updateDownloadProgress(id: number, progress: Partial<DownloadDiagnostics>): Promise<void> {
    await db.update(downloadDiagnostics)
      .set(progress)
      .where(eq(downloadDiagnostics.id, id));
  }

  async getUploadDiagnostics(): Promise<UploadDiagnostics> {
    const [row] = await db.select().from(uploadDiagnostics).limit(1);
    return row;
  }

  async updateUploadDiagnostics(data: Partial<InsertUploadDiagnostics> & { diagnosticsState?: DiagnosticsState }): Promise<UploadDiagnostics> {
    const [updated] = await db.update(uploadDiagnostics)
      .set(data)
      .where(eq(uploadDiagnostics.id, 1)) // Singleton
      .returning();
    return updated;
  }

  async updateUploadProgress(id: number, progress: Partial<UploadDiagnostics>): Promise<void> {
    await db.update(uploadDiagnostics)
      .set(progress)
      .where(eq(uploadDiagnostics.id, id));
  }

  async addTestHistory(entry: Omit<TestHistory, "id">): Promise<TestHistory> {
    const [row] = await db.insert(testHistory).values(entry).returning();
    return row;
  }

  async getTestHistory(): Promise<TestHistory[]> {
    return await db.select().from(testHistory).orderBy(desc(testHistory.startTime));
  }
}

export const storage = new DatabaseStorage();
// Export authStorage for Replit Auth compatibility
export const authStorage = storage;
