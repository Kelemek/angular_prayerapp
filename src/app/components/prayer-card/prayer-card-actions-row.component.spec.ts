import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ɵresolveComponentResources as resolveComponentResources } from '@angular/core';
import { render, screen } from '@testing-library/angular';
import { beforeAll, describe, expect, it } from 'vitest';
import { getPrayerCardVariantLayout } from '../../lib/prayer-card-layout';
import { PrayerJournalService } from '../../services/prayer-journal.service';
import { PrayerCardActionsRowComponent } from './prayer-card-actions-row.component';

const componentDir = dirname(fileURLToPath(import.meta.url));

beforeAll(async () => {
  await resolveComponentResources((url) => {
    const path = join(componentDir, url);
    if (!existsSync(path)) {
      throw new Error(`Component resource not found: ${url}`);
    }
    return Promise.resolve(readFileSync(path, 'utf-8'));
  });
});

function journalStub(present: boolean) {
  return {
    hasNote: () => present,
  };
}

async function renderRow(present: boolean) {
  return render(PrayerCardActionsRowComponent, {
    componentProperties: {
      variantLayout: getPrayerCardVariantLayout('home'),
      showTourAnchors: false,
      tourPersonalWalkthroughAnchors: false,
      tourUpdateAnchors: false,
      tourJournalAnchors: false,
      tourPrayForEncouragementAnchors: false,
      prayedForCount: 1,
      prayedForCountLabel: 'Prayers',
      showPrayedForBadge: true,
      usesPersonalCooldown: false,
      canPrayFor: true,
      showAddUpdate: true,
      showPrayForButton: true,
      showPrayingCount: true,
      journalKind: 'community',
      journalPrayerId: 'prayer-1',
    },
    providers: [
      { provide: PrayerJournalService, useValue: journalStub(present) },
    ],
  });
}

describe('PrayerCardActionsRowComponent journal', () => {
  it('places Journal between Add Update and Pray For', async () => {
    await renderRow(false);
    const names = screen.getAllByRole('button').map((button) =>
      button.getAttribute('aria-label') ?? button.textContent?.trim()
    );
    expect(names).toEqual(['Add Update', 'Private journal', 'Pray For']);
  });

  it('uses the Pray For blue and colors the pencil when a note exists', async () => {
    await renderRow(true);
    const journal = screen.getByRole('button', { name: 'Private journal' });
    const prayFor = screen.getByRole('button', { name: 'Pray For' });
    expect(journal.className).toContain('btn-chip-blue');
    expect(prayFor.className).toContain('btn-chip-blue');
    expect(journal.className).not.toContain('btn-chip-gray');
    expect(journal.className).toContain('prayer-card-journal-button-noted');
    expect(journal.querySelector('.journal-pencil-body')).toBeTruthy();
    expect(journal.querySelector('.journal-pencil-eraser')).toBeTruthy();

    const css = readFileSync(join(process.cwd(), 'src/styles.css'), 'utf8');
    expect(journal.querySelector('svg')?.getAttribute('stroke-width')).toBe('2');
    expect(css).toContain(
      '.prayer-card-journal-button-noted .journal-pencil-body,\n.prayer-card-journal-button-noted .journal-pencil-eraser {\n  stroke-width: 1;'
    );
    expect(css).toContain('.prayer-card-journal-button-noted .journal-pencil-body {\n  fill: #f5b942;');
    expect(css).toContain('.prayer-card-journal-button-noted .journal-pencil-eraser {\n  fill: #e03a3a;');
    expect(css).not.toContain('fill: currentColor');
  });

  it('leaves the pencil outline with no colored fills when no note exists', async () => {
    await renderRow(false);
    const outline = screen.getByRole('button', { name: 'Private journal' });
    expect(outline.className).toContain('btn-chip-blue');
    expect(outline.className).not.toContain('prayer-card-journal-button-noted');
    expect(outline.querySelector('.journal-pencil-body')).toBeTruthy();
    expect(outline.querySelector('.journal-pencil-eraser')).toBeTruthy();
  });
});
