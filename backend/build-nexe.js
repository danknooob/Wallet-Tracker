import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync, copyFileSync, rmSync, writeFileSync, readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { tmpdir } from 'os';
import pino from 'pino';
import pretty from 'pino-pretty';

const stream = pretty({
  colorize: true,
  translateTime: 'SYS:standard',
  ignore: 'pid,hostname',
});
const logger = pino(stream);


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const target = process.argv[2];

const targets = {
  'win': { 
    pkgTarget: 'node18-win-x64',
    output: resolve(__dirname, '../frontend/src-tauri/bin/wallet-backend-x86_64-pc-windows-msvc.exe')
  },
  'mac-arm': { 
    pkgTarget: 'node18-macos-arm64',
    output: resolve(__dirname, '../frontend/src-tauri/bin/wallet-backend-aarch64-apple-darwin')
  },
  'mac-intel': { 
    pkgTarget: 'node18-macos-x64',
    output: resolve(__dirname, '../frontend/src-tauri/bin/wallet-backend-x86_64-apple-darwin')
  }
};

const config = targets[target];
if (!config) {
  logger.error('Invalid target. Use: win, mac-arm, or mac-intel');
  process.exit(1);
}

logger.info(`Packaging with pkg for ${config.pkgTarget}...`);

// Declare these outside try block so they're accessible in catch
const packageJsonPath = resolve(__dirname, 'package.json');
let originalPackageJson = null;
let packageJsonModified = false;

try {
  // Temporarily remove "main": "server.js" from backend/package.json so pkg doesn't include it
  
  if (existsSync(packageJsonPath)) {
    originalPackageJson = readFileSync(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(originalPackageJson);
    const originalMain = pkg.main;
    delete pkg.main; // Remove main so pkg doesn't see server.js
    writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
    packageJsonModified = true;
    logger.info('📦 Temporarily removed "main" from package.json');
  }
  
  try {
    // Create temp directory in system temp (completely isolated)
    const tempDir = resolve(tmpdir(), `pkg-build-${Date.now()}`);
    mkdirSync(tempDir, { recursive: true });
    
    // Copy ONLY the bundled file
    copyFileSync(resolve(__dirname, 'dist', 'app.js'), resolve(tempDir, 'app.js'));
    
    // Copy pino and its dependencies to temp directory so pkg can find them
    const nodeModulesSrc = resolve(__dirname, 'node_modules');
    const nodeModulesDest = resolve(tempDir, 'node_modules');
    mkdirSync(nodeModulesDest, { recursive: true });
    
    const pinoDeps = ['pino', 'pino-pretty', 'thread-stream', 'real-require', 'pino-std-serializers', 'fast-safe-stringify', 'sonic-boom', 'flatstr'];
    
    const copyDir = (src, dest) => {
      mkdirSync(dest, { recursive: true });
      const entries = readdirSync(src, { withFileTypes: true });
      for (const entry of entries) {
        const srcPath = resolve(src, entry.name);
        const destPath = resolve(dest, entry.name);
        if (entry.isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          copyFileSync(srcPath, destPath);
        }
      }
    };
    
    for (const dep of pinoDeps) {
      const srcPath = resolve(nodeModulesSrc, dep);
      const destPath = resolve(nodeModulesDest, dep);
      if (existsSync(srcPath)) {
        if (statSync(srcPath).isDirectory()) {
          copyDir(srcPath, destPath);
        } else {
          copyFileSync(srcPath, destPath);
        }
        logger.info(`Copied ${dep} to temp directory`);
      }
    }
    
    // Create minimal package.json with pkg configuration
    const pkgJson = {
      name: 'wallet-backend',
      version: '1.0.0',
      main: 'app.js',
      bin: 'app.js',
      pkg: {
        scripts: ['app.js'],
        targets: [config.pkgTarget]
      }
    };
    writeFileSync(resolve(tempDir, 'package.json'), JSON.stringify(pkgJson, null, 2));
    
    // Run pkg from temp directory
    const originalCwd = process.cwd();
    process.chdir(tempDir);
    
    try {
      const pkgCmd = `npx pkg app.js --targets ${config.pkgTarget} --output "${config.output}"`;
      execSync(pkgCmd, { stdio: 'inherit' });
      logger.info(`✅ Built: ${config.output}`);
    } finally {
      process.chdir(originalCwd);
      rmSync(tempDir, { recursive: true, force: true });
    }
  } finally {
    // Restore original package.json
    if (packageJsonModified && originalPackageJson) {
      writeFileSync(packageJsonPath, originalPackageJson);
      logger.info('✅ Restored package.json');
    }
  }
} catch (error) {
  logger.error({ error: error.message, stack: error.stack }, '❌ pkg failed');
  console.error('Full error:', error);
  // Restore package.json on error too
  if (packageJsonModified && originalPackageJson) {
    writeFileSync(packageJsonPath, originalPackageJson);
  }
  process.exit(1);
}
