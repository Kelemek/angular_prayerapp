import fs from 'node:fs';
import path from 'node:path';
import type { CapacitorConfig } from '@capacitor/cli';

function loadDotEnvFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    return;
  }
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const root = path.resolve(__dirname);
loadDotEnvFile(path.join(root, '.env.capacitor'));

const capacitorServerUrl = process.env.CAPACITOR_SERVER_URL?.trim() ?? '';

const allowNavigation = [
  'cpprayer.cp-church.org',
  '*.cp-church.org',
  'localhost',
  '127.0.0.1',
  '10.0.2.2',
];

const serverConfig: CapacitorConfig['server'] = {
  iosScheme: 'https',
  allowNavigation,
  ...(capacitorServerUrl
    ? {
        url: capacitorServerUrl,
        cleartext: capacitorServerUrl.startsWith('http://'),
      }
    : {}),
};

const config: CapacitorConfig = {
  appId: 'com.prayerapp.mobile',
  appName: 'Prayer App',
  webDir: 'dist/prayerapp/browser',
  server: serverConfig,
  plugins: {
    Badge: {
      persist: true,
      autoClear: false,
    },
  },
};

export default config;
