import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';

const componentDir = dirname(fileURLToPath(import.meta.url));

export async function resolveScriptureHoverPreviewComponentResources(): Promise<void> {
  await resolveComponentResources((url) => {
    const path = join(componentDir, url);
    if (!existsSync(path)) {
      throw new Error(`Component resource not found: ${url}`);
    }
    return Promise.resolve(readFileSync(path, 'utf-8'));
  });
}
