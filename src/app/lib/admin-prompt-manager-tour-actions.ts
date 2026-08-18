export interface PromptManagerTourSectionGate {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
}

export interface PromptManagerTourSectionExpandResult {
  sectionExpanded: boolean;
  sectionInitialLoadDone: boolean;
  shouldBootstrap: boolean;
}

export function promptManagerTourExpandSection(
  gate: PromptManagerTourSectionGate,
): PromptManagerTourSectionExpandResult {
  if (!gate.sectionExpanded) {
    const sectionInitialLoadDone = gate.sectionInitialLoadDone;
    return {
      sectionExpanded: true,
      sectionInitialLoadDone,
      shouldBootstrap: !sectionInitialLoadDone,
    };
  }

  return {
    sectionExpanded: gate.sectionExpanded,
    sectionInitialLoadDone: gate.sectionInitialLoadDone,
    shouldBootstrap: !gate.sectionInitialLoadDone,
  };
}
