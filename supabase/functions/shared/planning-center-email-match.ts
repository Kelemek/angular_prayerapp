export type PlanningCenterPersonEmail = {
  login_identifier?: string | null;
  primary_email_address?: string | null;
};

export function planningCenterPersonMatchesEmail(
  attributes: PlanningCenterPersonEmail | null | undefined,
  email: string,
): boolean {
  const want = email.toLowerCase().trim();
  if (!want) {
    return false;
  }
  const login = (attributes?.login_identifier ?? '').toLowerCase().trim();
  const primary = (attributes?.primary_email_address ?? '').toLowerCase().trim();
  return login === want || primary === want;
}

export function planningCenterPeopleIncludeEmail(
  people: Array<{ attributes?: PlanningCenterPersonEmail | null }>,
  email: string,
): boolean {
  return people.some((person) =>
    planningCenterPersonMatchesEmail(person.attributes, email)
  );
}
