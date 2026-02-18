/**
 * Entry point for the Wallet Tracker API server.
 * Loads env from .env, mounts the Express app, and listens on PORT.
 */
import path from "path";
import fs from "fs";
import logger from "./src/utils/logger.js";
import dotenv from "dotenv";

// For packaged executables (pkg), look for .env in the executable's directory
// For development, use the current working directory
let envPath = path.join(process.cwd(), ".env");

// If running as a packaged executable, try the executable's directory
if (process.pkg) {
  const exeDir = path.dirname(process.execPath);
  const exeEnvPath = path.join(exeDir, ".env");
  if (fs.existsSync(exeEnvPath)) {
    envPath = exeEnvPath;
  }
}

// Try to load .env from the determined path
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  logger.info(`Loaded .env from: ${envPath}`);
} else {
  // Fallback to default dotenv behavior (current directory)
  dotenv.config();
  logger.info("No .env file found, using default dotenv behavior");
}

import app from "./src/app.js";

const port = process.env.PORT || 55001;
const bootId = `${Date.now()}-${process.pid}`;
process.env.BOOT_ID = bootId;

// Prevent the process from exiting on unhandled errors
process.on('uncaughtException', (err) => {
  logger.error(err, 'Uncaught Exception thrown');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(reason, 'Unhandled Rejection at Promise');
});

const server = app.listen(port, () => {
  logger.info(
    { port, pid: process.pid, cwd: process.cwd(), bootId },
    "Server is running"
  );
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    const errorMsg = `Port ${port} is already in use. This usually means:
1. Another backend instance is already running (check Task Manager for wallet-backend.exe or node processes)
2. The Tauri app already started the backend automatically
3. Another application is using port ${port}

To fix:
- If running the Tauri app: Close it first, then try again
- If running backend manually: Stop any other backend instances
- To find what's using the port: Run "netstat -ano | findstr :${port}" (Windows) or "lsof -i :${port}" (macOS/Linux)
- To kill the process: Use Task Manager (Windows) or kill the PID shown by netstat/lsof`;
    
    logger.error({ err, port, pid: process.pid }, "Server failed to start - port already in use");
    console.error(`\n[backend] ❌ Port ${port} is already in use!\n`);
    console.error(errorMsg);
    console.error(`\n[backend] Error details:`, err?.message || err);
  } else {
    logger.error({ err, port, pid: process.pid }, "Server failed to start");
    console.error(`[backend] listen error on port ${port}:`, err?.message || err);
  }
  process.exit(1);
});

// Keep the process alive
setInterval(() => {}, 1 << 30);
