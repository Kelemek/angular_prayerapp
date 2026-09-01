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
  | { kind: "memorizeAction"; action: InfoMemorizeActionPreview }
  | { kind: "memorizePractice" };

export type InfoPreviewFilter =
  | "current"
  | "answered"
  | "archived"
  | "total"
  | "prompts"
  | "personal"
  | "memorize";

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
