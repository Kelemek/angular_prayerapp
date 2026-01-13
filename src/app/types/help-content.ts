export interface HelpSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  content: HelpContent[];
  order: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface HelpContent {
  subtitle: string;
  text: string;
  examples?: string[];
}

export interface HelpSectionInput {
  title: string;
  description: string;
  icon: string;
  content: HelpContent[];
}

export interface HelpCategory {
  category: string;
  sections: HelpSection[];
}
