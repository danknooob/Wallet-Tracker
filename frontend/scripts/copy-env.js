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
const tauriDir = join(repoRoot, 'frontend', 'src-tauri');
const releaseDir = join(repoRoot, 'frontend', 'src-tauri', 'target', 'release');
const destEnv = join(releaseDir, '.env');
const tauriEnv = join(tauriDir, '.env'); // For bundling as resource

// Copy .env file to Tauri directory (for bundling as resource)
if (existsSync(backendEnv)) {
  try {
    copyFileSync(backendEnv, tauriEnv);
    console.log('✅ Copied .env file to Tauri directory (for resource bundling)');
  } catch (error) {
    console.error('❌ Failed to copy .env file to Tauri directory:', error.message);
    process.exit(1);
  }
} else {
  console.warn('⚠️  backend/.env not found - backend will use defaults');
}

// Copy .env file to release directory (for runtime)
if (existsSync(backendEnv) && existsSync(releaseDir)) {
  try {
    copyFileSync(backendEnv, destEnv);
    console.log('✅ Copied .env file to release directory');
  } catch (error) {
    console.warn('⚠️  Failed to copy .env file to release directory:', error.message);
  }
} else {
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
      
      // Also copy to bundle directories if they exist
      const bundleDirs = [
        join(releaseDir, 'bundle', 'msi', 'Wallet Tracker_1.0.1_x64_en-US'),
        join(releaseDir, 'bundle', 'nsis'),
      ];
      
      for (const bundleDir of bundleDirs) {
        if (existsSync(bundleDir)) {
          try {
            copyFileSync(backendExe, join(bundleDir, 'wallet-backend.exe'));
            copyFileSync(destEnv, join(bundleDir, '.env'));
            console.log(`✅ Copied backend and .env to ${bundleDir}`);
          } catch (err) {
            // Ignore errors for bundle directories that don't exist
          }
        }
      }
    } catch (error) {
      console.warn('⚠️  Failed to copy backend executable:', error.message);
    }
  } else {
    console.warn('⚠️  Backend executable not found:', backendExe);
  }
}
