import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { HOME_PROMPT_VIRTUAL_SCROLL_ITEM_CLASSES } from "./home-shell-spacing";

describe("home prompt virtual scroll spacing", () => {
  it("clears shell outer margin on virtual scroll hosts", () => {
    const cssPath = join(
      dirname(fileURLToPath(import.meta.url)),
      "../components/prompt-card/prompt-card.component.css"
    );
    const css = readFileSync(cssPath, "utf8");
    expect(css).toContain(HOME_PROMPT_VIRTUAL_SCROLL_ITEM_CLASSES);
    expect(css).toMatch(/margin-bottom:\s*0/);
  });
});
