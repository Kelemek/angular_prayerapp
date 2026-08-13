import { describe, it, expect } from "vitest";
import {
  getPresentationContentLoadingLabel,
  getPresentationEmptyContentMessage,
} from "./presentation-content-messages";

describe("getPresentationContentLoadingLabel", () => {
  it("returns all content when no types are selected", () => {
    expect(getPresentationContentLoadingLabel([])).toBe("all content");
  });

  it("returns single-type labels", () => {
    expect(getPresentationContentLoadingLabel(["prayers"])).toBe("prayers");
    expect(getPresentationContentLoadingLabel(["prompts"])).toBe("prompts");
    expect(getPresentationContentLoadingLabel(["personal"])).toBe(
      "personal prayers"
    );
    expect(getPresentationContentLoadingLabel(["members"])).toBe(
      "member prayers"
    );
  });

  it("returns generic content for multiple types", () => {
    expect(getPresentationContentLoadingLabel(["prayers", "prompts"])).toBe(
      "content"
    );
  });
});

describe("getPresentationEmptyContentMessage", () => {
  it("returns generic empty message when no types are selected", () => {
    expect(getPresentationEmptyContentMessage([])).toBe("No content available");
  });

  it("returns single-type empty messages", () => {
    expect(getPresentationEmptyContentMessage(["prayers"])).toBe(
      "No prayers match your current filters"
    );
    expect(getPresentationEmptyContentMessage(["prompts"])).toBe(
      "No prayer prompts available"
    );
    expect(getPresentationEmptyContentMessage(["personal"])).toBe(
      "No personal prayers available"
    );
    expect(getPresentationEmptyContentMessage(["members"])).toBe(
      "No member updates available"
    );
  });

  it("returns filtered empty message for multiple types", () => {
    expect(
      getPresentationEmptyContentMessage(["prayers", "personal"])
    ).toBe("No content matches your current filters");
  });
});
