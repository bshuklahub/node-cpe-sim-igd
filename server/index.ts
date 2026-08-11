import { parseArgs } from 'node:util';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { getLogger } from './util/logutil';
import session from "express-session";
// Configure once at app startup
const LOGGER = getLogger('MAINAPP');
const args = process.argv.slice(2);

/*
process.env.DEFAULT_ACS_URL = values.acsUrl;
process.env.DEFAULT_CPE_SERIALNUMBER = values.serialNumber;
process.env.DEFAULT_CPE_OUI = values.oui;
process.env.DEFAULT_CPE_PRODUCTCLASS = values.productClass;
process.env.PERIODIC_SEC = values.periodicInformInterval;
process.env.SKIP_SEED = values.skipSeed;
process.env.SOCKS_PROXY = values.socksProxy;
*/
//const nametest = options.productClass;
LOGGER.info('Application starting with the following parameters:');

// Log the values to verify
LOGGER.info(`Using ACS URL: ${process.env.DEFAULT_ACS_URL}`);
LOGGER.info(`Using CPE Serial Number: ${process.env.DEFAULT_CPE_SERIALNUMBER}`);
LOGGER.info(`Using CPE OUI: ${process.env.DEFAULT_CPE_OUI}`);
LOGGER.info(`Using CPE Product Class: ${process.env.DEFAULT_CPE_PRODUCTCLASS}`);
LOGGER.info(`Using Periodic Inform Interval (sec): ${process.env.PERIODIC_SEC}`);
// End

// Log messages
LOGGER.info('Application started');
//LOGGER.debug('Debug information', { user: 'john' });
//LOGGER.error('Something went wrong', new Error('Test error'));

const app = express();
const httpServer = createServer(app);
app.use(express.json());
// Basic Auth Middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET || "cpe-simulator-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
const AUTH_USER = process.env.BASIC_AUTH_USER || "admin";
const AUTH_PASS = process.env.BASIC_AUTH_PASS || "admin";

function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Skip auth for ACS endpoints (they may have their own auth)
  if (req.path.startsWith('/api/acs')) {
    return next();
  }
  if (req.path.startsWith('/download')) {
    return next();
  }
  if (req.path.startsWith('/upload')) {
    return next();
  }
  if (req.path.startsWith('/connectionRequest')) {
    return next();
  }
  // Skip auth for auth endpoints
  if (req.path.startsWith('/api/auth')) {
    return next();
  }
  // Skip auth check for non-API routes (handled by frontend)
  if (!req.path.startsWith('/api/')) {
    return next();
  }

  if (req.session.authenticated) {
    return next();
  }
  return res.status(401).json({ message: "Not authenticated" });
}

app.use(express.urlencoded({ extended: true }));

// Auth routes
app.post("/api/auth/login", (req, res) => {
  LOGGER.info("Login attempt received");
  LOGGER.info(`Request body: ${JSON.stringify(req.body)}`);
  const { username, password } = req.body;
  LOGGER.info(`Username: ${username}`);
  LOGGER.info(`Password: ${password ? '******' : 'not provided'}`);

  if (username === AUTH_USER && password === AUTH_PASS) {
    req.session.authenticated = true;
    req.session.username = username;
    return res.json({ success: true });
  }
  LOGGER.warn("OOps Invalid credentials Entered!username: " + username);
  return res.status(401).json({ message: "Invalid credentials Entered" });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ message: "Failed to logout" });
    }
    res.clearCookie("connect.sid");
    res.redirect('/login');
    //return res.json({ success: true });
  });
});

app.get("/api/auth/session", (req, res) => {
  if (req.session.authenticated) {
    return res.json({ authenticated: true, username: req.session.username });
  }
  return res.json({ authenticated: false });
});

app.use(requireAuth);
declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  //console.log(`${formattedTime} [${source}] ${message}`);
  console.log(`${formattedTime} [${source}] `);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
