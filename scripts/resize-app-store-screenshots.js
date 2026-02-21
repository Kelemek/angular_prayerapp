#!/usr/bin/env node
/**
 * Resize screenshots to App Store Connect required dimensions.
 * Output: 1284 × 2778 px (App Store Connect 6.5"/6.7" iPhone).
 *
 * Uses "sharp" if installed (fit inside + pad, no stretch). Otherwise uses
 * macOS "sips" (exact size; aspect ratio may change on very different proportions).
 *
 * Usage:
 *   node scripts/resize-app-store-screenshots.js [inputDir] [outputDir]
 * Defaults: inputDir=./app-store-screenshots/input, outputDir=./app-store-screenshots/output
 *
 * Put your source screenshots in the input folder, run the script, then
 * upload the PNGs from the output folder to App Store Connect.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const WIDTH = 1284;
const HEIGHT = 2778;
const BACKGROUND = { r: 17, g: 54, b: 93 }; // #1a365d dark blue

const inputDir = path.resolve(process.cwd(), process.argv[2] || 'app-store-screenshots/input');
const outputDir = path.resolve(process.cwd(), process.argv[3] || 'app-store-screenshots/output');

function useSips(files) {
  if (process.platform !== 'darwin') {
    console.error('Fallback (sips) is only available on macOS. Install sharp: npm install --save-dev sharp');
    process.exit(1);
  }
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Resizing ${files.length} image(s) to ${WIDTH}×${HEIGHT} px (sips; may stretch if aspect ratio differs)...`);
  for (let i = 0; i < files.length; i++) {
    const inputPath = path.join(inputDir, files[i]);
    const outputPath = path.join(outputDir, `appstore_${i + 1}.png`);
    try {
      execFileSync('sips', ['-z', String(HEIGHT), String(WIDTH), inputPath, '--out', outputPath], { stdio: 'pipe' });
      console.log(`  ${files[i]} → appstore_${i + 1}.png`);
    } catch (err) {
      console.error(`  Failed ${files[i]}:`, err.message);
    }
  }
  console.log('Done. Upload the PNGs from', outputDir, 'to App Store Connect.');
}

async function useSharp(files) {
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    useSips(files);
    return;
  }
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  console.log(`Resizing ${files.length} image(s) to ${WIDTH}×${HEIGHT} px (fit + pad, no stretch)...`);
  for (let i = 0; i < files.length; i++) {
    const inputPath = path.join(inputDir, files[i]);
    const outputPath = path.join(outputDir, `appstore_${i + 1}.png`);
    try {
      await sharp(inputPath)
        .resize(WIDTH, HEIGHT, { fit: 'contain', background: BACKGROUND })
        .png()
        .toFile(outputPath);
      console.log(`  ${files[i]} → appstore_${i + 1}.png`);
    } catch (err) {
      console.error(`  Failed ${files[i]}:`, err.message);
    }
  }
  console.log('Done. Upload the PNGs from', outputDir, 'to App Store Connect.');
}

async function main() {
  if (!fs.existsSync(inputDir)) {
    console.error('Input directory not found:', inputDir);
    console.error('Create it and add your screenshot images, or pass a path as the first argument.');
    process.exit(1);
  }

  const files = fs.readdirSync(inputDir)
    .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (files.length === 0) {
    console.error('No image files (png, jpg, jpeg, webp) found in', inputDir);
    process.exit(1);
  }

  await useSharp(files);
}

main();
