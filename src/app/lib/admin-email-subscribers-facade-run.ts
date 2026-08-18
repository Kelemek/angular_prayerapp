import type { SupabaseService } from '../services/supabase.service';
import type { ToastService } from '../services/toast.service';
import type { EmailSubscriberConfirmationAction } from './admin-email-subscribers-confirmations';
import type {
  EmailSubscriberConfirmationApplyInput,
  EmailSubscriberConfirmationApplyResult,
} from './admin-email-subscribers-confirmation-apply';
import type {
  EmailSubscriberRow,
  EmailSubscriberSortColumn,
} from './admin-email-subscribers';
import { runEmailSubscriberConfirmationAction } from './admin-email-subscribers-confirmation-runner';
import { runEmailSubscriberSearch } from './admin-email-subscribers-search-run';

export interface EmailSubscriberFacadeSearchHost {
  supabase: SupabaseService;
  searchQuery: string;
  sortBy: EmailSubscriberSortColumn;
  sortDirection: 'asc' | 'desc';
  searching: boolean;
  error: string | null;
  csvSuccess: string | null;
  sectionExpanded: boolean;
  subscribers: EmailSubscriberRow[];
  totalItems: number;
  totalActiveCount: number;
  hasSearched: boolean;
  currentPage: number;
  markForCheck: () => void;
  allSubscribers: EmailSubscriberRow[];
}

export function applyEmailSubscriberFacadeSearchFailure(
  host: Pick<
    EmailSubscriberFacadeSearchHost,
    'error' | 'sectionExpanded' | 'subscribers' | 'totalItems' | 'totalActiveCount'
  >,
  error: string,
): void {
  host.error = error;
  host.sectionExpanded = true;
  host.subscribers = [];
  host.totalItems = 0;
  host.totalActiveCount = 0;
}

export async function runEmailSubscriberFacadeSearch(
  host: EmailSubscriberFacadeSearchHost,
  loadPageData: () => void,
  options?: { preserveCsvSuccess?: boolean },
): Promise<void> {
  try {
    host.searching = true;
    host.error = null;
    if (!options?.preserveCsvSuccess) {
      host.csvSuccess = null;
    }
    host.currentPage = 1;
    host.markForCheck();

    const result = await runEmailSubscriberSearch(host.supabase.client, {
      searchQuery: host.searchQuery,
      sortBy: host.sortBy,
      sortDirection: host.sortDirection,
      preserveCsvSuccess: options?.preserveCsvSuccess,
      previousCsvSuccess: host.csvSuccess,
    });

    if (result.ok) {
      host.allSubscribers = result.allSubscribers;
      host.totalItems = result.totalItems;
      host.totalActiveCount = result.totalActiveCount;
      host.hasSearched = result.hasSearched;
      host.currentPage = result.currentPage;
      host.csvSuccess = result.csvSuccess;
      loadPageData();
    } else {
      applyEmailSubscriberFacadeSearchFailure(host, result.error);
    }
    host.markForCheck();
  } finally {
    host.searching = false;
    host.markForCheck();
  }
}

export interface EmailSubscriberFacadeConfirmationHost {
  allSubscribers: EmailSubscriberRow[];
  totalActiveCount: number;
  totalItems: number;
  currentPage: number;
  pageSize: number;
  csvSuccess: string | null;
  error: string | null;
  markForCheck: () => void;
}

export function finishEmailSubscriberFacadeConfirmationApply(
  host: EmailSubscriberFacadeConfirmationHost,
  result: EmailSubscriberConfirmationApplyResult,
  toast: Pick<ToastService, 'success'>,
): void {
  host.allSubscribers = result.allSubscribers;
  host.totalActiveCount = result.totalActiveCount;
  host.totalItems = result.totalItems;
  host.currentPage = result.currentPage;
  host.csvSuccess = result.csvSuccess;
  if (result.toastSuccess) {
    toast.success(result.toastSuccess);
  }
  host.markForCheck();
}

export async function runEmailSubscriberFacadeConfirmation(
  host: EmailSubscriberFacadeConfirmationHost,
  action: EmailSubscriberConfirmationAction,
  deps: {
    supabase: SupabaseService;
    toast: ToastService;
    getApplyInput: () => EmailSubscriberConfirmationApplyInput;
    loadPageData: () => void;
  },
): Promise<void> {
  await runEmailSubscriberConfirmationAction(action, {
    getClient: () => deps.supabase.client,
    getApplyInput: deps.getApplyInput,
    applyResult: (result) =>
      finishEmailSubscriberFacadeConfirmationApply(host, result, deps.toast),
    onApplyError: (feedback) => {
      if (feedback.error) {
        host.error = feedback.error;
      } else if (feedback.toastError) {
        deps.toast.error(feedback.toastError);
      }
      host.markForCheck();
    },
    loadPageData: deps.loadPageData,
  });
}
