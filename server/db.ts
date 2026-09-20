import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
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

// Self-provision the schema when the database is empty, so the app can start
// against a fresh volume (e.g. the container image). This runs ONLY when none
// of the app tables exist, so databases created via `npm run db:push` are
// never replayed and drizzle's migration journal is left untouched.
const appTables = sqlite
  .prepare(
    "SELECT count(*) AS n FROM sqlite_master WHERE type = 'table' AND name IN ('parameters','settings','logs','users','transfers','download_diagnostics','upload_diagnostics','test_history')",
  )
  .get() as { n: number };

if (appTables.n === 0) {
  console.log("Empty database detected - applying schema migrations...");
  migrate(db, { migrationsFolder: path.join(workingDir, "migrations") });
}