import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { HelpSection, HelpSectionInput } from '../types/help-content';

@Injectable({
  providedIn: 'root',
})
export class HelpContentService {
  private sectionsSubject = new BehaviorSubject<HelpSection[]>(this.getDefaultSections());
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public sections$ = this.sectionsSubject.asObservable();
  public isLoading$ = this.isLoadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(private supabaseService: SupabaseService) {
    this.initializeHelpContent();
  }

  /**
   * Initialize help content from database or fallback to defaults
   */
  private initializeHelpContent(): void {
    this.loadFromDatabase();
  }

  /**
   * Get all help sections
   */
  getSections(): Observable<HelpSection[]> {
    return this.sections$;
  }

  /**
   * Load help sections from Supabase database
   */
  private async loadFromDatabase(): Promise<void> {
    this.isLoadingSubject.next(true);
    this.errorSubject.next(null);

    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('help_sections')
        .select('*')
        .order('order', { ascending: true });

      this.isLoadingSubject.next(false);

      if (error) {
        console.warn('Failed to load help sections from database, using defaults:', error);
        this.errorSubject.next('Using default help content.');
        this.sectionsSubject.next(this.getDefaultSections());
      } else if (data && data.length > 0) {
        const sections = (data as unknown as HelpSection[]).map((section) => ({
          ...section,
          createdAt: new Date(section.createdAt),
          updatedAt: new Date(section.updatedAt),
        }));
        this.sectionsSubject.next(sections);
      } else {
        this.sectionsSubject.next(this.getDefaultSections());
      }
    } catch (error) {
      console.error('Error loading help sections:', error);
      this.isLoadingSubject.next(false);
      this.errorSubject.next('Failed to load help content.');
      this.sectionsSubject.next(this.getDefaultSections());
    }
  }

  /**
   * Add a new help section
   */
  async addSection(input: HelpSectionInput): Promise<HelpSection | null> {
    const newSection: HelpSection = {
      id: `help_${Date.now()}`,
      ...input,
      order: this.sectionsSubject.value.length + 1,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'admin',
    };

    try {
      const { error } = await this.supabaseService.getClient().from('help_sections').insert([newSection]);

      if (error) {
        throw error;
      }

      const currentSections = this.sectionsSubject.value;
      this.sectionsSubject.next([...currentSections, newSection]);
      return newSection;
    } catch (error) {
      console.error('Error adding help section:', error);
      this.errorSubject.next('Failed to add help section.');
      return null;
    }
  }

  /**
   * Update an existing help section
   */
  async updateSection(id: string, updates: Partial<HelpSectionInput>): Promise<HelpSection | null> {
    const currentSections = this.sectionsSubject.value;
    const sectionIndex = currentSections.findIndex((s) => s.id === id);

    if (sectionIndex === -1) {
      console.error('Section not found:', id);
      return null;
    }

    const updatedSection: HelpSection = {
      ...currentSections[sectionIndex],
      ...updates,
      updatedAt: new Date(),
    };

    try {
      const { error } = await this.supabaseService
        .getClient()
        .from('help_sections')
        .update(updatedSection)
        .eq('id', id);

      if (error) {
        throw error;
      }

      const newSections = [...currentSections];
      newSections[sectionIndex] = updatedSection;
      this.sectionsSubject.next(newSections);
      return updatedSection;
    } catch (error) {
      console.error('Error updating help section:', error);
      this.errorSubject.next('Failed to update help section.');
      return null;
    }
  }

  /**
   * Soft delete (deactivate) a help section
   */
  async removeSection(id: string): Promise<boolean> {
    const currentSections = this.sectionsSubject.value;
    const section = currentSections.find((s) => s.id === id);
    if (!section) return false;
    
    const updatedSection: HelpSection = {
      ...section,
      isActive: false,
      updatedAt: new Date(),
    };

    try {
      const { error } = await this.supabaseService
        .getClient()
        .from('help_sections')
        .update({ isActive: false, updatedAt: new Date() })
        .eq('id', id);

      if (error) {
        throw error;
      }

      const newSections = currentSections.map((s) => (s.id === id ? updatedSection : s));
      this.sectionsSubject.next(newSections);
      return true;
    } catch (error) {
      console.error('Error deleting help section:', error);
      this.errorSubject.next('Failed to delete help section.');
      return false;
    }
  }

  /**
   * Hard delete a help section permanently
   */
  async hardDeleteSection(id: string): Promise<boolean> {
    const currentSections = this.sectionsSubject.value;
    const sectionIndex = currentSections.findIndex((s) => s.id === id);

    if (sectionIndex === -1) {
      console.error('Section not found:', id);
      return false;
    }

    try {
      const { error } = await this.supabaseService.getClient().from('help_sections').delete().eq('id', id);

      if (error) {
        throw error;
      }

      const newSections = currentSections.filter((s) => s.id !== id);
      this.sectionsSubject.next(newSections);
      return true;
    } catch (error) {
      console.error('Error deleting help section:', error);
      this.errorSubject.next('Failed to delete help section.');
      return false;
    }
  }

  /**
   * Reorder sections
   */
  async reorderSections(sections: HelpSection[]): Promise<boolean> {
    try {
      const updates = sections.map((section, index) => ({
        ...section,
        order: index + 1,
        updatedAt: new Date(),
      }));

      for (const section of updates) {
        const { error } = await this.supabaseService
          .getClient()
          .from('help_sections')
          .update({ order: section.order, updatedAt: section.updatedAt })
          .eq('id', section.id);

        if (error) {
          throw error;
        }
      }

      this.sectionsSubject.next(updates);
      return true;
    } catch (error) {
      console.error('Error reordering help sections:', error);
      this.errorSubject.next('Failed to reorder help sections.');
      return false;
    }
  }

  /**
   * Reset to default help sections
   */
  async resetToDefaults(): Promise<void> {
    this.sectionsSubject.next(this.getDefaultSections());
    this.errorSubject.next(null);
  }

  /**
   * Get default help sections (fallback when database unavailable)
   */
  private getDefaultSections(): HelpSection[] {
    return [
      {
        id: 'help_prayers',
        title: 'Creating Prayers',
        description: 'How to create, edit, and manage prayer requests',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14m-7-7h14"/></svg>',
        content: [
          {
            subtitle: 'Creating a New Prayer Request',
            text: 'Click the "Add Request" button in the header to create a new prayer request. Fill in the title, description, and any relevant details about what you\'d like prayer for.',
            examples: [
              'Example: "Healing for Jane\'s surgery next week"',
              'Example: "Wisdom in my job decision"',
            ],
          },
          {
            subtitle: 'Prayer Approval Process',
            text: 'When you submit a new prayer request, it will be reviewed and approved by an administrator before it appears publicly. This helps maintain the quality and appropriateness of prayer requests in our community.',
          },
          {
            subtitle: 'Updating Prayers',
            text: 'Click the "Update" button to add an update about the prayer request. This allows you to share progress, answered prayers, or new developments with your prayer community.',
          },
          {
            subtitle: 'Mark as Anonymous',
            text: 'You can mark prayers as anonymous to protect the privacy of the prayer request. This keeps the identity of the person who submitted the prayer confidential.',
          },
          {
            subtitle: 'Mark as Answered',
            text: 'When a prayer is marked as answered, it moves to the "Answered" section where you can reflect on how God has worked in that situation.',
          },
        ],
        order: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_prompts',
        title: 'Using Prayer Prompts',
        description: 'Get inspired with our prayer prompts',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>',
        content: [
          {
            subtitle: 'What are Prayer Prompts?',
            text: 'Prayer prompts are suggestions to help guide your prayers and give you ideas for what to pray about. They\'re designed to help when you\'re unsure what to pray for. Each prompt has a type (like Healing, Guidance, Salvation) to help organize them by category.',
          },
          {
            subtitle: 'Accessing Prayer Prompts',
            text: 'Click the "Prompts" filter button at the top to view all available prayer prompts. The prompts are displayed as cards that you can read and use as inspiration for your prayers.',
          },
          {
            subtitle: 'Filtering by Type',
            text: 'Each prayer prompt has a type tag (such as Healing, Guidance, Praise, Intercession, etc.). Click on a type tag to filter and show only prompts of that type. Click the "All Types" button to view all prompts again.',
          },
          {
            subtitle: 'Using Prompts in Presentation Mode',
            text: 'You can display prayer prompts in presentation mode by selecting them. This is great for group prayer times or personal focused prayer. You can also print prompts using the "Print Prompts" button to use them offline or share with others.',
          },
        ],
        order: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_search',
        title: 'Searching Prayers',
        description: 'Find prayers using the search feature',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>',
        content: [
          {
            subtitle: 'Using the Search Bar',
            text: 'Type keywords in the search bar to find prayers. The search looks through titles and descriptions to find relevant prayers.',
            examples: [
              'Search "healing" to find all prayers about healing',
              'Search "job" to find prayers related to work',
            ],
          },
          {
            subtitle: 'Search Tips',
            text: 'Be specific with your search terms. Shorter, broader terms will return more results. Use quotes for exact phrases.',
          },
        ],
        order: 3,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_filtering',
        title: 'Filtering Prayers',
        description: 'Filter and sort your prayers',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
        content: [
          {
            subtitle: 'Filter Options',
            text: 'Use the main filter buttons to view prayers by category: "Current" shows active prayers, "Answered" shows prayers that have been answered, "Total" shows all prayers including archived ones, and "Prompts" displays prayer prompt cards.',
          },
          {
            subtitle: 'Finding Archived Prayers',
            text: 'Archived prayers are still accessible and can be updated. Click on the "Total" filter button to see all prayers including archived ones. You can find, edit, and update archived prayers just like active prayers.',
          },
        ],
        order: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_presentation',
        title: 'Prayer Presentation Mode',
        description: 'Display prayers for group settings or focused prayer time',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>',
        content: [
          {
            subtitle: 'Starting Presentation Mode',
            text: 'Click the "Pray" button in the header to enter presentation mode. This is perfect for displaying prayers on a screen in a group setting or for a more focused time of prayer where you can focus on one prayer at a time.',
          },
          {
            subtitle: 'Touch & Swipe Controls',
            text: 'On touch devices, swipe left to move to the next prayer or swipe right to go to the previous prayer. This makes it easy to navigate prayers on tablets and mobile devices during group presentations.',
          },
          {
            subtitle: 'Presentation Settings',
            text: 'Access the settings icon during presentation mode to customize your experience. You can enable a timer to track prayer time, sort prayers by different criteria, and filter which prayers are displayed. These options help you control the flow and focus of your group prayer time.',
          },
        ],
        order: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_printing',
        title: 'Printing Prayers',
        description: 'Print your prayers for offline use',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>',
        content: [
          {
            subtitle: 'Print Options',
            text: 'Under the settings menu, find the print button to print your prayers. You can print all prayers or just the filtered results.',
          },
          {
            subtitle: 'Printing Prompts',
            text: 'You can also print prayer prompts to use in group settings or for personal study. Like prayers, you can print all prompts or just those of a specific type.',
          },
          {
            subtitle: 'PDF Export',
            text: 'Modern browsers allow you to "Print to PDF" which creates a digital copy you can save and share.',
          },
        ],
        order: 6,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_feedback',
        title: 'Send Feedback',
        description: 'Share suggestions, report bugs, and request features',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
        content: [
          {
            subtitle: 'Feedback Types',
            text: 'You can submit three types of feedback: Suggestions for improvements, Feature Requests for new functionality, or Bug Reports to help us fix issues.',
          },
          {
            subtitle: 'Submitting Feedback',
            text: 'Fill in the feedback form with a clear title (up to 100 characters) and detailed description (up to 1000 characters). Your feedback is sent directly to our development team for review.',
          },
          {
            subtitle: 'What Happens Next',
            text: 'Once submitted, your feedback is logged and our team will review it. You\'ll receive confirmation that your feedback was received, and we use your input to improve the app.',
          },
          {
            subtitle: 'Help Us Improve',
            text: 'Your feedback is valuable! Whether you find a bug, want a new feature, or have a suggestion to make the app better, please share it with us. We read and consider all feedback from our users.',
          },
        ],
        order: 7,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_settings',
        title: 'App Settings',
        description: 'Customize the app to your preferences',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
        content: [
          {
            subtitle: 'Print Buttons',
            text: 'The "Print Prayers" button allows you to print or export your current prayers as a PDF. The "Print Prompts" button prints the prayer prompts so you can use them offline or share them with others.',
          },
          {
            subtitle: 'Theme Options',
            text: 'Choose from different theme options to customize the app appearance. Light mode is best for bright environments, dark mode reduces eye strain in low light, and system mode automatically follows your device\'s theme preference. Your selected theme preference is saved automatically.',
          },
          {
            subtitle: 'Notification Badges',
            text: 'Badges appear on the prayer count cards and filter buttons to notify you of new prayers that haven\'t been read yet. You can dismiss badges by clicking directly on the badge number. Or, click the badge in the filter buttons to clear all badges for that specific prayer category at once.',
          },
          {
            subtitle: 'Enabling Badges',
            text: 'To turn on the badge feature, enable "Badge Functionality" in settings. Once enabled, you\'ll see notifications for unread prayers. You can toggle this setting at any time based on your preference.',
          },
          {
            subtitle: 'Feedback Form',
            text: 'Have suggestions or found a bug? Use the feedback form in settings to share your thoughts with us. Your feedback helps us improve the app and make it work better for you. Simply describe your feedback, and we\'ll review it to enhance your experience.',
          },
          {
            subtitle: 'Logout',
            text: 'Click the logout button to sign out of your account. This will end your session and return you to the login screen. Make sure to save any important information before logging out.',
          },
        ],
        order: 8,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
    ];
  }
}
