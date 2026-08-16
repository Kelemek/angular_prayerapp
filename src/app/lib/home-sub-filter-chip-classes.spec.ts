import { describe, it, expect } from "vitest";
import {
  HOME_FILTER_TAB_ACTIVE_FILL,
  HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS,
  HOME_PERSONAL_SUB_FILTER_GROUP_CLASS,
  HOME_PROMPTS_SUB_FILTER_GROUP_CLASS,
  HOME_PUBLIC_STATUS_CHIP_THEMES,
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS,
  HOME_SHELL_FOOTER_BORDER_TOP_CLASS,
  HOME_SHELL_HEADER_BORDER_BOTTOM_CLASS,
  MODAL_CHROME_BORDER_BOTTOM_CLASS,
  MODAL_CHROME_BORDER_TOP_CLASS,
  homeFilterTabClass,
} from "./home-sub-filter-chip-classes";

describe("HOME_*_SUB_FILTER_GROUP_CLASS", () => {
  it("uses static folder-panel fills matching each tab (Tailwind must see full literals)", () => {
    expect(HOME_PERSONAL_SUB_FILTER_GROUP_CLASS).toContain("bg-church-green-tint");
    expect(HOME_PERSONAL_SUB_FILTER_GROUP_CLASS).toContain(
      "dark:bg-green-900/40"
    );
    expect(HOME_PROMPTS_SUB_FILTER_GROUP_CLASS).toContain("bg-stone-300");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("bg-blue-200");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("rounded-b-lg");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("border-[#0047AB]");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("border-t-0");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("border-x-[2px]");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("border-b-[2px]");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS.split(" ")).not.toContain(
      "border-[2px]"
    );
    expect(HOME_PERSONAL_SUB_FILTER_GROUP_CLASS).toContain("border-[#2F5F54]");
    expect(HOME_PROMPTS_SUB_FILTER_GROUP_CLASS).toContain("border-[#988F83]");
  });

  it("aliases memorize group fill to public blue", () => {
    expect(HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS).toBe(
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
    expect(cls).toContain("bg-blue-200");
    expect(cls).toContain("border-[#0047AB]");
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
    expect(cls).toContain("border-[#0047AB]");
    expect(cls).not.toContain("border-b-0");
  });

  it("uses inactive chrome for unselected tabs", () => {
    const cls = homeFilterTabClass({
      accent: "personal",
      active: false,
      hasSubRow: true,
    });
    expect(cls).toContain("rounded-t-lg");
    expect(cls).toContain("bg-church-surface-inactive");
    expect(cls).toContain("border-church-surface-inactive-tab-border");
    expect(cls).not.toContain("border-[2px]");
    expect(cls).not.toContain("z-10");
  });
});

describe("HOME_PUBLIC_STATUS_CHIP_THEMES", () => {
  it("uses bordered chips with accent rings", () => {
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.current.active).toContain("ring");
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.current.active).toContain(
      "border-[#0047AB]"
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
    expect(HOME_PUBLIC_STATUS_CHIP_THEMES.members.active).toContain(
      "border-[#0047AB]"
    );
  });

  it("uses lighter light-mode fills than folder panels for selected chips", () => {
    expect(HOME_FILTER_TAB_ACTIVE_FILL.public).toContain("bg-blue-200");
    expect(HOME_FILTER_TAB_ACTIVE_FILL.personal).toContain("bg-church-green-tint");
    expect(HOME_FILTER_TAB_ACTIVE_FILL.prompts).toContain("bg-stone-300");
    expect(HOME_FILTER_TAB_ACTIVE_FILL.memorize).toContain("bg-blue-200");
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
});
