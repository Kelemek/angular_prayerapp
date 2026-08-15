function namedFilterNeedles(name: string): string[] {
  return [`**${name}**`, `"${name}"`];
}

function sliceNamedFilterExcerpt(rest: string, needle: string): string {
  const after = needle.length;
  const terminators = [
    rest.indexOf(', "', after),
    rest.indexOf(', and "', after),
  ].filter((index) => index > 0);

  if (needle.startsWith('**')) {
    const nextBoldClause = rest
      .slice(after)
      .search(/,\s+(?:and\s+)?\*\*[^*]+\*\*\s+(?:shows?|displays?)\b/i);
    if (nextBoldClause >= 0) {
      terminators.push(after + nextBoldClause);
    }
  }

  const next = terminators.length > 0 ? Math.min(...terminators) : -1;
  if (next > 0) {
    return rest.slice(0, next).trim();
  }
  const dot = rest.indexOf('.', after);
  return dot > 0 ? rest.slice(0, dot + 1).trim() : rest.trim();
}

/**
 * Pull a `**Name** …` or `"Name" …` clause from **Filter Options** overview text
 * for per-filter guided-tour popovers. When multiple matches exist, returns the
 * longest excerpt so tab-list mentions do not win over descriptive clauses.
 */
export function excerptForNamedFilter(overview: string, name: string): string {
  let best = '';
  for (const needle of namedFilterNeedles(name)) {
    let searchFrom = 0;
    while (searchFrom < overview.length) {
      const idx = overview.indexOf(needle, searchFrom);
      if (idx < 0) {
        break;
      }
      const excerpt = sliceNamedFilterExcerpt(overview.slice(idx), needle);
      if (excerpt.length > best.length) {
        best = excerpt;
      }
      searchFrom = idx + needle.length;
    }
  }
  return best;
}

const DESCRIPTIVE_FILTER_TOUR_EXCERPT =
  /\b(shows|display|displays|tap|use|view|includes|each show)\b/i;

/** True when an excerpt explains what the filter does (not only a chip list). */
export function isDescriptiveFilterTourExcerpt(excerpt: string): boolean {
  return excerpt.length > 0 && DESCRIPTIVE_FILTER_TOUR_EXCERPT.test(excerpt);
}
