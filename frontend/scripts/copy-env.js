/**
 * Post-build script to copy .env file and backend executable to release directory
 * This ensures the backend can find the .env file and executable when running as a packaged app
 */
import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const repoRoot = join(__dirname, '../..');
const backendEnv = join(repoRoot, 'backend', '.env');
const binDir = join(repoRoot, 'frontend', 'src-tauri', 'bin');
const releaseDir = join(repoRoot, 'frontend', 'src-tauri', 'target', 'release');
const destEnv = join(releaseDir, '.env');

// Copy .env file
if (existsSync(backendEnv) && existsSync(releaseDir)) {
  try {
    copyFileSync(backendEnv, destEnv);
    console.log('✅ Copied .env file to release directory');
  } catch (error) {
    console.error('❌ Failed to copy .env file:', error.message);
    process.exit(1);
  }
} else {
  if (!existsSync(backendEnv)) {
    console.warn('⚠️  backend/.env not found - backend will use defaults');
  }
  if (!existsSync(releaseDir)) {
    console.warn('⚠️  Release directory not found - run tauri:build first');
  }
}

// Copy backend executable to release directory (for fallback method)
if (existsSync(binDir) && existsSync(releaseDir)) {
  const backendExe = join(binDir, 'wallet-backend-x86_64-pc-windows-msvc.exe');
  const destBackendExe = join(releaseDir, 'wallet-backend.exe');
  
  if (existsSync(backendExe)) {
    try {
      copyFileSync(backendExe, destBackendExe);
      console.log('✅ Copied backend executable to release directory');
    } catch (error) {
      console.warn('⚠️  Failed to copy backend executable:', error.message);
    }
  }
}
