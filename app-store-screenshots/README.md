# App Store screenshots

Resize phone screenshots to **1284 × 2778 px** (required by App Store Connect for 6.5"/6.7" iPhone).

1. Copy your screenshot images (PNG, JPG, or WebP) into **`input/`**.
2. From the project root run:
   ```bash
   npm run resize-app-store-screenshots
   ```
3. Find resized images in **`output/`** as `appstore_1.png`, `appstore_2.png`, etc.
4. Upload those PNGs to App Store Connect for your app version.

- If the **sharp** package is available (or installed with `npm install --save-dev sharp`), images are scaled to **fit inside** 1284×2778 and padded with the app’s dark blue (`#1a365d`) so nothing is stretched.
- On macOS without sharp, the script uses **sips** and outputs exact 1284×2778 (aspect ratio may change if the source is very different).
- If App Store Connect asks for **1242 × 2688** instead, edit `WIDTH` and `HEIGHT` in `scripts/resize-app-store-screenshots.js` and run again.

To use different folders:
```bash
node scripts/resize-app-store-screenshots.js /path/to/source /path/to/destination
```
