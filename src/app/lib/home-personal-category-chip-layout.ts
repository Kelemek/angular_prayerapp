export function personalCategoryLayoutSignature(
  categories: readonly string[],
  countFor: (category: string) => number
): string {
  return categories.map((category) => `${category}:${countFor(category)}`).join("|");
}

export const PERSONAL_CATEGORY_CHIP_ROW_TOLERANCE_PX = 4;

/** pl-7 + pr-3 on the category chip button (drag handle lives in padding). */
export const PERSONAL_CATEGORY_CHIP_LABEL_INSET_PX = 40;

export function groupElementsByRow(
  elements: HTMLElement[],
  tolerancePx = PERSONAL_CATEGORY_CHIP_ROW_TOLERANCE_PX
): HTMLElement[][] {
  const sorted = [...elements].sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    return aRect.top - bRect.top || aRect.left - bRect.left;
  });

  const rows: HTMLElement[][] = [];
  for (const element of sorted) {
    const top = element.getBoundingClientRect().top;
    const lastRow = rows[rows.length - 1];
    if (!lastRow) {
      rows.push([element]);
      continue;
    }
    const rowTop = lastRow[0]!.getBoundingClientRect().top;
    if (Math.abs(top - rowTop) <= tolerancePx) {
      lastRow.push(element);
    } else {
      rows.push([element]);
    }
  }
  return rows;
}

export function measureNaturalLabelWidth(label: HTMLElement): number {
  const clone = label.cloneNode(true) as HTMLElement;
  clone.style.position = "absolute";
  clone.style.visibility = "hidden";
  clone.style.whiteSpace = "nowrap";
  clone.style.width = "auto";
  clone.style.maxWidth = "none";
  clone.style.left = "-9999px";
  clone.classList.remove("truncate", "min-w-0", "flex-1", "block");
  document.body.appendChild(clone);
  const width = clone.scrollWidth || label.scrollWidth;
  clone.remove();
  return width;
}

export type PersonalCategoryChipLayout = {
  soloRowCategories: Set<string>;
  truncatedCategories: Set<string>;
};

/** Solo-row chips span full width; truncate only when the natural label exceeds that width. */
export function computePersonalCategoryChipLayout(
  container: HTMLElement,
  chipSelector = "[data-personal-category-chip]",
  labelInsetPx = PERSONAL_CATEGORY_CHIP_LABEL_INSET_PX
): PersonalCategoryChipLayout {
  const chips = Array.from(
    container.querySelectorAll<HTMLElement>(chipSelector)
  );
  const soloRowCategories = new Set<string>();
  const truncatedCategories = new Set<string>();
  const rows = groupElementsByRow(chips);
  const availableLabelWidth = Math.max(0, container.clientWidth - labelInsetPx);

  for (const row of rows) {
    if (row.length !== 1) {
      continue;
    }
    const chip = row[0]!;
    const category = chip.getAttribute("data-personal-category-chip");
    const label = chip.querySelector<HTMLElement>(
      "[data-personal-category-label]"
    );
    if (!category || !label) {
      continue;
    }

    soloRowCategories.add(category);
    if (measureNaturalLabelWidth(label) > availableLabelWidth + 1) {
      truncatedCategories.add(category);
    }
  }

  return { soloRowCategories, truncatedCategories };
}

export function personalCategoryChipSetsEqual(
  a: Set<string>,
  b: Set<string>
): boolean {
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

export function personalCategoryChipLayoutEqual(
  a: PersonalCategoryChipLayout,
  b: PersonalCategoryChipLayout
): boolean {
  return (
    personalCategoryChipSetsEqual(
      a.soloRowCategories,
      b.soloRowCategories
    ) &&
    personalCategoryChipSetsEqual(
      a.truncatedCategories,
      b.truncatedCategories
    )
  );
}
