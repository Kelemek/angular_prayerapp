export type InfoHeaderPreviewAction =
  | "help"
  | "settings"
  | "pray"
  | "request"
  | "search"
  | "card-update"
  | "card-pray-for";

export type InfoPersonalActionPreview = "answered" | "edit" | "delete";

export type InfoPreviewModalState =
  | { kind: "header"; action: InfoHeaderPreviewAction }
  | { kind: "promptCategories" }
  | { kind: "badges" }
  | { kind: "personalAction"; action: InfoPersonalActionPreview }
  | { kind: "personalCategories" };

export type InfoPreviewFilter =
  | "current"
  | "answered"
  | "archived"
  | "total"
  | "members"
  | "prompts"
  | "personal";

export function isPublicPreviewFilter(
  filter: InfoPreviewFilter
): filter is "current" | "answered" | "archived" | "total" | "members" {
  return (
    filter === "current" ||
    filter === "answered" ||
    filter === "archived" ||
    filter === "total" ||
    filter === "members"
  );
}
