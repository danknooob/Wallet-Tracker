# Wallet Tracker

Derive **multi-chain wallet addresses** from a mnemonic or extended public key (xpub). React + Express. Supports **ETH**, **BTC**, **LTC**, **BCH**, and **SOL**, with optional ETH/Codex balance enrichment.

[![Node](https://img.shields.io/badge/Node-18%2B-green)](/)
[![Tauri](https://img.shields.io/badge/Tauri-2-blue)](/)

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Downloads](#downloads)
- [Quick start](#quick-start)
- [Clone and run](#clone-and-run)
- [Environment variables](#environment-variables)
- [Using the app](#using-the-app)
- [API overview](#api-overview)
- [Project structure](#project-structure)
- [Desktop app (Tauri)](#desktop-app-tauri)
- [Automated Releases (GitHub Actions)](#automated-releases-github-actions)
- [Security](#security)
- [Limitations](#limitations)

---

## What it does

- **Derive addresses** for **ETH**, **BTC**, **LTC**, **BCH**, and **SOL** from:
  - a 12/24-word **mnemonic**, or  
  - an **extended public key (xpub)** (where the chain supports it).
- **Pagination**: request a range of addresses with `startIdx` and `count`.
- **ETH/Codex balances**: shows `ethBalance` and `codexBalance` per address (pre-configured in release builds).

---

## Tech stack

| Layer    | Stack |
|----------|--------|
| Frontend | React 19, TypeScript, Vite 7 |
| Backend  | Node.js, Express 5 |
| API docs | Swagger UI (OpenAPI 3) |
| Domain   | Strategy pattern per currency; DI for enrichers and RPC providers |
| Desktop  | Tauri 2 — native installers for Windows, macOS, Linux |

---

## Prerequisites

- **Node.js** v18+ and **npm**
- **Rust** (only for building the Tauri desktop app): [rustup](https://rustup.rs/)

```bash
node -v
npm -v
# If using Tauri:
rustc --version
```

---

## Downloads

Download the pre-built release for your platform from [GitHub Releases](https://github.com/danknooob/Wallet-Tracker/releases). **No installation or configuration required** - just download and run!

### Quick Start (End Users)

1. Go to the [Releases page](https://github.com/danknooob/Wallet-Tracker/releases)
2. Download the installer for your platform:
   - **Windows**: `.msi` installer or `.exe` standalone
   - **macOS**: `.dmg` installer or `.app` bundle
3. Run the installer or executable

**That's it!** The app includes everything needed:
- ✅ Pre-configured backend with RPC URLs
- ✅ ETH and Codex balance support enabled
- ✅ No Node.js or npm required
- ✅ No configuration files to edit
- ✅ Backend starts automatically

The app will automatically start the backend and display wallet addresses with balances.

---

## Quick start

```bash
git clone https://github.com/danknooob/Wallet-Tracker
cd Wallet-Tracker

# Backend
cd backend && npm install
# Create backend/.env (see Environment variables), then:
npm run dev

# Frontend (new terminal) — opens Tauri desktop app
cd frontend && npm install && npm run dev
```

The desktop app window opens automatically. For browser-only, use `npm run dev:web` in the frontend and open **http://localhost:5173**.

---

## Clone and run

### 1. Clone the repo

```bash
git clone https://github.com/danknooob/Wallet-Tracker
cd Wallet-Tracker
```

### 2. Backend

```bash
cd backend
npm install
```

Create **`backend/.env`** with your config (see [Environment variables](#environment-variables)). Start the server:

```bash
npm run dev
```

API base: **http://localhost:55001** (or the `PORT` in `.env`).

### 3. Frontend

In a **new terminal**, from the project root:

```bash
cd frontend
npm install
npm run dev
```

**`npm run dev`** starts the **Tauri desktop app** (Vite + native window). For browser-only, run **`npm run dev:web`** and open **http://localhost:5173**.

### 4. Use the app

- Open the frontend URL in your browser.
- Choose **Mnemonic** or **Extended Public Key**, pick a **currency**, enter your value, and click **Show Addresses**.
- Use **Prev** / **Next** for pagination. For ETH, balances appear when RPC URLs are set in `backend/.env`.

---

## Environment variables

**Note**: This section is for **developers building from source**. End users downloading the release don't need to configure anything - the `.env` file is already included with RPC URLs pre-configured.

Backend loads **`backend/.env`**. Never commit `.env` or put real URLs in the repo.

| Variable        | Required | Description |
|----------------|----------|-------------|
| `PORT`         | No       | Server port (default: `55001`) |
| `NODE_ENV`     | No       | e.g. `development` or `production` |
| `ETH_RPC_URL`  | For ETH balances | Ethereum JSON-RPC URL (Infura, Alchemy, etc.). If missing, ETH/Codex balance columns stay empty. |
| `CODEX_RPC_URL`| No       | Codex chain RPC URL. If missing, `codexBalance` is returned as `0.0`. |

**Example (use your own values):**

```env
PORT=55001
NODE_ENV=development
ETH_RPC_URL=https://your-eth-rpc.example.com
CODEX_RPC_URL=https://your-codex-rpc.example.com
```

RPC options: Infura, Alchemy, QuickNode, or public endpoints for Ethereum; your chain’s docs for Codex.

---

## Using the app

1. **Input type**: Mnemonic (12/24 words) or Extended Public Key.
2. **Currency**: ETH, BTC, LTC, BCH, or SOL.
3. **Value**: Paste mnemonic or xpub (use test keys only; never production keys on untrusted machines).
4. **Show Addresses**: Fetches the first page; **Prev** / **Next** for more.

**For release users**: ETH and Codex balances are **automatically enabled** - no configuration needed! The app includes pre-configured RPC URLs.

**For developers**: If building from source, see [Environment variables](#environment-variables) to configure RPC URLs.

---

## API overview

- **Swagger UI**: **http://localhost:55001/api-docs**
- **OpenAPI JSON**: **http://localhost:55001/api-docs.json**

### POST `/api/wallet/fetch`

Derives addresses for the given currency and input.

**Request body:**

```json
{
  "inputType": "MNEMONIC",
  "currency": "ETH",
  "value": "your mnemonic or xpub string",
  "count": 20,
  "startIdx": 0
}
```

| Field       | Description |
|------------|-------------|
| `inputType`| `"MNEMONIC"` or `"XPUB"` |
| `currency` | `"ETH"`, `"BTC"`, `"LTC"`, `"BCH"`, `"SOL"` |
| `value`    | Mnemonic phrase or xpub |
| `count`    | Number of addresses (page size) |
| `startIdx` | Starting index (pagination) |

**Response (example):**

```json
{
  "currency": "ETH",
  "count": 20,
  "data": [
    {
      "srNo": 1,
      "path": "m/44'/60'/0'/0/0",
      "address": "0x...",
      "ethBalance": "0.0",
      "codexBalance": "0.0"
    }
  ]
}
```

`ethBalance` and `codexBalance` appear when balance enrichment is enabled (ETH strategy with RPC URLs set).

---

## Project structure

```text
Wallet-Tracker/
├── .gitignore
├── README.md
├── backend/
│   ├── .env                    # Your secrets (create locally, never commit)
│   ├── server.js               # Entry: loads .env, starts Express
│   ├── package.json
│   └── src/
│       ├── app.js              # Express app, CORS, Swagger, routes, DI wiring
│       ├── routes/             # /api/wallet
│       ├── controllers/
│       ├── services/
│       ├── domain/              # Strategies, enrichers, providers, registry
│       │   ├── Strategy/        # IWalletStrategy, ETH, BTC, LTC, BCH, SOL, Simple
│       │   ├── Enrichers/       # IBalanceEnricher, EthBalanceEnricher
│       │   ├── Providers/       # EthRpcProvider, CodexRpcProvider, ZeroBalanceProvider
│       │   ├── Factory/         # WalletStrategyRegistry, WalletStrategyFactory
│       │   └── Types/
│       ├── docs/                # Swagger/OpenAPI spec
│       └── utils/
└── frontend/
    ├── package.json
    ├── index.html
    ├── scripts/
    │   └── generate-icons.js       # Generates icon.ico for Tauri (run if missing)
    ├── src/
    │   ├── main.tsx
    │   ├── App.tsx
    │   ├── index.css
    │   └── pages/
    │       ├── AddressGeneratorPage.tsx
    │       └── AddressGeneratorPage.css
    └── src-tauri/                   # Tauri 2 desktop app + embedded backend
        ├── tauri.conf.json
        ├── Cargo.toml
        ├── build.rs
        ├── icons/
        │   └── icon.ico             # Required for Windows build; generated by script
        ├── bin/
        │   └── (backend binaries)   # wallet-backend-<target-triple>[.exe]
        └── src/
            ├── main.rs
            └── lib.rs
```

---

## Desktop app (Tauri)

Build a **native desktop app** for Windows, macOS, and Linux. The app loads the frontend in a native window and, for packaged builds, starts the **backend as an embedded sidecar process** so end users don't need Node or a separate backend.

**Prerequisites:** [Rust](https://rustup.rs/) (`rustc --version`).

### Icons (required for Windows build)

The repo includes **`frontend/src-tauri/icons/icon.ico`**. If it’s missing or you see a build error about `icons/icon.ico`, generate it:

```bash
cd frontend
node scripts/generate-icons.js
```

To use your own icon later:

```bash
cd frontend
npm run tauri icon path/to/your-icon.png
```

### Development

From the frontend folder, **`npm run dev`** (or **`npm run tauri:dev`**) starts the Tauri window and the Vite dev server. In dev, you can either:

- Let Tauri start the embedded backend, **after** you've built the sidecar binary for your OS (see below), or
- Run the backend separately with `cd backend && npm run dev`.

For **browser-only** (no desktop window), use **`npm run dev:web`** and open http://localhost:5173.

### Embedded backend (sidecar) build steps

To ship a single desktop app that \"just works\" for end users (no Node, no manual backend), you package the backend as a **sidecar binary** and let Tauri start it automatically.

1. **Build backend binary for your OS (run from `backend/`):**

   - **Windows (x64):**

     ```bash
     cd backend
     npm install
     npm run build:backend:win
     ```

   - **macOS (Apple Silicon):**

     ```bash
     cd backend
     npm install
     npm run build:backend:mac:arm
     ```

   - **macOS (Intel):**

     ```bash
     cd backend
     npm install
     npm run build:backend:mac:intel
     ```

   These commands use `pkg` to create standalone executables and place them under `frontend/src-tauri/bin/` with names like:

   - `wallet-backend-x86_64-pc-windows-msvc.exe`
   - `wallet-backend-aarch64-apple-darwin`
   - `wallet-backend-x86_64-apple-darwin`

2. **Tauri picks the right binary** at runtime using `externalBin` and starts it as a sidecar on port `55001`. The frontend then calls `http://127.0.0.1:55001` from inside the desktop app.

### Build installers

```bash
cd frontend
npm run tauri:build
```

Outputs are in **`frontend/src-tauri/target/release/bundle/`**:

| OS      | Outputs |
|---------|---------|
| Windows | `.msi`, `.exe` (NSIS) |
| macOS   | `.app`, `.dmg` |
| Linux   | `.deb`, `.AppImage`, etc. |

### Automated Releases (GitHub Actions)

This project uses **GitHub Actions** to automatically build and release the Wallet Tracker app for Windows and macOS whenever you create a new GitHub Release.

#### For Maintainers

1. **Create a GitHub Release:**
   - Go to your repository on GitHub
   - Click "Releases" → "Create a new release"
   - Choose a tag (e.g., `v1.0.1`) or create a new one
   - Fill in release title and description
   - Click "Publish release"

2. **GitHub Actions Automatically:**
   - Triggers the build workflow (`release.yml`)
   - Spins up Windows and macOS runners
   - Builds the backend executable for each platform
   - Builds the Tauri desktop app for each platform
   - Uploads all artifacts to the GitHub Release

3. **Artifacts Available:**
   - **Windows**: `.msi` installer and standalone `.exe`
   - **macOS**: `.dmg` installer and `.app` bundle
   - All files are automatically attached to the release

#### For End Users

1. **Download from Releases:**
   - Go to: `https://github.com/danknooob/Wallet-Tracker/releases`
   - Find the latest release
   - Download the installer/executable for their platform:
     - **Windows**: Download `.msi` (installer) or `.exe` (portable)
     - **macOS**: Download `.dmg` (installer) or `.app` (bundle)

2. **Install/Run:**
   - **Windows `.msi`**: Double-click to install, then run from Start Menu
   - **Windows `.exe`**: Double-click to run directly (portable)
   - **macOS `.dmg`**: Open DMG, drag app to Applications, run from Applications
   - **macOS `.app`**: Double-click to run (may need to allow in Security settings)

3. **That's It!**
   - No Node.js required
   - No configuration needed
   - Backend starts automatically
   - Everything is included

#### Workflow Details

**What Gets Built:**

**Windows Build:**
- Backend executable: `wallet-backend-x86_64-pc-windows-msvc.exe`
- Tauri app: `wallet-tracker.exe`
- Installer: `.msi` (Windows Installer)
- Standalone: `.exe` (NSIS installer)

**macOS Build:**
- Backend executables: ARM64 and Intel versions
- Tauri app: `.app` bundle
- Installer: `.dmg` disk image

**Build Process:**

1. **Backend Build:**
   - Installs Node.js dependencies
   - Bundles backend code with esbuild
   - Packages with `pkg` into standalone executable
   - Copies to `frontend/src-tauri/bin/`

2. **Frontend Build:**
   - Installs Node.js dependencies
   - Builds React frontend with Vite
   - Compiles Rust/Tauri app
   - Creates installers/bundles

3. **Release Upload:**
   - Downloads artifacts from both platforms
   - Uploads all files to GitHub Release
   - Users can download directly

#### Configuration

**Required GitHub Secrets (Optional):**

For **code signing** (recommended for production):

- `TAURI_PRIVATE_KEY`: Your Tauri private key
- `TAURI_KEY_PASSWORD`: Password for the key

**Note:** The workflow works without these secrets, but builds will be unsigned.

**Environment Variables:**

The workflow automatically creates a `.env` file with default RPC URLs:
- `ETH_RPC_URL=https://eth.llamarpc.com`
- `CODEX_RPC_URL=https://node-mainnet.codexnetwork.org`

To use different RPC URLs, add them to `backend/.env` before creating a release (but don't commit secrets!).

#### Troubleshooting

**Build Fails:**

1. Check the Actions tab for error logs
2. Common issues:
   - Missing dependencies (check `package-lock.json` is committed)
   - Rust compilation errors
   - Backend build failures

**Artifacts Not Uploaded:**

- Ensure both Windows and macOS builds complete successfully
- Check the "Upload to Release" job completed
- Verify you created a Release (not just a tag)

**Users Can't Download:**

- Check the Release page shows the artifacts
- Verify file sizes are reasonable (not 0 bytes)
- Ensure GitHub Actions has permission to upload to releases

**Manual Build (If Needed):**

If you need to build locally instead of using GitHub Actions:

```bash
# Windows
cd backend && npm run build:backend:win
cd ../frontend && npm run tauri:build

# macOS (ARM)
cd backend && npm run build:backend:mac:arm
cd ../frontend && npm run tauri:build
```

Built files will be in `frontend/src-tauri/target/release/` and `frontend/src-tauri/target/release/bundle/`.

---

## Security

- **`.env` files are secrets**: `.env` is in `.gitignore`. Never commit it or add real RPC URLs, API keys, or other secrets to the repo.
- **Mnemonics and xpubs are sensitive**: Use **test mnemonics** whenever possible. If you use real data, only do so on a machine you trust and understand that anyone with access to that machine can potentially read it (via malware, screen sharing, etc.).
- **No secrets in the executable**: The packaged backend and Tauri `.exe` / app bundles can be **reverse‑engineered**. Do **not** hard‑code mnemonics, private keys, seeds, or long‑lived secrets into the codebase or build scripts—assume any secret in the binary can be extracted.
- **Executable tampering**: Any `.exe` or installer you distribute can be tampered with if an attacker controls the download channel. Share installers only through channels you control (for example, GitHub Releases) and consider publishing checksums or signatures so users can verify downloads.
- **Intended use**: This project is designed for **address derivation and balance viewing**, not for long‑term storage of high‑value production keys. Treat it as a **tool**, not a custody solution.
- **Local `.env` only**: Create `backend/.env` locally and fill in your own values. Never paste or show this file in issues, screenshots, or pull requests.

---

## Limitations

- **SOL** supports mnemonic only (no xpub).
- **Balances** are only fetched for ETH (and Codex when configured); other currencies show address and path only.
- RPC rate limits and availability depend on the endpoints you configure in `.env`.
