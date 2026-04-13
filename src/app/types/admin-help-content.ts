import type { HelpContent } from './help-content';

/** Admin portal help section (static content + optional one embed per section). */
export interface AdminHelpSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: HelpContent[];
  order: number;
  isActive: boolean;
  /** YouTube/Vimeo embed URL, e.g. https://www.youtube-nocookie.com/embed/VIDEO_ID */
  videoEmbedUrl?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}
