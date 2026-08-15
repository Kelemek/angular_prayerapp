import { describe, expect, it } from 'vitest';
import {
  PRESENTATION_HOME_HANDOFF_STATE_KEY,
  PRESENTATION_HOME_NAV_STATE_KEY,
  PRESENTATION_HOME_PERSONAL_CATS_QUERY_PARAM_KEY,
  PRESENTATION_HOME_PROMPT_CATS_QUERY_PARAM_KEY,
  PRESENTATION_HOME_QUERY_PARAM_KEY,
  PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY,
  buildPresentationHomeHandoff,
  HOME_RETURN_CONTEXT_STATE_KEY,
  mapHomeTabToPresentationStatusFilters,
  parseHomeReturnContextFromState,
  parsePresentationHomeHandoffFromQueryParams,
  parsePresentationHomeHandoffFromState,
  serializePresentationHomeHandoffQueryParams,
  serializePresentationStatusQueryParam,
} from './presentation';

describe('mapHomeTabToPresentationStatusFilters', () => {
  it('maps current, answered, archived, and total tabs', () => {
    expect(mapHomeTabToPresentationStatusFilters('current')).toEqual({
      current: true,
      answered: false,
      archived: false,
    });
    expect(mapHomeTabToPresentationStatusFilters('answered')).toEqual({
      current: false,
      answered: true,
      archived: false,
    });
    expect(mapHomeTabToPresentationStatusFilters('archived')).toEqual({
      current: false,
      answered: false,
      archived: true,
    });
    expect(mapHomeTabToPresentationStatusFilters('total')).toEqual({
      current: false,
      answered: false,
      archived: false,
    });
  });
});

describe('serializePresentationStatusQueryParam', () => {
  it('serializes single-status filters and all', () => {
    expect(
      serializePresentationStatusQueryParam({
        current: true,
        answered: false,
        archived: false,
      })
    ).toBe('current');
    expect(
      serializePresentationStatusQueryParam({
        current: false,
        answered: true,
        archived: false,
      })
    ).toBe('answered');
    expect(
      serializePresentationStatusQueryParam({
        current: false,
        answered: false,
        archived: true,
      })
    ).toBe('archived');
    expect(
      serializePresentationStatusQueryParam({
        current: false,
        answered: false,
        archived: false,
      })
    ).toBe('all');
    expect(
      serializePresentationStatusQueryParam({
        current: true,
        answered: true,
        archived: false,
      })
    ).toBeNull();
  });
});

describe('buildPresentationHomeHandoff', () => {
  it('includes prayer status filters for current, answered, archived, and total tabs', () => {
    expect(
      buildPresentationHomeHandoff({
        contentTypes: ['prayers'],
        activeFilter: 'answered',
      }).statusFilters
    ).toEqual({ current: false, answered: true, archived: false });

    expect(
      buildPresentationHomeHandoff({
        contentTypes: ['prayers'],
        activeFilter: 'archived',
      }).statusFilters
    ).toEqual({ current: false, answered: false, archived: true });

    expect(
      buildPresentationHomeHandoff({
        contentTypes: ['prayers'],
        activeFilter: 'total',
      }).statusFilters
    ).toEqual({ current: false, answered: false, archived: false });
  });

  it('includes prompt categories when a prompt type is selected', () => {
    expect(
      buildPresentationHomeHandoff({
        contentTypes: ['prompts'],
        activeFilter: 'prompts',
        selectedPromptTypes: ['Church'],
      })
    ).toEqual({
      contentTypes: ['prompts'],
      promptCategories: ['Church'],
      returnContext: {
        activeFilter: 'prompts',
        selectedPromptTypes: ['Church'],
      },
    });
  });

  it('includes personal categories when a named category chip is selected', () => {
    expect(
      buildPresentationHomeHandoff({
        contentTypes: ['personal'],
        activeFilter: 'personal',
        selectedPersonalCategories: ['Evening'],
        personalCategoryFilterMode: 'named',
      })
    ).toEqual({
      contentTypes: ['personal'],
      statusFilters: { current: false, answered: false, archived: false },
      personalCategories: ['Evening'],
      returnContext: {
        activeFilter: 'personal',
        selectedPersonalCategories: ['Evening'],
        personalCategoryFilterMode: 'named',
      },
    });
  });

  it('maps personal Current / Answered / Total chips to status filters', () => {
    expect(
      buildPresentationHomeHandoff({
        contentTypes: ['personal'],
        activeFilter: 'personal',
        personalCategoryFilterMode: 'current',
      })
    ).toEqual({
      contentTypes: ['personal'],
      statusFilters: { current: true, answered: false, archived: false },
      returnContext: {
        activeFilter: 'personal',
        personalCategoryFilterMode: 'current',
      },
    });

    expect(
      buildPresentationHomeHandoff({
        contentTypes: ['personal'],
        activeFilter: 'personal',
        personalCategoryFilterMode: 'answered',
      }).statusFilters
    ).toEqual({ current: false, answered: true, archived: false });

    expect(
      buildPresentationHomeHandoff({
        contentTypes: ['personal'],
        activeFilter: 'personal',
        personalCategoryFilterMode: 'total',
      }).statusFilters
    ).toEqual({ current: false, answered: false, archived: false });
  });

  it('includes return context for restoring Home after presentation exit', () => {
    expect(
      buildPresentationHomeHandoff({
        contentTypes: ['prompts'],
        activeFilter: 'prompts',
        selectedPromptTypes: ['Church'],
      }).returnContext
    ).toEqual({
      activeFilter: 'prompts',
      selectedPromptTypes: ['Church'],
    });
  });
});

