/** Printable public prayer row used by PrintService HTML generators. */
export interface Prayer {
  id: string;
  title: string;
  prayer_for: string;
  description: string;
  requester: string;
  /** When true, the printable list must not reveal the submitter's name */
  is_anonymous?: boolean;
  status: string;
  created_at: string;
  date_answered?: string;
  prayer_updates?: Array<{
    id: string;
    content: string;
    author: string;
    created_at: string;
    is_anonymous?: boolean;
  }>;
}

export type TimeRange = 'week' | 'twoweeks' | 'month' | 'twomonths' | 'year' | 'all';

/** Time ranges for the admin saddle-stitch booklet print only. */
export type BookletTimeRange = 'week' | 'twoweeks' | 'month' | 'twomonths';

/** Metadata for booklet prompt fragments: inlined into JSON so the measure script can drop misleading "(continued)" lines when scroll-height packing differs from server weights. */
export interface BookletPromptPackMeta {
  typeName: string;
  batchIndex: number;
  batchPrompts: unknown[];
  totalCountInType: number;
}

/** Booklet pack unit (prayer cards or prompt batches). Prompt batches may carry {@link BookletPromptPackMeta} for inline measurement. */
export type BookletPackUnit = {
  html: string;
  weight: number;
  bookletPromptMeta?: BookletPromptPackMeta;
};
