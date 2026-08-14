import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { ɵresolveComponentResources as resolveComponentResources } from "@angular/core";

const componentsDir = dirname(fileURLToPath(import.meta.url));
const appDir = dirname(componentsDir);

function discoverInfoPreviewResourceDirs(): string[] {
  const dirs = [join(appDir, "pages", "info"), join(componentsDir, "modal-shell")];

  for (const name of readdirSync(componentsDir)) {
    if (!name.startsWith("info-")) {
      continue;
    }
    const fullPath = join(componentsDir, name);
    if (statSync(fullPath).isDirectory()) {
      dirs.push(fullPath);
    }
  }

  return dirs;
}

/** Directories searched when resolving external templates for Info preview specs. */
export const INFO_PREVIEW_COMPONENT_RESOURCE_DIRS: readonly string[] =
  discoverInfoPreviewResourceDirs();

export function readInfoPreviewComponentResource(
  url: string,
  primaryDirs: readonly string[] = []
): string {
  for (const base of [...primaryDirs, ...INFO_PREVIEW_COMPONENT_RESOURCE_DIRS]) {
    const path = join(base, url);
    if (existsSync(path)) {
      return readFileSync(path, "utf-8");
    }
  }
  throw new Error(`Component resource not found: ${url}`);
}

export async function setupInfoPreviewComponentResources(
  primaryDirs: readonly string[] = []
): Promise<void> {
  await resolveComponentResources((url) =>
    Promise.resolve(readInfoPreviewComponentResource(url, primaryDirs))
  );
}
