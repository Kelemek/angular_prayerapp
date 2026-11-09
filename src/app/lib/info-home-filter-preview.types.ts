export type InfoHeaderPreviewAction =
  | "help"
  | "settings"
  | "pray"
  | "request"
  | "search"
  | "card-update"
  | "card-pray-for";

export type InfoPersonalActionPreview = "answered" | "edit" | "delete";

export type InfoMemorizeActionPreview =
  | "add-verses"
  | "bible-books"
  | "recommended";

export type InfoPreviewModalState =
  | { kind: "header"; action: InfoHeaderPreviewAction }
  | { kind: "promptCategories" }
  | { kind: "badges" }
  | { kind: "personalAction"; action: InfoPersonalActionPreview }
  | { kind: "personalCategories" }
  | { kind: "groups" }
  | { kind: "memorizeAction"; action: InfoMemorizeActionPreview }
  | { kind: "memorizePractice" };

export type InfoGroupsPreviewStatus = "current" | "answered" | "total";

export type InfoPreviewFilter =
  | "current"
  | "answered"
  | "archived"
  | "total"
  | "prompts"
  | "groups"
  | "groups-current"
  | "groups-answered"
  | "groups-total"
  | "personal"
  | "memorize";

export type InfoPreviewMockGroupChip = "larson" | "care";

export function isPublicPreviewFilter(
  filter: InfoPreviewFilter
): filter is "current" | "answered" | "archived" | "total" {
  return (
    filter === "current" ||
    filter === "answered" ||
    filter === "archived" ||
    filter === "total"
  );
}

/** True when the Church preview tab or its Prompts chip is selected. */
export function isPublicAreaPreviewFilter(filter: InfoPreviewFilter): boolean {
  return isPublicPreviewFilter(filter) || filter === "prompts";
}

export function isMemorizePreviewFilter(filter: InfoPreviewFilter): boolean {
  return filter === "memorize";
}

/** True when the Group preview tab or its status chips are selected. */
export function isGroupsAreaPreviewFilter(filter: InfoPreviewFilter): boolean {
  return (
    filter === "groups" ||
    filter === "groups-current" ||
    filter === "groups-answered" ||
    filter === "groups-total"
  );
}

export function groupsPreviewStatusFromFilter(
  filter: InfoPreviewFilter
): InfoGroupsPreviewStatus {
  if (filter === "groups-answered") {
    return "answered";
  }
  if (filter === "groups-total") {
    return "total";
  }
  return "current";
}

export function normalizeGroupsPreviewFilter(
  filter: InfoPreviewFilter
): InfoPreviewFilter {
  if (filter === "groups") {
    return "groups-current";
  }
  return filter;
}
