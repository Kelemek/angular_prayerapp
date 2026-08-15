import type { PresentationStatusFilters } from "../types/presentation";
import {
  isAllOptionsSelected,
  sortedArraysEqual,
  toggleMultiSelectItem,
} from "./presentation-settings-multi-select";

export function initPendingFromApplied<T extends string>(
  applied: readonly T[],
  available: readonly T[]
): T[] {
  if (applied.length === 0) {
    return [...available];
  }
  return [...applied];
}

export function resolveMultiSelectApplied<T extends string>(
  pending: readonly T[],
  available: readonly T[]
): T[] | null {
  if (pending.length === 0) {
    return null;
  }
  if (isAllOptionsSelected(available, pending)) {
    return [];
  }
  return [...pending];
}

export type PresentationMultiSelectApplyResult =
  | "invalid"
  | "unchanged"
  | "applied";

export function applyMultiSelectFilter<T extends string>(params: {
  pending: readonly T[];
  available: readonly T[];
  applied: readonly T[];
  normalize: (values: readonly T[]) => T[];
}): { result: PresentationMultiSelectApplyResult; next?: T[] } {
  const resolved = resolveMultiSelectApplied(
    params.pending,
    params.available
  );
  if (resolved === null) {
    return { result: "invalid" };
  }
  if (sortedArraysEqual(params.applied, resolved, params.normalize)) {
    return { result: "unchanged" };
  }
  return { result: "applied", next: [...resolved] };
}

export function formatMultiSelectDisplay<T extends string>(
  applied: readonly T[],
  allLabel: string,
  formatItem: (value: T) => string = (value) => value
): string {
  if (applied.length === 0) {
    return allLabel;
  }
  return applied.map(formatItem).join(", ");
}

export function normalizeWithAvailableFallback<T extends string>(
  values: readonly T[],
  available: readonly T[]
): T[] {
  const effective = values.length === 0 ? [...available] : [...values];
  return [...effective].sort();
}

export function initPendingStatusFilter(
  statusFilters: PresentationStatusFilters,
  available: readonly string[]
): string[] {
  if (
    !statusFilters.current &&
    !statusFilters.answered &&
    !statusFilters.archived
  ) {
    return [...available];
  }
  const filters: string[] = [];
  if (statusFilters.current) filters.push("current");
  if (statusFilters.answered) filters.push("answered");
  if (statusFilters.archived) filters.push("archived");
  return filters;
}

export function resolveAppliedStatusFilters(
  pending: readonly string[],
  available: readonly string[]
): PresentationStatusFilters {
  if (isAllOptionsSelected(available, pending)) {
    return { current: false, answered: false, archived: false };
  }
  return {
    current: pending.includes("current"),
    answered: pending.includes("answered"),
    archived: pending.includes("archived"),
  };
}

export function formatStatusFilterDisplay(
  statusFilters: PresentationStatusFilters
): string {
  const filters: string[] = [];
  if (statusFilters.current) filters.push("Current");
  if (statusFilters.answered) filters.push("Answered");
  if (statusFilters.archived) filters.push("Archived");
  if (filters.length === 0) return "All Statuses";
  return filters.join(", ");
}

export function statusFiltersMatchApplied(
  applied: PresentationStatusFilters,
  statusFilters: PresentationStatusFilters
): boolean {
  return (
    applied.current === statusFilters.current &&
    applied.answered === statusFilters.answered &&
    applied.archived === statusFilters.archived
  );
}

export { toggleMultiSelectItem, isAllOptionsSelected };
