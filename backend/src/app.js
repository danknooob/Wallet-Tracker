/**
 * Express app and composition root. Loads strategies, wires DI for ETH (balance enricher + RPC providers),
 * mounts wallet API and Swagger UI.
 */
import express from "express";
import cors from "cors";
import walletRoutes from "./routes/walletRoute.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./docs/swagger.js";
import dotenv from "dotenv";
dotenv.config();
// Load all strategies so they self-register (BTC, LTC, BCH, SOL). ETH is re-registered below with DI.
import "./domain/Strategy/index.js";

import { WalletStrategyRegistry } from "./domain/Factory/WalletStrategyRegistry.js";
import { EthWalletStrategy } from "./domain/Strategy/EthWalletStrategy.js";
import { EthRpcProvider } from "./domain/Providers/EthRpcProvider.js";
import { CodexRpcProvider } from "./domain/Providers/CodexRpcProvider.js";
import { ZeroBalanceProvider } from "./domain/Providers/ZeroBalanceProvider.js";
import { EthBalanceEnricher } from "./domain/Enrichers/EthBalanceEnricher.js";
import logger from "./utils/logger.js";

const app = express();
app.use((req, res, next) => {
  res.setHeader("x-backend-pid", String(process.pid));
  if (!process.env.BOOT_ID) {
    process.env.BOOT_ID = `${Date.now()}-${process.pid}`;
  }
  res.setHeader("x-backend-boot-id", process.env.BOOT_ID);
  process.stdout.write(
    `[REQ] ${new Date().toISOString()} ${req.method} ${req.originalUrl} pid=${process.pid} boot=${process.env.BOOT_ID}\n`
  );
  logger.info(
    { method: req.method, path: req.originalUrl, pid: process.pid, bootId: process.env.BOOT_ID },
    "Incoming request"
  );
  next();
});
// ---------- Composition root (DI): wire ETH strategy with balance enricher and RPC providers ----------
const ethRpcUrl = process.env.ETH_RPC_URL;
const codexRpcUrl = process.env.CODEX_RPC_URL;
logger.info({ ethRpcUrl }, "On the appjs file the ethRpcUrl is");
logger.info({ codexRpcUrl }, "On the appjs file the codexRpcUrl is");
if (ethRpcUrl) {
  const ethProvider = new EthRpcProvider(ethRpcUrl);
  const codexProvider = codexRpcUrl
    ? new CodexRpcProvider(codexRpcUrl)
    : new ZeroBalanceProvider();
  if (!codexRpcUrl) {
    logger.warn("CODEX_RPC_URL not set: codexBalance will show 0.0. Set it in .env for real Codex balances.");
  }
  const ethBalanceEnricher = new EthBalanceEnricher(ethProvider, codexProvider);
  WalletStrategyRegistry.register("ETH", () => new EthWalletStrategy(ethBalanceEnricher));
} else {
  logger.warn("ETH_RPC_URL not set in .env: ETH/Codex balance columns will be empty. Add ETH_RPC_URL (and optionally CODEX_RPC_URL) to enable balances.");
}

app.use(cors());
app.use(express.json());

app.get("/api-docs.json", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Wallet Tracker API",
  customfavIcon: "/favicon.ico",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
  },
}));

app.use("/api/wallet", walletRoutes);
app.get("/api/debug/ping", (req, res) => {
  process.stdout.write(
    `[PING] ${new Date().toISOString()} pid=${process.pid} boot=${process.env.BOOT_ID}\n`
  );
  logger.info({ pid: process.pid, bootId: process.env.BOOT_ID }, "Debug ping");
  res.json({
    ok: true,
    pid: process.pid,
    bootId: process.env.BOOT_ID,
    cwd: process.cwd(),
  });
});
app.get("/", (req, res) => {
  res.send("Welcome to the Wallet Tracker API");
});

export default app;
