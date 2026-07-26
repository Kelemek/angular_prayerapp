export type PresentationContentType =
  | 'prayers'
  | 'prompts'
  | 'personal'
  | 'members'
  | 'all';

export type SelectablePresentationContentType = Exclude<
  PresentationContentType,
  'all'
>;

export const SELECTABLE_CONTENT_TYPES: readonly SelectablePresentationContentType[] =
  ['prayers', 'prompts', 'personal', 'members'];

export function isSelectablePresentationContentType(
  value: unknown
): value is SelectablePresentationContentType {
  return (
    typeof value === 'string' &&
    (SELECTABLE_CONTENT_TYPES as readonly string[]).includes(value)
  );
}

export function includesPresentationContentType(
  types: SelectablePresentationContentType[],
  type: SelectablePresentationContentType
): boolean {
  return types.length === 0 || types.includes(type);
}

export function isPrayersOnlyContentTypes(
  types: SelectablePresentationContentType[]
): boolean {
  return types.length === 1 && types[0] === 'prayers';
}

export function showsPrayerTimeStatusFilters(
  types: SelectablePresentationContentType[]
): boolean {
  return (
    types.length === 0 ||
    types.includes('prayers') ||
    types.includes('personal')
  );
}

export function normalizeContentTypes(
  value: unknown
): SelectablePresentationContentType[] | null {
  if (Array.isArray(value)) {
    const types = value.filter(isSelectablePresentationContentType);
    return types;
  }

  if (typeof value === 'string' && isSelectablePresentationContentType(value)) {
    return [value];
  }

  if (value === 'all') {
    return [];
  }

  return null;
}

export type PresentationTimeFilter =
  | 'week'
  | 'twoweeks'
  | 'month'
  | 'year'
  | 'all';

export interface PresentationSettings {
  contentTypes: SelectablePresentationContentType[];
  randomize: boolean;
  smartMode: boolean;
  displayDuration: number;
  loop: boolean;
  timeFilter: PresentationTimeFilter;
  statusFilters: { current: boolean; answered: boolean };
  prayerTimerMinutes: number;
}

export type HomePresentationFilter =
  | 'current'
  | 'answered'
  | 'total'
  | 'prompts'
  | 'personal'
  | 'memorize'
  | 'planning_center_list';

export type DefaultPrayerView = 'current' | 'personal';

export interface HomeReturnContext {
  activeFilter: HomePresentationFilter;
  selectedPromptTypes?: string[];
  selectedPersonalCategories?: string[];
}

export interface PresentationHomeHandoff {
  contentTypes: SelectablePresentationContentType[];
  statusFilters?: { current: boolean; answered: boolean };
  promptCategories?: string[];
  personalCategories?: string[];
  returnContext?: HomeReturnContext;
}

/** Router `history.state` key for one-shot Home → Pray handoff. */
export const PRESENTATION_HOME_HANDOFF_STATE_KEY = 'presentationHomeHandoff';

/** Router `history.state` key for restoring Home tab/category after presentation exit. */
export const HOME_RETURN_CONTEXT_STATE_KEY = 'homeReturnContext';

/** Legacy router state key for content-type-only handoff. */
export const PRESENTATION_HOME_NAV_STATE_KEY = 'presentationHomeContentTypes';

/** Query param when Pray opens presentation in a new tab (native link navigation). */
export const PRESENTATION_HOME_QUERY_PARAM_KEY = 'homeTypes';

export const PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY = 'homeStatus';

export const PRESENTATION_HOME_PROMPT_CATS_QUERY_PARAM_KEY = 'homePromptCats';

export const PRESENTATION_HOME_PERSONAL_CATS_QUERY_PARAM_KEY = 'homePersonalCats';

export const HOME_RETURN_FILTER_QUERY_PARAM_KEY = 'homeReturnFilter';

export function mapHomeTabToPresentationStatusFilters(
  filter: 'current' | 'answered' | 'total'
): { current: boolean; answered: boolean } {
  switch (filter) {
    case 'current':
      return { current: true, answered: false };
    case 'answered':
      return { current: false, answered: true };
    case 'total':
      return { current: false, answered: false };
    default: {
      const _exhaustive: never = filter;
      return _exhaustive;
    }
  }
}

export function buildPresentationHomeHandoff(input: {
  contentTypes: SelectablePresentationContentType[];
  activeFilter: HomePresentationFilter;
  selectedPromptTypes?: string[];
  selectedPersonalCategories?: string[];
}): PresentationHomeHandoff {
  const handoff: PresentationHomeHandoff = {
    contentTypes: [...input.contentTypes],
  };

  if (
    input.activeFilter === 'current' ||
    input.activeFilter === 'answered' ||
    input.activeFilter === 'total'
  ) {
    handoff.statusFilters = mapHomeTabToPresentationStatusFilters(
      input.activeFilter
    );
  }

  if (input.activeFilter === 'prompts' && input.selectedPromptTypes?.length) {
    handoff.promptCategories = [...input.selectedPromptTypes];
  }

  if (
    input.activeFilter === 'personal' &&
    input.selectedPersonalCategories?.length
  ) {
    handoff.personalCategories = [...input.selectedPersonalCategories];
  }

  handoff.returnContext = buildHomeReturnContext(input);

  return handoff;
}

