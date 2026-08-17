/** Scroll the Prayer Editor section shell to the top of the viewport (pagination). */
export function scrollPrayerEditorSectionToTop(container: HTMLElement): void {
  setTimeout(() => {
    const containerTop =
      container.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: containerTop, behavior: 'smooth' });
  }, 0);
}
