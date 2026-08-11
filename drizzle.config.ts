import { defineConfig } from "drizzle-kit";
///sqllite

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: "./app.db", // SQLite database file
  },
});


///postgresql
/*

if(!process.env.DATABASE_URL){
  process.env.DATABASE_URL='postgresql://postgres:bshukla@localhost:5432/mydb'
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
*/