export function buildHomeReturnContext(input: {
  activeFilter: HomePresentationFilter;
  selectedPromptTypes?: string[];
  selectedPersonalCategories?: string[];
}): HomeReturnContext {
  const returnContext: HomeReturnContext = {
    activeFilter: input.activeFilter,
  };

  if (input.selectedPromptTypes?.length) {
    returnContext.selectedPromptTypes = [...input.selectedPromptTypes];
  }

  if (input.selectedPersonalCategories?.length) {
    returnContext.selectedPersonalCategories = [
      ...input.selectedPersonalCategories,
    ];
  }

  return returnContext;
}

function isHomePresentationFilter(
  value: unknown
): value is HomePresentationFilter {
  return (
    typeof value === 'string' &&
    ([
      'current',
      'answered',
      'total',
      'prompts',
      'personal',
      'memorize',
      'planning_center_list',
    ] as const satisfies readonly HomePresentationFilter[]).includes(
      value as HomePresentationFilter
    )
  );
}

function normalizeHomeReturnContext(
  value: unknown
): HomeReturnContext | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<HomeReturnContext>;
  if (!isHomePresentationFilter(raw.activeFilter)) {
    return null;
  }

  const returnContext: HomeReturnContext = {
    activeFilter: raw.activeFilter,
  };

  if (Array.isArray(raw.selectedPromptTypes)) {
    const types = raw.selectedPromptTypes.filter(
      (type): type is string => typeof type === 'string' && type.length > 0
    );
    if (types.length > 0) {
      returnContext.selectedPromptTypes = types;
    }
  }

  if (Array.isArray(raw.selectedPersonalCategories)) {
    const categories = raw.selectedPersonalCategories.filter(
      (category): category is string =>
        typeof category === 'string' && category.length > 0
    );
    if (categories.length > 0) {
      returnContext.selectedPersonalCategories = categories;
    }
  }

  return returnContext;
}

export function parseHomeReturnContextFromState(
  state: Record<string, unknown> | null | undefined
): HomeReturnContext | null {
  if (!state) {
    return null;
  }

  return normalizeHomeReturnContext(state[HOME_RETURN_CONTEXT_STATE_KEY]);
}

function parseEncodedCategoryList(value: string): string[] {
  return value
    .split(',')
    .map((part) => decodeURIComponent(part.trim()))
    .filter((part) => part.length > 0);
}

function normalizePresentationHomeHandoff(
  value: unknown
): PresentationHomeHandoff | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const raw = value as Partial<PresentationHomeHandoff>;
  const contentTypes = normalizeContentTypes(raw.contentTypes);
  if (!contentTypes || contentTypes.length === 0) {
    return null;
  }

  const handoff: PresentationHomeHandoff = { contentTypes };

  if (raw.statusFilters && typeof raw.statusFilters === 'object') {
    const statusFilters = raw.statusFilters as {
      current?: unknown;
      answered?: unknown;
    };
    if (
      typeof statusFilters.current === 'boolean' &&
      typeof statusFilters.answered === 'boolean'
    ) {
      handoff.statusFilters = {
        current: statusFilters.current,
        answered: statusFilters.answered,
      };
    }
  }

  if (Array.isArray(raw.promptCategories)) {
    const categories = raw.promptCategories.filter(
      (category): category is string =>
        typeof category === 'string' && category.length > 0
    );
    if (categories.length > 0) {
      handoff.promptCategories = categories;
    }
  }

  if (Array.isArray(raw.personalCategories)) {
    const categories = raw.personalCategories.filter(
      (category): category is string =>
        typeof category === 'string' && category.length > 0
    );
    if (categories.length > 0) {
      handoff.personalCategories = categories;
    }
  }

  if (raw.returnContext) {
    const returnContext = normalizeHomeReturnContext(raw.returnContext);
    if (returnContext) {
      handoff.returnContext = returnContext;
    }
  }

  return handoff;
}

export function parsePresentationHomeHandoffFromState(
  state: Record<string, unknown> | null | undefined
): PresentationHomeHandoff | null {
  if (!state) {
    return null;
  }

  const fromHandoff = normalizePresentationHomeHandoff(
    state[PRESENTATION_HOME_HANDOFF_STATE_KEY]
  );
  if (fromHandoff) {
    return fromHandoff;
  }

  const legacyTypes = parsePresentationHandoffContentTypes(
    state[PRESENTATION_HOME_NAV_STATE_KEY]
  );
  if (legacyTypes) {
    return { contentTypes: legacyTypes };
  }

  return null;
}

