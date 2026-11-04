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

  it('fills the pencil when a note exists', async () => {
    await renderRow(true);
    const filledButton = screen.getByRole('button', { name: 'Private journal' });
    expect(filledButton.className).toContain('prayer-card-journal-button-filled');
  });

  it('leaves the pencil outline when no note exists', async () => {
    await renderRow(false);
    const outline = screen.getByRole('button', { name: 'Private journal' });
    expect(outline.className).not.toContain('prayer-card-journal-button-filled');
  });
});
