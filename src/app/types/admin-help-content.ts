import type { HelpContent } from './help-content';

export type AdminHelpSectionKind = 'tour' | 'article';

/** Admin portal help section (static catalog + optional one embed per article). */
export interface AdminHelpSection {
  id: string;
  kind: AdminHelpSectionKind;
  title: string;
  description: string;
  icon: string;
  content: HelpContent[];
  order: number;
  isActive: boolean;
  /** YouTube/Vimeo embed URL, e.g. https://www.youtube-nocookie.com/embed/VIDEO_ID */
  videoEmbedUrl?: string;
}