describe('parseHomeReturnContextFromState', () => {
  it('reads return context from router state', () => {
    expect(
      parseHomeReturnContextFromState({
        [HOME_RETURN_CONTEXT_STATE_KEY]: {
          activeFilter: 'personal',
          selectedPersonalCategories: ['Evening'],
        },
      })
    ).toEqual({
      activeFilter: 'personal',
      selectedPersonalCategories: ['Evening'],
      personalCategoryFilterMode: 'named',
    });
  });

  it('defaults legacy personal handoff without mode to Total', () => {
    expect(
      parseHomeReturnContextFromState({
        [HOME_RETURN_CONTEXT_STATE_KEY]: {
          activeFilter: 'personal',
        },
      })
    ).toEqual({
      activeFilter: 'personal',
      personalCategoryFilterMode: 'total',
    });
  });
});

describe('parsePresentationHomeHandoffFromState', () => {
  it('reads the new handoff object from router state', () => {
    expect(
      parsePresentationHomeHandoffFromState({
        [PRESENTATION_HOME_HANDOFF_STATE_KEY]: {
          contentTypes: ['prayers'],
          statusFilters: { current: false, answered: true, archived: false },
        },
      })
    ).toEqual({
      contentTypes: ['prayers'],
      statusFilters: { current: false, answered: true, archived: false },
    });
  });

  it('supports legacy content-type-only state', () => {
    expect(
      parsePresentationHomeHandoffFromState({
        [PRESENTATION_HOME_NAV_STATE_KEY]: ['prompts'],
      })
    ).toEqual({ contentTypes: ['prompts'] });
  });
});

describe('presentation home handoff query params', () => {
  it('round-trips status and category filters', () => {
    const handoff = buildPresentationHomeHandoff({
      contentTypes: ['prompts'],
      activeFilter: 'prompts',
      selectedPromptTypes: ['Family, Friends'],
    });
    const params = serializePresentationHomeHandoffQueryParams(handoff);
    expect(params[PRESENTATION_HOME_QUERY_PARAM_KEY]).toBe('prompts');
    expect(params[PRESENTATION_HOME_PROMPT_CATS_QUERY_PARAM_KEY]).toBe(
      encodeURIComponent('Family, Friends')
    );

    const parsed = parsePresentationHomeHandoffFromQueryParams(
      (key) => params[key] ?? null
    );
    expect(parsed).toEqual({
      contentTypes: ['prompts'],
      promptCategories: ['Family, Friends'],
      returnContext: {
        activeFilter: 'prompts',
        selectedPromptTypes: ['Family, Friends'],
      },
    });
  });

  it('round-trips return context for new-tab navigation', () => {
    const handoff = buildPresentationHomeHandoff({
      contentTypes: ['personal'],
      activeFilter: 'personal',
      selectedPersonalCategories: ['Evening'],
      personalCategoryFilterMode: 'named',
    });
    const params = serializePresentationHomeHandoffQueryParams(handoff);
    expect(params.homeReturnFilter).toBe('personal');
    expect(params.homePersonalCats).toBe('Evening');
    expect(params.homeStatus).toBe('all');

    const parsed = parsePresentationHomeHandoffFromQueryParams(
      (key) => params[key] ?? null
    );
    expect(parsed?.returnContext).toEqual({
      activeFilter: 'personal',
      selectedPersonalCategories: ['Evening'],
      personalCategoryFilterMode: 'named',
    });
  });

  it('serializes answered status for new-tab navigation', () => {
    const params = serializePresentationHomeHandoffQueryParams({
      contentTypes: ['prayers'],
      statusFilters: { current: false, answered: true, archived: false },
    });
    expect(params[PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY]).toBe('answered');

    const parsed = parsePresentationHomeHandoffFromQueryParams((key) => {
      if (key === PRESENTATION_HOME_QUERY_PARAM_KEY) return 'prayers';
      if (key === PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY) return 'answered';
      return null;
    });
    expect(parsed?.statusFilters).toEqual({
      current: false,
      answered: true,
      archived: false,
    });
  });

  it('serializes archived status for new-tab navigation', () => {
    const handoff = buildPresentationHomeHandoff({
      contentTypes: ['prayers'],
      activeFilter: 'archived',
    });
    const params = serializePresentationHomeHandoffQueryParams(handoff);
    expect(params[PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY]).toBe('archived');
    expect(params.homeReturnFilter).toBe('archived');

    const parsed = parsePresentationHomeHandoffFromQueryParams(
      (key) => params[key] ?? null
    );
    expect(parsed?.statusFilters).toEqual({
      current: false,
      answered: false,
      archived: true,
    });
    expect(parsed?.returnContext?.activeFilter).toBe('archived');
  });

  it('serializes personal categories for new-tab navigation', () => {
    const params = serializePresentationHomeHandoffQueryParams({
      contentTypes: ['personal'],
      personalCategories: ['Morning'],
    });
    expect(params[PRESENTATION_HOME_PERSONAL_CATS_QUERY_PARAM_KEY]).toBe(
      'Morning'
    );
  });
});
