/**
 * Entry point for the Wallet Tracker API server.
 * Loads env from .env, mounts the Express app, and listens on PORT.
 */
import path from "path";
import fs from "fs";
import logger from "./src/utils/logger.js";
import dotenv from "dotenv";

// Load .env from multiple possible locations
// Priority: env vars already set (from Tauri) > .env file in various locations
// dotenv.config() doesn't override existing env vars by default, so Tauri-set vars take precedence

const envPaths = [];

// 1. Current working directory (most common for development)
envPaths.push(path.join(process.cwd(), ".env"));

// 2. Executable's directory (for packaged executables)
if (process.pkg) {
  const exeDir = path.dirname(process.execPath);
  envPaths.push(path.join(exeDir, ".env"));
  // Also check parent directory (in case exe is in a subdirectory)
  const parentDir = path.dirname(exeDir);
  envPaths.push(path.join(parentDir, ".env"));
}

// 3. Check if env vars are already set (from Tauri sidecar) for non-RPC settings like PORT
const hasPort = !!process.env.PORT;

if (hasPort) {
  logger.info({
    hasPort,
    port: process.env.PORT || "not set"
  }, "Environment variables already set (likely from Tauri sidecar)");
}

// Try to load .env from the first location that exists
let loadedFrom = null;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    // dotenv.config() won't override existing env vars, so Tauri-set vars are preserved
    dotenv.config({ path: envPath, override: false });
    loadedFrom = envPath;
    logger.info({ path: envPath }, "Loaded .env file");
    break;
  }
}

if (!loadedFrom) {
  // Fallback: try default dotenv behavior (current directory)
  dotenv.config({ override: false });
  logger.warn({
    checkedPaths: envPaths,
    cwd: process.cwd(),
    execPath: process.pkg ? process.execPath : "N/A (not pkg)",
  }, "No .env file found in checked paths, using default dotenv behavior");
}

// Log final env var status for debugging (only non-RPC vars; RPC URLs are hard-coded)
logger.info({
  PORT: process.env.PORT || "using default (55001)",
  NODE_ENV: process.env.NODE_ENV || "not set",
  loadedFrom: loadedFrom || "none (using defaults or existing env vars)",
}, "Environment variables status after loading");

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
