import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

// Use a local SQLite file instead of DATABASE_URL
const workingDir = process.cwd();
const dbFile = path.join(workingDir, 'app.db');
const sqlite = new Database(dbFile);
console.log("Reading DB file from ..." + dbFile);
// Initialize Drizzle with SQLite
export const db = drizzle(sqlite, { schema });