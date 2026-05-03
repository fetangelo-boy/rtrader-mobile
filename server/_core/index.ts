import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import process from "process";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerAdminRoutes } from "../routers/admin";
import { registerRequestRoutes } from "../routers/requests";
import { initializeTelegramBot, shutdownTelegramBot } from "../routers/telegram-bot";
import { appRouter } from "../routers";
import { createContext } from "./context";
import type { Server } from "http";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.log('[DB] No DATABASE_URL, skipping migrations');
    return;
  }
  try {
    const { drizzle } = await import('drizzle-orm/mysql2');
    const { migrate } = await import('drizzle-orm/mysql2/migrator');
    const mysql = await import('mysql2/promise');
    const connection = await (mysql as any).createConnection(process.env.DATABASE_URL);
    const db = drizzle(connection);
    await migrate(db, { migrationsFolder: './drizzle' });
    await connection.end();
    console.log('[DB] Migrations applied successfully');
  } catch (err) {
    console.error('[DB] Migration error (non-fatal):', err);
  }
}

async function startServer() {
  // Run DB migrations on startup
  await runMigrations();

  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Admin-Key",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);
  registerAdminRoutes(app);
  registerRequestRoutes(app);

  // Telegram bot uses long polling (no webhook endpoint needed)

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
    
    // Initialize Telegram bot — only when not explicitly disabled
    // Set DISABLE_BOT=true in local dev to avoid 409 conflicts when Railway is running
    if (process.env.DISABLE_BOT !== 'true') {
      initializeTelegramBot();
    } else {
      console.log('[Bot] Disabled via DISABLE_BOT=true (Railway handles bot in production)');
    }
  });
  
  // Cleanup on shutdown
  process.on('SIGINT', () => {
    console.log('[api] Shutting down...');
    shutdownTelegramBot();
    process.exit(0);
  });
}

// Prevent server crash on unhandled promise rejections (e.g. from bot handlers)
process.on('unhandledRejection', (reason, promise) => {
  console.error('[api] Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Do NOT exit — keep the server running
});

// Prevent server crash on uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[api] Uncaught Exception:', err);
  // Do NOT exit — keep the server running
});

startServer().catch(console.error);
