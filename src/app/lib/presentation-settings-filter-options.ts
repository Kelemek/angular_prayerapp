import type {
  PresentationTimeFilter,
  SelectablePresentationContentType,
} from "../types/presentation";

export const PRESENTATION_CONTENT_TYPE_OPTIONS: {
  value: SelectablePresentationContentType;
  label: string;
  requiresMappedList?: boolean;
}[] = [
  { value: "prayers", label: "Prayers" },
  { value: "prompts", label: "Prompts" },
  { value: "personal", label: "Personal" },
  { value: "members", label: "Members", requiresMappedList: true },
];

export const PRESENTATION_STATUS_FILTER_OPTIONS = [
  "current",
  "answered",
  "archived",
] as const;

export const PRESENTATION_TIME_FILTER_OPTIONS: {
  value: PresentationTimeFilter;
  label: string;
}[] = [
  { value: "week", label: "Last Week" },
  { value: "twoweeks", label: "Last 2 Weeks" },
  { value: "month", label: "Last Month" },
  { value: "year", label: "Last Year" },
  { value: "all", label: "All Time" },
];

export function getAvailablePresentationContentTypes(
  hasMappedList: boolean
): SelectablePresentationContentType[] {
  return PRESENTATION_CONTENT_TYPE_OPTIONS.filter(
    (option) => !option.requiresMappedList || hasMappedList
  ).map((option) => option.value);
}

export function formatPresentationContentTypeLabel(
  type: SelectablePresentationContentType
): string {
  return (
    PRESENTATION_CONTENT_TYPE_OPTIONS.find((entry) => entry.value === type)
      ?.label ?? type
  );
}

export function formatPresentationTimeFilterLabel(
  value: PresentationTimeFilter
): string {
  return (
    PRESENTATION_TIME_FILTER_OPTIONS.find((entry) => entry.value === value)
      ?.label ?? "All Time"
  );
}
