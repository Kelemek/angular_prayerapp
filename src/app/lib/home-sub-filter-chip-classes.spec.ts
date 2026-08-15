import { describe, it, expect } from "vitest";
import {
  HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS,
  HOME_PERSONAL_SUB_FILTER_GROUP_CLASS,
  HOME_PROMPTS_SUB_FILTER_GROUP_CLASS,
  HOME_PUBLIC_SUB_FILTER_GROUP_CLASS,
} from "./home-sub-filter-chip-classes";

describe("HOME_*_SUB_FILTER_GROUP_CLASS", () => {
  it("uses static 2px tab-colored borders (Tailwind must see full literals)", () => {
    expect(HOME_PERSONAL_SUB_FILTER_GROUP_CLASS).toBe(
      "rounded-lg border-[2px] border-[#2F5F54] dark:border-[#2F5F54] p-2"
    );
    expect(HOME_PROMPTS_SUB_FILTER_GROUP_CLASS).toContain("border-[#988F83]");
    expect(HOME_PUBLIC_SUB_FILTER_GROUP_CLASS).toContain("border-[#0047AB]");
  });

  it("aliases memorize group border to public blue", () => {
    expect(HOME_MEMORIZE_SUB_FILTER_GROUP_CLASS).toBe(
      HOME_PUBLIC_SUB_FILTER_GROUP_CLASS
    );
  });
});
