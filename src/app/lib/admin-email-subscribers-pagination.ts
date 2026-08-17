import type { EmailSubscriberRow } from './admin-email-subscribers';

export function sliceEmailSubscriberPage(
  rows: EmailSubscriberRow[],
  currentPage: number,
  pageSize: number,
): EmailSubscriberRow[] {
  const startIndex = (currentPage - 1) * pageSize;
  return rows.slice(startIndex, startIndex + pageSize);
}

export function emailSubscriberTotalPages(
  totalItems: number,
  pageSize: number,
): number {
  return Math.ceil(totalItems / pageSize) || 1;
}

export function emailSubscriberClampPage(
  page: number,
  totalItems: number,
  pageSize: number,
): number {
  const totalPages = emailSubscriberTotalPages(totalItems, pageSize);
  return Math.max(1, Math.min(page, totalPages));
}

export function emailSubscriberPaginationRange(
  currentPage: number,
  totalPages: number,
  maxButtons: number,
): number[] {
  const pages: number[] = [];
  if (totalPages <= maxButtons) {
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  const half = Math.floor(maxButtons / 2);
  let start = Math.max(1, currentPage - half);
  let end = Math.min(totalPages, start + maxButtons - 1);
  if (end - start + 1 < maxButtons) {
    start = Math.max(1, end - maxButtons + 1);
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

export function emailSubscriberPageAfterDelete(
  currentPage: number,
  pageSize: number,
  remainingCount: number,
): number {
  const startIndex = (currentPage - 1) * pageSize;
  if (startIndex >= remainingCount && currentPage > 1) {
    return currentPage - 1;
  }
  return currentPage;
}

/** Scroll the Email Subscribers section shell to the top of the viewport. */
export function scrollEmailSubscribersSectionToTop(container: HTMLElement): void {
  setTimeout(() => {
    const containerTop =
      container.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: containerTop, behavior: 'smooth' });
  }, 0);
}
