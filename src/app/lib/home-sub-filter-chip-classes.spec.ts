import { describe, it, expect } from "vitest";
import {
  HOME_FILTER_TAB_ACTIVE_FILL,
  HOME_FILTER_TAB_INACTIVE_FILL,
  HOME_MEMORIZE_PANEL_CHIP_THEMES,
  HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS,
  HOME_PERSONAL_SUB_FILTER_GROUP_CLASS,
  HOME_PROMPTS_SUB_FILTER_GROUP_CLASS,
  HOME_PUBLIC_STATUS_CHIP_THEMES,
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS,
  HOME_SHELL_FOOTER_BORDER_TOP_CLASS,
  HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS,
  HOME_TAB_CSS_VAR,
  HOME_TAB_GROUPS_ACTIVE_FILL_CLASS,
  HOME_TAB_PUBLIC_INACTIVE_FILL_CLASS,
  HOME_TAB_TAILWIND_SCAN_ANCHOR,
  MODAL_CHROME_BORDER_BOTTOM_CLASS,
  MODAL_CHROME_BORDER_TOP_CLASS,
  homeFilterTabClass,
} from "./home-sub-filter-chip-classes";

describe("HOME_*_SUB_FILTER_GROUP_CLASS", () => {
  it("uses CSS variables for folder-panel fills and borders (theme overrides on html)", () => {
    expect(HOME_PERSONAL_SUB_FILTER_GROUP_CLASS).toContain(
      "var(--home-tab-personal-bg)"
    );
    expect(HOME_PERSONAL_SUB_FILTER_GROUP_CLASS).toContain(
      "var(--home-tab-personal-border)"
    );
    expect(HOME_PROMPTS_SUB_FILTER_GROUP_CLASS).toContain(
      "var(--home-tab-prompts-bg)"
    );
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain(
      "var(--home-tab-public-bg)"
    );
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("rounded-b-lg");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain(
      "var(--home-tab-public-border)"
    );
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("border-t-0");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("border-x-[2px]");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("border-b-[2px]");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS.split(" ")).not.toContain(
      "border-[2px]"
    );
  });

  it("uses memorize tab vars (not aliased to public)", () => {
    expect(HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS).toContain(
      "var(--home-tab-memorize-bg)"
    );
    expect(HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS).toContain(
      "var(--home-tab-memorize-border)"
    );
    expect(HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS).not.toBe(
      HOME_PUBLIC_SUB_FILTER_GROUP_CLASS
    );
  });
});

describe("MODAL chrome borders", () => {
  it("matches home shell church green medium edges", () => {
    expect(MODAL_CHROME_BORDER_BOTTOM_CLASS).toBe(HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS);
    expect(MODAL_CHROME_BORDER_TOP_CLASS).toBe(HOME_SHELL_FOOTER_BORDER_TOP_CLASS);
    expect(MODAL_CHROME_BORDER_BOTTOM_CLASS).toContain("#2F5F54");
  });
});

describe("HOME_SHELL chrome borders", () => {
  it("uses church green medium on header bottom and footer top", () => {
    expect(HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS).toContain("border-b");
    expect(HOME_SHELL_FOOTER_BORDER_TOP_CLASS).toContain("border-t");
    expect(HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS).toContain("#2F5F54");
    expect(HOME_SHELL_FOOTER_BORDER_TOP_CLASS).toContain("#2F5F54");
  });
});

describe("homeFilterTabClass", () => {
  it("includes label typography on every tab", () => {
    const cls = homeFilterTabClass({
      accent: "public",
      active: true,
      hasSubRow: true,
    });
    expect(cls).toContain("text-base");
    expect(cls).toContain("px-3");
    expect(cls).toContain("py-2");
    expect(cls).not.toContain("sm:text-");
    expect(cls).not.toContain("sm:px-");
    expect(cls).not.toContain("sm:py-");
    expect(cls).toContain("font-semibold");
    expect(cls).toContain("text-gray-700");
  });

  it("connects the active tab to the panel when a sub-row is present", () => {
    const cls = homeFilterTabClass({
      accent: "public",
      active: true,
      hasSubRow: true,
    });
    const tokens = cls.split(" ");
    expect(tokens).toContain("rounded-t-lg");
    expect(tokens).not.toContain("rounded-lg");
    expect(cls).toContain("z-10");
    expect(cls).toContain("border-t-[2px]");
    expect(cls).toContain("border-x-[2px]");
    expect(cls).toContain("border-b-0");
    expect(cls).not.toContain("-mb-[2px]");
    expect(cls).toContain("var(--home-tab-public-bg)");
    expect(cls).toContain("var(--home-tab-public-border)");
    expect(tokens).not.toContain("border-[2px]");
  });

  it("keeps a fully rounded selected tab when there is no sub-row", () => {
    const cls = homeFilterTabClass({
      accent: "members",
      active: true,
      hasSubRow: false,
    });
    expect(cls).toContain("rounded-lg");
    expect(cls).toContain(HOME_FILTER_TAB_ACTIVE_FILL.members.split(" ")[0]);
    expect(cls).toContain("var(--home-tab-members-border)");
    expect(cls).not.toContain("border-b-0");
  });

  it("uses per-accent inactive CSS vars for unselected tabs", () => {
    const cls = homeFilterTabClass({
      accent: "personal",
      active: false,
      hasSubRow: true,
    });
    expect(cls).toContain("rounded-t-lg");
    expect(cls).toContain("var(--home-tab-personal-inactive-bg)");
    expect(cls).toContain("var(--home-tab-personal-inactive-border)");
    expect(cls).toContain("border-2");
    expect(cls).toContain("home-filter-tab-inactive-chrome");
    expect(cls).not.toContain("bg-home-filter-tab-inactive");
    expect(cls).not.toContain("border-[2px]");
    expect(cls).not.toContain("z-10");
  });
});

