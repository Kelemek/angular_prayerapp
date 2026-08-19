import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/angular';
import { userEvent } from '@testing-library/user-event';
import { MemorizationRecommendationCardComponent } from './memorization-recommendation-card.component';
import { ScriptureService } from '../../services/scripture.service';
import { resolveScriptureHoverPreviewComponentResources } from '../scripture-hover-preview/scripture-hover-preview-component-resources.spec-helper';
import type { MemorizationRecommendation } from '../../types/memorization';

beforeAll(async () => {
  await resolveScriptureHoverPreviewComponentResources();
});

const sample: MemorizationRecommendation = {
  id: 'r1',
  reference: 'John 3:16',
  translation: 'esv',
  categoryId: 'cat-1',
  displayOrder: 0,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const mockScriptureService = {
  getPassage: vi.fn(() =>
    Promise.resolve({
      reference: 'John 3:16',
      text: 'For God so loved the world',
      translation: 'esv',
    })
  ),
  getAudioUrl: vi.fn(),
};

describe('MemorizationRecommendationCardComponent', () => {
  it('emits add when not already added', () => {
    const card = new MemorizationRecommendationCardComponent();
    card.recommendation = sample;
    card.alreadyAdded = false;
    const emit = vi.spyOn(card.add, 'emit');
    card.onClick();
    expect(emit).toHaveBeenCalledWith(sample);
  });

  it('does not emit when already added', () => {
    const card = new MemorizationRecommendationCardComponent();
    card.recommendation = sample;
    card.alreadyAdded = true;
    const emit = vi.spyOn(card.add, 'emit');
    card.onClick();
    expect(emit).not.toHaveBeenCalled();
  });

  it('does not emit when busy', () => {
    const card = new MemorizationRecommendationCardComponent();
    card.recommendation = sample;
    card.busy = true;
    const emit = vi.spyOn(card.add, 'emit');
    card.onClick();
    expect(emit).not.toHaveBeenCalled();
  });

  it('wraps card in scripture hover preview and emits add on click', async () => {
    const user = userEvent.setup();
    const add = vi.fn();
    const { fixture, container } = await render(MemorizationRecommendationCardComponent, {
      componentInputs: { recommendation: sample, alreadyAdded: false },
      providers: [{ provide: ScriptureService, useValue: mockScriptureService }],
    });
    fixture.componentInstance.add.subscribe(add);

    expect(container.querySelector('app-scripture-hover-preview')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: /Add John 3:16/i }));
    expect(add).toHaveBeenCalledWith(sample);
  });
});
