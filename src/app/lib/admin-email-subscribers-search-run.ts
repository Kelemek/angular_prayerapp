import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  EmailSubscriberRow,
  EmailSubscriberSortColumn,
} from './admin-email-subscribers';
import { fetchEmailSubscriberList } from './admin-email-subscribers-fetch';
import {
  countActiveEmailSubscribers,
  sortEmailSubscriberRows,
} from './admin-email-subscribers-sort';

export interface EmailSubscriberSearchRunParams {
  searchQuery: string;
  sortBy: EmailSubscriberSortColumn;
  sortDirection: 'asc' | 'desc';
  preserveCsvSuccess?: boolean;
  previousCsvSuccess: string | null;
}

export interface EmailSubscriberSearchRunSuccess {
  ok: true;
  allSubscribers: EmailSubscriberRow[];
  totalItems: number;
  totalActiveCount: number;
  hasSearched: true;
  currentPage: 1;
  csvSuccess: string | null;
}

export interface EmailSubscriberSearchRunFailure {
  ok: false;
  error: string;
}

export type EmailSubscriberSearchRunResult =
  | EmailSubscriberSearchRunSuccess
  | EmailSubscriberSearchRunFailure;

export async function runEmailSubscriberSearch(
  client: SupabaseClient,
  params: EmailSubscriberSearchRunParams,
): Promise<EmailSubscriberSearchRunResult> {
  try {
    const { rows, count } = await fetchEmailSubscriberList(client, {
      searchQuery: params.searchQuery,
      sortBy: params.sortBy,
      sortDirection: params.sortDirection,
    });

    const allSubscribers = sortEmailSubscriberRows(
      rows,
      params.sortBy,
      params.sortDirection,
    );

    return {
      ok: true,
      allSubscribers,
      totalItems: count,
      totalActiveCount: countActiveEmailSubscribers(allSubscribers),
      hasSearched: true,
      currentPage: 1,
      csvSuccess: params.preserveCsvSuccess ? params.previousCsvSuccess : null,
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : 'Failed to fetch subscribers',
    };
  }
}
