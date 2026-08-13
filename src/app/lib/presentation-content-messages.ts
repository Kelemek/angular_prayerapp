import type { SelectablePresentationContentType } from "../types/presentation";

export function getPresentationContentLoadingLabel(
  contentTypes: SelectablePresentationContentType[]
): string {
  if (contentTypes.length === 0) {
    return "all content";
  }
  if (contentTypes.length === 1) {
    switch (contentTypes[0]) {
      case "prayers":
        return "prayers";
      case "prompts":
        return "prompts";
      case "personal":
        return "personal prayers";
      case "members":
        return "member prayers";
      default: {
        const _exhaustive: never = contentTypes[0];
        return _exhaustive;
      }
    }
  }
  return "content";
}

export function getPresentationEmptyContentMessage(
  contentTypes: SelectablePresentationContentType[]
): string {
  if (contentTypes.length === 0) {
    return "No content available";
  }
  if (contentTypes.length === 1) {
    switch (contentTypes[0]) {
      case "prayers":
        return "No prayers match your current filters";
      case "prompts":
        return "No prayer prompts available";
      case "personal":
        return "No personal prayers available";
      case "members":
        return "No member updates available";
      default: {
        const _exhaustive: never = contentTypes[0];
        return _exhaustive;
      }
    }
  }
  return "No content matches your current filters";
}
