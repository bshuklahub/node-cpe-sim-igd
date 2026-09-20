import express, { type Express } from "express";
import fs from "fs";
import path from "path";

// Locations to look for the built client, in order:
// 1. Module-relative "public" - works for the CJS bundle (dist/index.cjs =>
//    `<dist>/public`, used by `npm start` and the container image).
// 2. Cwd-relative "dist/public" - works for ESM runs (tsx with
//    NODE_ENV=production). `npm run dev` never calls serveStatic (Vite serves).
//
// Note: do NOT use import.meta.url here - esbuild's CJS output does not map it
// to a usable value, so the module fails to load in dist/index.cjs.
const publicCandidates = [
  ...(typeof __dirname !== "undefined" ? [path.resolve(__dirname, "public")] : []),
  path.resolve(process.cwd(), "dist", "public"),
];

export function serveStatic(app: Express) {
  const distPath = publicCandidates.find((d) => fs.existsSync(d));
  if (!distPath) {
    throw new Error(
      `Could not find the build directory (searched: ${publicCandidates.join(
        ", ",
      )}), make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}