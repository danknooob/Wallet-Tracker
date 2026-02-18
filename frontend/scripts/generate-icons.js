/**
 * Generates minimal icon.ico for Windows and icon.icns for macOS.
 * Run from frontend: node scripts/generate-icons.js
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const iconsDir = path.join(__dirname, "..", "src-tauri", "icons");
fs.mkdirSync(iconsDir, { recursive: true });

// Generate Windows ICO file
const BMP_HEADER_SIZE = 40;
const PIXEL_DATA_SIZE = 32 * 32 * 4;
const IMAGE_SIZE = BMP_HEADER_SIZE + PIXEL_DATA_SIZE;
const OFFSET = 6 + 16;

const buf = Buffer.alloc(6 + 16 + IMAGE_SIZE);
let pos = 0;

// ICONDIR
buf.writeUInt16LE(0, pos); pos += 2;
buf.writeUInt16LE(1, pos); pos += 2;
buf.writeUInt16LE(1, pos); pos += 2;

// ICONDIRENTRY: 32x32, 32bpp
buf.writeUInt8(32, pos); pos += 1;
buf.writeUInt8(32, pos); pos += 1;
buf.writeUInt8(0, pos); pos += 1;
buf.writeUInt8(0, pos); pos += 1;
buf.writeUInt16LE(1, pos); pos += 2;
buf.writeUInt16LE(32, pos); pos += 2;
buf.writeUInt32LE(IMAGE_SIZE, pos); pos += 4;
buf.writeUInt32LE(OFFSET, pos); pos += 4;

// BITMAPINFOHEADER (40 bytes)
buf.writeUInt32LE(40, pos); pos += 4;
buf.writeInt32LE(32, pos); pos += 4;
buf.writeInt32LE(32, pos); pos += 4;
buf.writeUInt16LE(1, pos); pos += 2;
buf.writeUInt16LE(32, pos); pos += 2;
buf.writeUInt32LE(0, pos); pos += 4;
buf.writeUInt32LE(0, pos); pos += 4;
buf.writeInt32LE(0, pos); pos += 4;
buf.writeInt32LE(0, pos); pos += 4;
buf.writeUInt32LE(0, pos); pos += 4;
buf.writeUInt32LE(0, pos); pos += 4;

// Pixel data (32x32 BGRA, bottom-up)
for (let y = 31; y >= 0; y--) {
  for (let x = 0; x < 32; x++) {
    buf.writeUInt8(0x60, pos); pos += 1;
    buf.writeUInt8(0x65, pos); pos += 1;
    buf.writeUInt8(0x8b, pos); pos += 1;
    buf.writeUInt8(0xff, pos); pos += 1;
  }
}

fs.writeFileSync(path.join(iconsDir, "icon.ico"), buf);
console.log("✅ Created src-tauri/icons/icon.ico");

// Generate macOS ICNS file
// ICNS format requires: 'is32' (RGB) + 's8mk' (mask) for 32x32
// Or we can use modern PNG-based formats like 'ic07' (128x128)
// For simplicity, we'll create a minimal valid ICNS with RGB + mask
const ICNS_HEADER_SIZE = 8;
const RGB_SIZE = 32 * 32 * 3; // 32x32 RGB (uncompressed)
const MASK_SIZE = 32 * 32; // 32x32 8-bit mask
const IS32_ENTRY_SIZE = 8 + RGB_SIZE; // 'is32' header + RGB data
const S8MK_ENTRY_SIZE = 8 + MASK_SIZE; // 's8mk' header + mask data
const TOTAL_ICNS_SIZE = ICNS_HEADER_SIZE + IS32_ENTRY_SIZE + S8MK_ENTRY_SIZE;

const icnsBuf = Buffer.alloc(TOTAL_ICNS_SIZE);
let icnsPos = 0;

// ICNS header: 'icns' magic + total size
icnsBuf.write('icns', icnsPos, 4, 'ascii'); icnsPos += 4;
icnsBuf.writeUInt32BE(TOTAL_ICNS_SIZE, icnsPos); icnsPos += 4;

// 'is32' entry: 32x32 RGB data (uncompressed, PackBits-style but we'll use raw for simplicity)
icnsBuf.write('is32', icnsPos, 4, 'ascii'); icnsPos += 4;
icnsBuf.writeUInt32BE(IS32_ENTRY_SIZE, icnsPos); icnsPos += 4;

// RGB data: 32x32 RGB (top-down)
for (let y = 0; y < 32; y++) {
  for (let x = 0; x < 32; x++) {
    icnsBuf.writeUInt8(0x60, icnsPos); icnsPos += 1; // R
    icnsBuf.writeUInt8(0x65, icnsPos); icnsPos += 1; // G
    icnsBuf.writeUInt8(0x8b, icnsPos); icnsPos += 1; // B
  }
}

// 's8mk' entry: 32x32 8-bit alpha mask
icnsBuf.write('s8mk', icnsPos, 4, 'ascii'); icnsPos += 4;
icnsBuf.writeUInt32BE(S8MK_ENTRY_SIZE, icnsPos); icnsPos += 4;

// Mask data: 32x32 alpha (all opaque)
for (let i = 0; i < MASK_SIZE; i++) {
  icnsBuf.writeUInt8(0xff, icnsPos); icnsPos += 1; // Fully opaque
}

fs.writeFileSync(path.join(iconsDir, "icon.icns"), icnsBuf);
console.log("✅ Created src-tauri/icons/icon.icns");
