/**
 * Entry point for the Wallet Tracker API server.
 * Loads env from .env, mounts the Express app, and listens on PORT.
 */
import dotenv from "dotenv";
dotenv.config();
import app from "./src/app.js";
import logger from "./src/utils/logger.js";

const port = process.env.PORT || 55001;

// Prevent the process from exiting on unhandled errors
process.on('uncaughtException', (err) => {
  logger.error(err, 'Uncaught Exception thrown');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(reason, 'Unhandled Rejection at Promise');
});

app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
});

// Keep the process alive
setInterval(() => {}, 1 << 30);
