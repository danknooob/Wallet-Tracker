import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { mkdirSync, copyFileSync, rmSync, writeFileSync, readFileSync, existsSync } from 'fs';
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

try {
  // Temporarily remove "main": "server.js" from backend/package.json so pkg doesn't include it
  const packageJsonPath = resolve(__dirname, 'package.json');
  let originalPackageJson = null;
  let packageJsonModified = false;
  
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
    
    // Create minimal package.json with pkg configuration for pino
    const pkgJson = {
      name: 'wallet-backend',
      version: '1.0.0',
      main: 'app.js',
      bin: 'app.js',
      pkg: {
        scripts: ['app.js'],
        assets: [
          'node_modules/pino/**/*',
          'node_modules/pino-pretty/**/*',
          'node_modules/thread-stream/**/*',
          'node_modules/real-require/**/*'
        ],
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
  logger.error('❌ pkg failed:', error.message);
  // Restore package.json on error too
  if (packageJsonModified && originalPackageJson) {
    writeFileSync(packageJsonPath, originalPackageJson);
  }
  process.exit(1);
}
