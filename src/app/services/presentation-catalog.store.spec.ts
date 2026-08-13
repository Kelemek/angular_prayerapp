import { describe, it, expect, beforeEach } from 'vitest';
import { PresentationCatalogStore } from './presentation-catalog.store';

describe('PresentationCatalogStore', () => {
  let store: PresentationCatalogStore;

  beforeEach(() => {
    store = new PresentationCatalogStore();
  });

  it('syncPromptsFromService does not downgrade after Pray For floor is set', () => {
    const prompt = {
      id: 'p1',
      title: 'A',
      type: 't1',
      description: 'd',
      created_at: 't',
      updated_at: 't',
      prayed_for_count: 4,
    };
    store.prompts = [prompt];
    store.setPromptPrayedForFloor('p1', 4);

    store.syncPromptsFromService([
      {
        id: 'p1',
        title: 'A',
        type: 't1',
        description: 'd',
        created_at: 't',
        updated_at: 't',
        prayed_for_count: 3,
      },
    ]);

    expect(store.prompts[0].prayed_for_count).toBe(4);
  });

  it('syncPromptsFromService does not treat a stale zero hydrate as logout while floor is set', () => {
    const prompt = {
      id: 'p1',
      title: 'A',
      type: 't1',
      description: 'd',
      created_at: 't',
      updated_at: 't',
      prayed_for_count: 4,
    };
    store.prompts = [prompt];
    store.setPromptPrayedForFloor('p1', 4);

    store.syncPromptsFromService([
      {
        id: 'p1',
        title: 'A',
        type: 't1',
        description: 'd',
        created_at: 't',
        updated_at: 't',
        prayed_for_count: 0,
      },
    ]);

    expect(store.prompts[0].prayed_for_count).toBe(4);
  });

  it('clearPromptPrayedForFloors allows service zero counts after session change', () => {
    const prompt = {
      id: 'p1',
      title: 'A',
      type: 't1',
      description: 'd',
      created_at: 't',
      updated_at: 't',
      prayed_for_count: 7,
    };
    store.prompts = [prompt];
    store.combinedShuffledItems = [{ ...prompt }];
    store.setPromptPrayedForFloor('p1', 7);
    store.clearPromptPrayedForFloors();

    store.syncPromptsFromService([
      {
        id: 'p1',
        title: 'A',
        type: 't1',
        description: 'd',
        created_at: 't',
        updated_at: 't',
        prayed_for_count: 0,
      },
    ]);

    expect(store.prompts[0].prayed_for_count).toBe(0);
    expect(store.combinedShuffledItems[0].prayed_for_count).toBe(0);
  });

  it('syncPromptsFromService drops removed prompts from combined shuffle deck', () => {
    const prompt1 = {
      id: 'p1',
      title: 'A',
      type: 't1',
      description: 'd',
      created_at: 't',
      updated_at: 't',
      prayed_for_count: 1,
    };
    const prompt2 = {
      id: 'p2',
      title: 'B',
      type: 't2',
      description: 'd',
      created_at: 't',
      updated_at: 't',
      prayed_for_count: 2,
    };
    store.prompts = [prompt1, prompt2];
    store.combinedShuffledItems = [prompt1, prompt2];

    store.syncPromptsFromService([prompt1]);

    expect(store.prompts.map((prompt) => prompt.id)).toEqual(['p1']);
    expect(store.combinedShuffledItems.map((item) => item.id)).toEqual(['p1']);
  });

  it('shuffleVisibleItems rebuilds combined deck from refreshed source lists', () => {
    const options = {
      contentTypes: [] as const,
      randomize: true,
      selectedPersonalCategories: [],
      selectedPromptCategories: [],
    };
    store.prayers = [{ id: 'c1', prayer_for: 'A', updates: [] } as any];
    store.prompts = [
      {
        id: 'p1',
        type: 'encouragement',
        description: 'd',
        created_at: 't',
        updated_at: 't',
        title: 't',
      },
    ];

    store.shuffleVisibleItems(options, (items) => items);
    expect(store.combinedShuffledItems.map((item) => item.id).sort()).toEqual([
      'c1',
      'p1',
    ]);

    store.prayers = [
      { id: 'c1', prayer_for: 'A', updates: [] } as any,
      { id: 'c2', prayer_for: 'B', updates: [] } as any,
    ];
    store.shuffleVisibleItems(options, (items) => items);

    expect(store.combinedShuffledItems.map((item) => item.id).sort()).toEqual([
      'c1',
      'c2',
      'p1',
    ]);
  });

  it('getVisibleItems returns reshuffled deck after prompt category filter changes', () => {
    store.prayers = [{ id: 'c1', prayer_for: 'A', updates: [] } as any];
    store.prompts = [
      {
        id: 'p1',
        type: 'encouragement',
        description: 'd',
        created_at: 't',
        updated_at: 't',
        title: 't',
      },
      {
        id: 'p2',
        type: 'reflection',
        description: 'd',
        created_at: 't',
        updated_at: 't',
        title: 't',
      },
    ];
    const baseOptions = {
      contentTypes: ['prayers', 'prompts'] as const,
      randomize: true,
      selectedPersonalCategories: [] as string[],
      selectedPromptCategories: [] as string[],
    };

    store.shuffleVisibleItems(baseOptions, (items) => items);
    store.shuffleVisibleItems(
      {
        ...baseOptions,
        selectedPromptCategories: ['encouragement'],
      },
      (items) => items
    );

    expect(
      store
        .getVisibleItems({
          ...baseOptions,
          selectedPromptCategories: ['encouragement'],
        })
        .map((item) => item.id)
        .sort()
    ).toEqual(['c1', 'p1']);
  });

  it('applyLivePrayedForFloor keeps shared prayer tallies on refetch', () => {
    const previous = [{ id: 'prayer-1', prayed_for_count: 5 }];
    const next = [{ id: 'prayer-1', prayed_for_count: 2 }];
    const merged = store.applyLivePrayedForFloor(previous, next);
    expect(merged[0].prayed_for_count).toBe(5);
  });

  it('buildVisibleItems combines selected content types and category filters', () => {
    store.prayers = [{ id: 'c1', prayer_for: 'A', updates: [] } as any];
    store.prompts = [
      { id: 'p1', type: 'encouragement', description: 'd', created_at: 't', updated_at: 't', title: 't' },
      { id: 'p2', type: 'reflection', description: 'd', created_at: 't', updated_at: 't', title: 't' },
    ];
    store.personalPrayers = [
      { id: 'pp1', category: 'Family', prayer_for: 'Me', updates: [] } as any,
      { id: 'pp2', category: 'Health', prayer_for: 'Me', updates: [] } as any,
    ];

    const items = store.buildVisibleItems({
      contentTypes: ['prayers', 'prompts', 'personal'],
      randomize: false,
      selectedPersonalCategories: ['Family'],
      selectedPromptCategories: ['encouragement'],
    });

    expect(items.map((item) => item.id)).toEqual(['c1', 'p1', 'pp1']);
  });

  it('buildVisibleItems returns prayers when prayers is the sole content type', () => {
    const prayers = [{ id: 'p1', prayer_for: 'John', updates: [] } as any];
    store.prayers = prayers;
    store.prompts = [{ id: 'pr1', type: 'encouragement' } as any];

    expect(
      store.buildVisibleItems({
        contentTypes: ['prayers'],
        randomize: false,
        selectedPersonalCategories: [],
        selectedPromptCategories: [],
      })
    ).toEqual(prayers);
  });

  it('buildVisibleItems returns prompts when prompts is the sole content type', () => {
    const prompts = [{ id: 'pr1', type: 'encouragement' } as any];
    store.prayers = [{ id: 'p1', prayer_for: 'John', updates: [] } as any];
    store.prompts = prompts;

    expect(
      store.buildVisibleItems({
        contentTypes: ['prompts'],
        randomize: false,
        selectedPersonalCategories: [],
        selectedPromptCategories: [],
      })
    ).toEqual(prompts);
  });

  it('buildVisibleItems combines prayers and prompts when all types are selected', () => {
    store.prayers = [{ id: 'p1', prayer_for: 'John', updates: [] } as any];
    store.prompts = [{ id: 'pr1', type: 'encouragement' } as any];

    const items = store.buildVisibleItems({
      contentTypes: [],
      randomize: false,
      selectedPersonalCategories: [],
      selectedPromptCategories: [],
    });

    expect(items.map((item) => item.id)).toEqual(['p1', 'pr1']);
  });

  it('buildVisibleItems returns member prayers when members is the sole content type', () => {
    const members = [{ id: 'pc-member-1', prayer_for: 'Member', updates: [] } as any];
    store.memberPrayers = members;

    expect(
      store.buildVisibleItems({
        contentTypes: ['members'],
        randomize: false,
        selectedPersonalCategories: [],
        selectedPromptCategories: [],
      })
    ).toEqual(members);
  });

  it('shuffleVisibleItems shuffles only prayers when prayers is the sole content type', () => {
    const prayers = [
      { id: 'p1', prayer_for: 'John' },
      { id: 'p2', prayer_for: 'Jane' },
      { id: 'p3', prayer_for: 'Bob' },
    ] as any[];
    const prompts = [{ id: 'pr1', type: 'encouragement' }] as any[];
    store.prayers = [...prayers];
    store.prompts = [...prompts];

    store.shuffleVisibleItems(
      {
        contentTypes: ['prayers'],
        randomize: true,
        selectedPersonalCategories: [],
        selectedPromptCategories: [],
      },
      (items) => [...items].reverse()
    );

    expect(store.prayers.map((item) => item.id)).toEqual(['p3', 'p2', 'p1']);
    expect(store.prompts).toEqual(prompts);
  });

  it('shuffleVisibleItems stores a combined shuffle for multi-type decks', () => {
    store.prayers = [{ id: 'p1', prayer_for: 'John' } as any];
    store.prompts = [{ id: 'pr1', type: 'encouragement' } as any];

    store.shuffleVisibleItems(
      {
        contentTypes: [],
        randomize: true,
        selectedPersonalCategories: [],
        selectedPromptCategories: [],
      },
      (items) => [...items].reverse()
    );

    expect(store.combinedShuffledItems.map((item) => item.id)).toEqual([
      'pr1',
      'p1',
    ]);
  });
});