export function serializePresentationHomeHandoffQueryParams(
  handoff: PresentationHomeHandoff
): Record<string, string> {
  const params: Record<string, string> = {};
  const types = serializePresentationHandoffQueryParam(handoff.contentTypes);
  if (types) {
    params[PRESENTATION_HOME_QUERY_PARAM_KEY] = types;
  }

  if (handoff.statusFilters) {
    const { current, answered } = handoff.statusFilters;
    if (current && !answered) {
      params[PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY] = 'current';
    } else if (!current && answered) {
      params[PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY] = 'answered';
    } else if (!current && !answered) {
      params[PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY] = 'all';
    }
  }

  if (handoff.promptCategories?.length) {
    params[PRESENTATION_HOME_PROMPT_CATS_QUERY_PARAM_KEY] =
      handoff.promptCategories.map(encodeURIComponent).join(',');
  }

  if (handoff.personalCategories?.length) {
    params[PRESENTATION_HOME_PERSONAL_CATS_QUERY_PARAM_KEY] =
      handoff.personalCategories.map(encodeURIComponent).join(',');
  }

  if (handoff.returnContext) {
    params[HOME_RETURN_FILTER_QUERY_PARAM_KEY] = handoff.returnContext.activeFilter;
  }

  return params;
}

function buildReturnContextFromHandoffQueryParts(input: {
  activeFilter: HomePresentationFilter;
  promptCategories?: string[];
  personalCategories?: string[];
}): HomeReturnContext {
  const returnContext: HomeReturnContext = {
    activeFilter: input.activeFilter,
  };

  if (input.activeFilter === 'prompts' && input.promptCategories?.length) {
    returnContext.selectedPromptTypes = [...input.promptCategories];
  }

  if (input.activeFilter === 'personal' && input.personalCategories?.length) {
    returnContext.selectedPersonalCategories = [...input.personalCategories];
  }

  return returnContext;
}

export function parsePresentationHomeHandoffFromQueryParams(
  getter: (key: string) => string | null | undefined
): PresentationHomeHandoff | null {
  const contentTypes = parsePresentationHandoffQueryParam(
    getter(PRESENTATION_HOME_QUERY_PARAM_KEY)
  );
  if (!contentTypes) {
    return null;
  }

  const handoff: PresentationHomeHandoff = { contentTypes };

  const status = getter(PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY);
  if (status === 'current') {
    handoff.statusFilters = { current: true, answered: false };
  } else if (status === 'answered') {
    handoff.statusFilters = { current: false, answered: true };
  } else if (status === 'all') {
    handoff.statusFilters = { current: false, answered: false };
  }

  const promptCategories = getter(
    PRESENTATION_HOME_PROMPT_CATS_QUERY_PARAM_KEY
  );
  if (promptCategories) {
    const parsed = parseEncodedCategoryList(promptCategories);
    if (parsed.length > 0) {
      handoff.promptCategories = parsed;
    }
  }

  const personalCategories = getter(
    PRESENTATION_HOME_PERSONAL_CATS_QUERY_PARAM_KEY
  );
  if (personalCategories) {
    const parsed = parseEncodedCategoryList(personalCategories);
    if (parsed.length > 0) {
      handoff.personalCategories = parsed;
    }
  }

  const returnFilter = getter(HOME_RETURN_FILTER_QUERY_PARAM_KEY);
  if (isHomePresentationFilter(returnFilter)) {
    handoff.returnContext = buildReturnContextFromHandoffQueryParts({
      activeFilter: returnFilter,
      promptCategories: handoff.promptCategories,
      personalCategories: handoff.personalCategories,
    });
  }

  return handoff;
}

export const PRESENTATION_HOME_HANDOFF_QUERY_PARAM_KEYS = [
  PRESENTATION_HOME_QUERY_PARAM_KEY,
  PRESENTATION_HOME_STATUS_QUERY_PARAM_KEY,
  PRESENTATION_HOME_PROMPT_CATS_QUERY_PARAM_KEY,
  PRESENTATION_HOME_PERSONAL_CATS_QUERY_PARAM_KEY,
  HOME_RETURN_FILTER_QUERY_PARAM_KEY,
] as const;

export function serializePresentationHandoffQueryParam(
  contentTypes: SelectablePresentationContentType[]
): string | null {
  if (contentTypes.length === 0) {
    return null;
  }
  return contentTypes.join(',');
}

export function parsePresentationHandoffQueryParam(
  value: string | null | undefined
): SelectablePresentationContentType[] | null {
  if (!value) {
    return null;
  }
  const types = value
    .split(',')
    .map((part) => part.trim())
    .filter(isSelectablePresentationContentType);
  return types.length > 0 ? types : null;
}

export function parsePresentationHandoffContentTypes(
  value: unknown
): SelectablePresentationContentType[] | null {
  if (Array.isArray(value)) {
    const types = value.filter(isSelectablePresentationContentType);
    return types.length > 0 ? types : null;
  }

  if (typeof value === 'string' && isSelectablePresentationContentType(value)) {
    return [value];
  }

  return null;
}