describe("HOME_PUBLIC_STATUS_CHIP_THEMES", () => {
  it("uses bordered chips with accent rings", () => {
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.current.active).toContain("ring");
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.current.active).toContain(
      "var(--home-tab-public-border)"
    );
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.answered.active).toContain(
      "border-[#39704D]"
    );
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.archived.active).toContain(
      "border-[#C9A961]"
    );
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.total.active).toContain(
      "border-gray-500"
    );
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.prompts.active).toContain(
      "var(--home-tab-prompts-border)"
    );
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.members.active).toContain(
      "var(--home-tab-members-border)"
    );
  });

  it("uses CSS variable tab fills and lighter chip fills than panels", () => {
    expect(HOME_FILTER_TAB_ACTIVE_FILL.public).toContain(
      "var(--home-tab-public-bg)"
    );
    expect(HOME_FILTER_TAB_ACTIVE_FILL.personal).toContain(
      "var(--home-tab-personal-bg)"
    );
    expect(HOME_FILTER_TAB_ACTIVE_FILL.prompts).toContain(
      "var(--home-tab-prompts-bg)"
    );
    expect(HOME_FILTER_TAB_ACTIVE_FILL.memorize).toContain(
      "var(--home-tab-memorize-bg)"
    );
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.current.active).toContain(
      "bg-home-panel-blue-chip-active"
    );
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.answered.active).toContain(
      "bg-home-panel-green-status-chip-active"
    );
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.archived.active).toContain(
      "bg-home-panel-amber-status-chip-active"
    );
  });

  it("maps memorize panel chips to memorize tab CSS vars", () => {
    expect(HOME_MEMORIZE_PANEL_CHIP_THEMES.active).toContain(
      "var(--home-tab-memorize-border)"
    );
    expect(HOME_TAB_CSS_VAR.memorize.border).toBe("--home-tab-memorize-border");
  });

  it("uses distinct CSS vars for inactive vs active tab fills", () => {
    expect(HOME_FILTER_TAB_ACTIVE_FILL.public).toContain(
      "var(--home-tab-public-bg)"
    );
    expect(HOME_FILTER_TAB_INACTIVE_FILL.public).toContain(
      "var(--home-tab-public-inactive-bg)"
    );
    expect(HOME_FILTER_TAB_ACTIVE_FILL.public).not.toBe(
      HOME_FILTER_TAB_INACTIVE_FILL.public
    );
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain(
      "var(--home-tab-public-bg)"
    );
  });

  it("HOME_TAB_TAILWIND_SCAN_ANCHOR includes static literals for every accent", () => {
    const required = [
      "--home-tab-public-inactive-bg",
      "--home-tab-groups-inactive-bg",
      "--home-tab-personal-inactive-bg",
      "--home-tab-memorize-inactive-bg",
      "--home-tab-public-bg",
      "--home-tab-groups-bg",
      "--home-tab-memorize-bg",
    ];
    for (const token of required) {
      expect(HOME_TAB_TAILWIND_SCAN_ANCHOR).toContain(token);
    }
    expect(HOME_FILTER_TAB_INACTIVE_FILL.public).toBe(
      HOME_TAB_PUBLIC_INACTIVE_FILL_CLASS
    );
    expect(HOME_FILTER_TAB_ACTIVE_FILL.groups).toBe(
      HOME_TAB_GROUPS_ACTIVE_FILL_CLASS
    );
  });
});
