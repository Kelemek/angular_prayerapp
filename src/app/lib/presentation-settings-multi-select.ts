/** Toggle one item in a multi-select pending list; keeps at least `minCount` selected. */
export function toggleMultiSelectItem<T>(
  pending: readonly T[],
  item: T,
  minCount = 1
): T[] {
  const index = pending.indexOf(item);
  if (index > -1) {
    if (pending.length <= minCount) {
      return [...pending];
    }
    return pending.filter((value) => value !== item);
  }
  return [...pending, item];
}

export function sortedArraysEqual<T>(
  left: readonly T[],
  right: readonly T[],
  normalize: (values: readonly T[]) => T[] = (values) => [...values]
): boolean {
  const normalizedLeft = normalize(left).sort();
  const normalizedRight = normalize(right).sort();
  if (normalizedLeft.length !== normalizedRight.length) {
    return false;
  }
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

export function isAllOptionsSelected<T>(
  available: readonly T[],
  pending: readonly T[]
): boolean {
  return (
    available.length > 0 &&
    available.every((option) => pending.includes(option))
  );
}
