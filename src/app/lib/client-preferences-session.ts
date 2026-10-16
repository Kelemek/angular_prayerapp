import type { ClientPreferences } from '../types/client-preferences';
import { parseClientPreferencesJson } from './client-preferences-parse';
import {
  buildClientPreferencesFromLocal,
  reconcileClientPreferencesWithDevice,
} from './client-preferences-local';

export function resolveClientPreferencesFromSubscriberRow(
  row: { client_preferences: unknown },
  normalizedEmail: string,
  preserved: ClientPreferences | undefined
): { preferences: ClientPreferences | undefined; seedToDatabase: ClientPreferences | null } {
  if (preserved) {
    return { preferences: preserved, seedToDatabase: null };
  }

  const parsed = parseClientPreferencesJson(row.client_preferences);
  if (parsed) {
    const { preferences, divergedFromInput } =
      reconcileClientPreferencesWithDevice(parsed, normalizedEmail);
    return {
      preferences,
      seedToDatabase: divergedFromInput ? preferences : null,
    };
  }

  if (row.client_preferences === null) {
    const seeded = buildClientPreferencesFromLocal(normalizedEmail);
    return { preferences: seeded, seedToDatabase: seeded };
  }

  return { preferences: undefined, seedToDatabase: null };
}
