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
   * Initialize help content from code (no database needed)
   */
  private initializeHelpContent(): void {
    // Load default sections from code
    // Note: help_sections table is not used - all help content is defined in code
    this.sectionsSubject.next(this.getDefaultSections());
    this.isLoadingSubject.next(false);
  }

  /**
   * Get all help sections
   */
  getSections(): Observable<HelpSection[]> {
    return this.sections$;
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
            text: 'Click the "Add Request" button in the header to create a new prayer request. Fill in who or what the prayer is for, then provide details about the prayer request. You can optionally make your prayer anonymous to protect your privacy. Your request will be reviewed and approved by an administrator before appearing publicly.',
            examples: [
              'Example: Prayer For: "Jane", Details: "Please pray for healing as she prepares for surgery next week"',
              'Example: Prayer For: "Job Decision", Details: "I need wisdom and guidance as I consider a new job opportunity"',
            ],
          },
          {
            subtitle: 'Prayer Approval Process',
            text: 'When you submit a new prayer request, update or deletion, it will be reviewed and approved by an administrator before it appears publicly. This helps maintain the quality and appropriateness of prayer requests in our community.',
          },
          {
            subtitle: 'Creating Personal Prayers (Private Prayers)',
            text: 'Tap the **Personal** filter tab to view your private personal prayers. These are prayers that are visible only to you. Tap **Request** (Add Request) while **Personal** is active to create a personal prayer. Personal prayers are immediately available without requiring administrator approval, making them perfect for private prayer mangement.',
          },
          {
            subtitle: 'Adding Categories to Personal Prayers',
            text: 'When creating or editing a personal prayer, you can optionally assign a category to help organize your prayers. Categories are user-defined and can be anything meaningful to you - such as "Health", "Family", "Work", "Finances", or "Spiritual Growth". As you create personal prayers with categories, your app builds a library of your most-used categories that appear in a dropdown for easy selection. You can leave the category empty if you prefer, or type a new category name to create one on the fly.',
            examples: [
              'Example: Create a prayer "My Family" with category "Family"',
              'Example: Create a prayer "Job Interview" with category "Work"',
              'Example: Create a prayer with no category for prayers you don\'t want to organize',
            ],
          },
          {
            subtitle: 'Updating Prayers',
            text: 'Click the "Update" button to add an update about the prayer request. Community updates are visible to the church; personal updates stay in your private list. Use updates to record progress, thanksgiving, or new developments.',
          },
          {
            subtitle: 'Mark as Anonymous',
            text: 'When creating a prayer, you can check the "Make this prayer anonymous" checkbox to protect your privacy. This keeps your identity confidential. This option is available for regular prayers only, as personal prayers are already private.',
          },
          {
            subtitle: 'Mark as Answered',
            text: 'When adding an update to a prayer, check the "Mark this prayer as answered" checkbox to move it to the "Answered" section. This is perfect for reflecting on how God has worked in that situation. This works for both regular prayers and personal prayers.',
          },
          {
            subtitle: 'Managing Personal vs. Regular Prayers',
            text: 'Use the "Personal" filter tab to access your private prayers that are only visible to you. For community prayers, tap the **Public** tab (highlighted with a colored border when active), then choose the **Current** or **Total** chip below it. Personal prayers are a great way to track private prayer requests.',
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
            text: 'Prayer prompts are suggestions to help guide your prayers and give you ideas for what to pray about. They\'re designed to help when you\'re unsure what to pray for. Each prompt has a type (like Church, Family, Cities) to help organize them by category.',
          },
          {
            subtitle: 'Accessing Prayer Prompts',
            text: 'Tap the **Prompts** filter tab at the top (it shows a colored border when active) to view prayer prompts. Type chips appear in a row below the main tabs; prompt cards list underneath.',
          },
          {
            subtitle: 'Filtering by Type',
            text: 'Each prompt has a type (such as Church, Family, Cities, Country, World, Bible, etc.). After you open **Prompts**, tap a **type chip** in the row below the main tabs to show only that type. Chips share each row when they fit and wrap to the next line when needed. Tap **All Types** to view every prompt again. You can also tap the type badge on a card to toggle that filter.',
          },
          {
            subtitle: 'Using Prompts in Presentation Mode',
            text: 'You can display prayer prompts in presentation mode by selecting them. This is great for group prayer times or personal focused prayer. You can also print prompts using the "Print Prompts" button to use them offline or share with others.',
          },
          {
            subtitle: 'Pray For on prompts',
            text: 'When Prayer Encouragement is enabled, each prompt card shows **Pray For**. Tapping it increases your private **{n} Prayers** count for that prompt—only you see how often you have prayed with it. The same cooldown as personal and member cards applies (Settings → Prayer encouragement on cards).',
          },
        ],
        order: 2,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_prayer_encouragement',
        title: 'Prayer Encouragement (Pray For)',
        description: 'Encourage others by marking when you pray for their requests',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
        content: [
          {
            subtitle: 'What is Pray For?',
            text: 'When your community has Prayer Encouragement enabled, you\'ll see a "Pray For" button on community prayer cards, on your personal prayer cards, on Planning Center **member** cards (if you have a list applied), on **prayer prompt** cards, and on matching slides in presentation mode. On community and member cards, tapping it anonymously increases a shared praying count. On your personal prayers and prompts, it tracks how often you have prayed yourself—only you see those counts.',
          },
          {
            subtitle: 'How it works',
            text: 'On **community** and **member** prayers, tap or click "Pray For" to record that you prayed. Your action is anonymous—only the total count is shown. On **personal** prayers and **prompts**, Pray For increases your own count (shown as **{n} Prayers**) so you can see how often you have lifted up each item; only you see this count. The same controls work on the home page and in **presentation mode**.',
          },
          {
            subtitle: 'When can I use Pray For?',
            text: 'Pray For appears on community prayer cards (**Public** tab, especially **Current**), on your **Personal** tab cards, on **Members** tab cards when you have a Planning Center list applied, on **Prompts** tab cards, and on congregation, personal, member, and prompt slides in **presentation mode**—when Prayer Encouragement is enabled and you have not hidden the button in Settings. If you don\'t see the button, your church may have the feature turned off, or you may have hidden it under Prayer encouragement on cards in Settings.',
          },
          {
            subtitle: 'Personal prayers',
            text: 'Personal Pray For is for your own prayer list. Each tap adds to the count on that card so you can track ongoing prayer for a request. You can set a **personal / member / prompt cooldown** (1–168 hours, default **4**) in Settings under Prayer encouragement on cards—this applies to personal, member, and prompt Pray For. Community prayers still use the church-wide cooldown set by admins.',
          },
          {
            subtitle: 'Member list cards',
            text: 'If admins have mapped a Planning Center list to your account, the **Members** tab shows those people as prayer cards. Pray For on a member card increases a **shared** anonymous **{n} Prayers** count for that person (visible to everyone who can see the Members list). Your cooldown from Settings controls how soon you can tap Pray For again on the same member. Member lists still appear only for users who have a list applied—Pray For does not change who can see Members.',
          },
          {
            subtitle: 'Prayer prompts',
            text: 'On the **Prompts** tab (and prompt slides in presentation mode), Pray For tracks how often **you** have prayed with each prompt. Your **{n} Prayers** count is private to your account. The same Settings cooldown as personal and member Pray For applies.',
          },
          {
            subtitle: 'Presentation mode',
            text: 'Tap **Pray** in the header to open presentation mode. While viewing congregation, personal, member, or prompt slides, you can use **Pray For** / **Prayed For** the same way as on the home page—the same visibility rules, cooldowns, and Settings preferences apply.',
          },
          {
            subtitle: 'Show "Pray For" button',
            text: 'In Settings, under Prayer encouragement on cards, you can turn the Pray For button off for your own account if you prefer not to see or use it on community, personal, member, or prompt cards (including in presentation mode). Prayer Encouragement can still be on for everyone else; this only hides the control for you. You can turn it back on anytime—your choice is saved to your account.',
          },
          {
            subtitle: 'Show "Praying #" button',
            text: 'In the same Settings section, you can hide the praying count on cards when the app shows it—for example on community requests you submitted. On **member** cards the shared **{n} Prayers** count is visible to everyone on the list when there is a count. On personal and prompt cards the count label is **{n} Prayers** and is always visible to you when there is a count. Your preference is saved to your account.',
          },
          {
            subtitle: 'Praying for the same request again',
            text: 'You can pray for the same request more than once. After you click "Pray For", a cooldown applies before you can tap again on that same item. **Community** prayers use the church-wide cooldown set by admins; **personal**, **member**, and **prompt** cards use your personal / member / prompt cooldown from Settings (default 4 hours). Once the cooldown ends, you can tap "Pray For" again.',
          },
          {
            subtitle: 'Privacy and anonymity',
            text: 'On **community** prayers, your "Pray For" clicks are never linked to your identity—viewers only see a total number (for example, "3 Praying"). On **member** cards the shared count uses the **{n} Prayers** label. Admins may see community counts for moderation purposes, but individual clickers stay anonymous. On **personal** prayers and **prompts**, the count is your own private tally.',
          },
        ],
        order: 3,
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
        order: 4,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_personal_prayers',
        title: 'Personal Prayers',
        description: 'Manage your private prayers with custom categories and editing',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        content: [
          {
            subtitle: 'What are Personal Prayers?',
            text: 'Personal prayers are private prayer requests that are visible only to you. Unlike community prayers that are shared with others, personal prayers give you a private space to track your own prayer requests and answered prayers. They don\'t require administrator approval and are immediately available for you to use.',
          },
          {
            subtitle: 'Creating Personal Prayers',
            text: 'Tap the **Personal** filter tab (highlighted with a colored border when active) to view your personal prayers section. Tap **Request** (Add Request) while **Personal** is selected to create a new personal prayer. Fill in "Prayer For" (the subject of your prayer), add prayer details in the description field, and optionally assign a category. Your personal prayer is created instantly without waiting for approval.',
            examples: [
              'Example: Prayer For: "My Family", Details: "Pray for stronger relationships and more quality time together"',
              'Example: Prayer For: "Personal Growth", Details: "Help me develop patience and wisdom in my daily decisions"',
              'Example: Prayer For: "Health Journey", Details: "Thank you for good health checkup results, continue healing"',
            ],
          },
          {
            subtitle: 'Using Categories',
            text: 'Assign categories to your personal prayers to organize them by topic. As you create personal prayers with categories, your app builds a library of your most-used categories. Click the category field dropdown to select from existing categories or type to create a new category. Categories help you quickly filter and find prayers about similar topics.',
            examples: [
              'Popular categories: Health, Family, Work, Finances, Relationships, Spiritual Growth, Guidance',
              'You can create custom categories tailored to your personal prayer topics',
            ],
          },
          {
            subtitle: 'Filtering Personal Prayers by Category',
            text: 'Once you have personal prayers, filter chips always appear below the main tabs when **Personal** is active: **Current** (everything except answered), **Answered**, and **Total** (all personal prayers), then any categories you created. Category chips share each row when they fit and wrap to the next line when needed (same layout as prompt type chips). Click a category chip to show only prayers in that category. Long-press a category chip (or right-click on desktop) to rename it. Re-tap a category chip to return to Current.',
          },
          {
            subtitle: 'Editing Personal Prayers',
            text: 'Click the edit button (pencil icon) on any personal prayer card to modify it. You can update the prayer subject (Prayer For field), change the description, reassign the category, or check "Mark this prayer as answered" to move it into the Answered category. All changes are saved immediately. This is helpful when you need to add more details or track the evolution of your prayer request over time.',
          },
          {
            subtitle: 'Adding Prayer Updates',
            text: 'Click the "Update" button on a personal prayer to add a prayer update. Prayer updates let you track progress, answered prayers, or new developments. You can add multiple updates to show how your prayer has progressed. When adding an update, you can check "Mark this prayer as answered" to mark it as answered if applicable.',
          },
          {
            subtitle: 'Editing Prayer Updates',
            text: 'Click the edit button (pencil icon) on any prayer update to modify the update content. You can also check "Mark this prayer as answered" while editing an update—the same option as when adding an update. This allows you to correct typos, add more details, or clarify what you wrote. Your edits are saved instantly. You can also delete updates if needed.',
          },
          {
            subtitle: 'Managing Prayer Status',
            text: 'As you pray and see answers, you can mark prayers as "Answered" with the green checkmark on the card header (you will be asked to confirm). Tap again to move the prayer out of Answered and choose a category. You can also check "Mark this prayer as answered" when adding or editing an update, or when editing the prayer itself. Answered personal prayers show under the Answered filter chip.',
          },
          {
            subtitle: 'Reordering Personal Prayers',
            text: 'You can reorganize your personal prayers by drag-and-drop. When exactly one category is selected, drag the date and time at the top of each personal prayer card to move it up or down in your list. Your preferred order is automatically saved and will be remembered when you return to the app.',
            examples: [
              'Drag the most important prayers to the top for quick access',
              'Organize prayers by priority, urgency, or any preference you prefer',
              'The order you set is saved automatically to your account',
            ],
          },
          {
            subtitle: 'Personal Prayers in Presentation Mode',
            text: 'You can display your personal prayers in presentation mode for focused prayer time. Select "Personal" content type in the presentation settings to display only your personal prayers. Use the timer feature to spend dedicated time praying through each personal prayer request.',
          },
          {
            subtitle: 'Searching Personal Prayers',
            text: 'The search feature works with personal prayers too. Use the search bar to find personal prayers by the prayer subject, description, or category. This is helpful when you have many personal prayers and want to quickly find prayers about a specific topic.',
          },
          {
            subtitle: 'Privacy & Personal Data',
            text: 'Your personal prayers are completely private and stored securely. They are never shared with other users or the prayer community. Only you can see, edit, or manage your personal prayers. Your privacy is fully protected while you maintain your personal prayer journal.',
          },
        ],
        order: 5,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_memorize',
        title: 'Memorize Scripture',
        description: 'Memorize Bible verses and books with guided practice',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
        content: [
          {
            subtitle: 'What is Memorize?',
            text: 'Memorize is your personal scripture memory workspace. Add individual verses or whole Bible books, then practice with short interactive sessions. Your list and progress are saved to your account and are visible only to you.',
          },
          {
            subtitle: 'Opening Memorize',
            text: 'Tap the **Memorize** filter on Home to see your passages. The count on the tile shows how many items you have saved. On small screens, Memorize appears on the second filter row after Prompts and Personal. Use the Home search field to filter your list by book, reference, or translation (for example **John**, **3:16**, or **kjv**). Switch between **Cards** and **Table** layouts on the action bar; the layout defaults to **Cards** until you change it, then your choice and the table’s column sort are remembered on this device. Table columns are Reference (Bible order), Sessions, and Mastery (Learning first by default).',
          },
          {
            subtitle: 'Adding verses',
            text: 'Tap **Add Verses** to open the passage picker. Choose a Bible translation (ESV, KJV, NASB, LSB, NIV, NLT, or CSB), then pick a book, chapter, and verse range. You can add single verses or short passages. Tap a selected verse again to deselect before choosing another. Your translation choice is remembered for future adds.',
          },
          {
            subtitle: 'Adding Bible books',
            text: 'Tap **Bible Books** to add an entire book—or a defined scope of books—to memorize in order. This is helpful when you want to work through a book chapter by chapter rather than picking individual references.',
          },
          {
            subtitle: 'Recommended verses',
            text: 'Tap **Recommended** to browse curated passages grouped by topic (for example counseling themes). Categories start collapsed—expand one to see its verses, then tap a card to add it to your list. Verses you already saved show **Already added** and cannot be tapped again. On desktop, hover a verse (or long-press on mobile) to preview the passage text before adding.',
          },
          {
            subtitle: 'Learning, Practicing, and Mastered',
            text: 'Passages move through three groups as you complete practice sessions: **Learning** (new or early progress), **Practicing** (building consistency), and **Mastered** (strong recall). Tap any card to start a session.',
          },
          {
            subtitle: 'Practice modes',
            text: 'Each session includes modes such as **Type** (fill in blanks), **Word** (tap words in order), **Reorder** (arrange shuffled words), and **First letters** (type from initials). When your church enables it, **Recite mode (beta)** lets you record yourself saying the passage and see word-by-word accuracy. Complete rounds to finish a session; stats update on the card when you are done.',
          },
          {
            subtitle: 'Recite mode (beta)',
            text: 'When admins turn on **Memorization Recite Mode**, tap a passage and choose **Recite mode** in the practice picker. Allow microphone access, tap **Record**, recite the verse aloud, then tap **Stop** to see word-by-word results (green = matched, red = missed or different). Results include **What we heard** so you can compare against the passage. **Repeat this round** to try again, or continue with **Next round** / **Finish** like other modes. Recite works for passages up to **5 verses** and for **Bible Books** lists; longer references show a message in the picker. Recording stops automatically after five minutes. Use **Help** on the results screen to send feedback from **Settings → Send Feedback**.',
          },
          {
            subtitle: 'Standard and Strict practice',
            text: 'In **Settings → Memorization practice**, choose **Standard** (default) or **Strict**. **Standard** auto-reveals the current blank after three wrong answers in Type, Initials, and Word modes. **Strict** keeps the red error flash until you answer correctly, shows **Errors: N** in the practice header when the round has mistakes, and in **Reorder** counts a swap as wrong when no part lands in its correct slot. In Strict mode, **Next round** stays hidden until you finish the round with zero errors—you can **Repeat this round** until then. The preference syncs across your devices.',
          },
          {
            subtitle: 'Listen while you practice',
            text: 'During practice you can open **Listen** for ESV audio of the passage (when available and your passage uses the ESV translation). Playback controls let you adjust speed and jump within the passage. Scripture text and audio are provided under ESV license terms shown in the practice UI.',
          },
          {
            subtitle: 'Removing passages',
            text: 'Use the trash icon on a card to remove a passage from your list. You can add it again later from **Verses**, **Bible Books**, or **Recommended** if you want to restart.',
          },
        ],
        order: 6,
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
            text: 'The main filter row has **Public**, **Personal**, **Prompts**, **Memorize**, and optionally **Members**. The active tab is highlighted with a colored border. Tap **Public** for community prayers, then use the **Current**, **Answered**, and **Total** chips that appear below. **Personal**, **Prompts**, and **Memorize** each show their own sub-filter chips under the main row when selected.',
          },
          {
            subtitle: 'Personal Prayers Filter',
            text: 'Tap the **Personal** filter tab (highlighted when active) to view only your private personal prayers. These prayers are visible only to you and are not shared with the prayer community. You can search, update, and manage your personal prayers just like community prayers, but they remain completely private.',
          },
          {
            subtitle: 'Finding Archived Prayers',
            text: 'Archived prayers are still accessible and can be updated. Under the **Public** tab, tap the **Total** chip to see all community prayers including archived ones. You can find, edit, and update archived prayers just like active prayers.',
          },
          {
            subtitle: 'Search Across All Filters',
            text: 'The search functionality works across all prayer filters. Whether you\'re viewing current prayers, answered prayers, personal prayers, or prompts, you can search to narrow down the results. Search looks through prayer titles, descriptions, and prayer prompts.',
          },
        ],
        order: 7,
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
        order: 8,
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
            text: 'Under the settings menu, find the print button to print your prayers. You can print all prayers or just the filtered results. This includes both community prayers and your personal private prayers.',
          },
          {
            subtitle: 'Printing Personal Prayers',
            text: 'When viewing your personal prayers (using the "Personal" filter), you can print them using the print button in settings. Your personal prayers will be printed as they appear on screen, giving you an offline copy of your private prayer list.',
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
        order: 9,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_email_subscription',
        title: 'Email Subscription',
        description: 'Manage your email notification preferences',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>',
        content: [
          {
            subtitle: 'What is Email Subscription?',
            text: 'Email subscription allows you to receive email notifications about new prayers and prayer updates. When you disable email subscription, you will not receive any mass email blasts.',
          },
          {
            subtitle: 'Accessing Email Subscription Settings',
            text: 'To manage your email subscription, open the Settings menu (gear icon) in the top right corner of the app. You\'ll find the Email Subscription toggle in the settings panel. Simply toggle it on or off to enable or disable email notifications.',
          },
                    {
            subtitle: 'Unsubscribe from Mass Emails',
            text: 'Disabling the Email Subscription toggle will unsubscribe you from all mass email blasts and automated notification emails sent by the app. This means you\'ll stop receiving prayer updates, but you\'ll still be able to use the app normally.',
          },
          {
            subtitle: 'Your Preference is Saved',
            text: 'Your email subscription preference is saved automatically and will persist across sessions. You can change your subscription status at any time by revisiting the Settings menu.',
          },
        ],
        order: 10,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_prayer_reminders',
        title: 'Prayer reminders',
        description: 'Bell on a card or general nudges in Settings',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
        content: [
          {
            subtitle: 'Two ways to get reminders',
            text: 'You can set a reminder on a specific prayer from the bell icon on its card, or add general “pause and pray” nudges in Settings. Both use 15-minute time steps (:00, :15, :30, :45) in your device time zone. They are only for you and are separate from community prayer update emails (those are set up by admins for people who submitted requests).',
          },
          {
            subtitle: 'Per-prayer reminders (bell icon)',
            text: 'On community, personal, Planning Center member, and prayer prompt cards, tap the bell to schedule a one-time, daily, or weekly reminder for that prayer. A filled bell means you already have at least one reminder. Reminders are removed automatically when the prayer is deleted, archived, or marked answered. Email and push links open the app on that prayer.',
          },
          {
            subtitle: 'General prayer nudges (Settings)',
            text: 'Open Settings (gear icon). In the Prayer reminders section, pick a time from the dropdown and tap Add reminder. You can add more than one time. Remove any slot you no longer need. These nudges are not tied to a single card—they are a personal rhythm to pause and pray.',
          },
          {
            subtitle: 'Email and push',
            text: 'If Email subscription is on in Settings, you can receive a reminder email at each chosen time. If push notifications are enabled and this device is registered for push (installed native app), you can also get a push—you do not need to set the reminder on the phone; delivery goes to your registered device. If both are on, you may receive both.',
          },
          {
            subtitle: 'Tips',
            text: 'Start with one or two times that fit your routine, or a single per-prayer reminder for something you want to keep lifting up. You can change or clear reminders anytime without affecting the rest of your account.',
          },
        ],
        order: 11,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
      {
        id: 'help_memorization_reminders',
        title: 'Memorization reminders',
        description: 'Optional nudges to practice scripture memory',
        icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
        content: [
          {
            subtitle: 'What they are',
            text: 'Memorization reminders are optional, personal prompts at clock times you choose in 15-minute steps (:00, :15, :30, :45)—a short nudge to open the Memorize tab and practice your verses. They are separate from prayer reminders and from admin email broadcasts.',
          },
          {
            subtitle: 'How to set them up',
            text: 'Open Settings (gear icon). In the Memorization reminders section (below Memorization practice), pick a time from the dropdown and tap Add reminder. You can add more than one time. Remove any slot you no longer need. Reminder times use your device time zone.',
          },
          {
            subtitle: 'Email and push',
            text: 'If Email subscription is on in Settings, you can receive a reminder email at each chosen time. If push notifications are enabled and this device is registered for push, you can also get a push at those times. If both are on, you may receive both. Emails may highlight a verse or list item that needs the most practice when your church uses the spotlight template.',
          },
          {
            subtitle: 'Tips',
            text: 'Add verses on the Memorize tab first so spotlight reminders have something to suggest. You can change or clear memorization reminders anytime in Settings without affecting prayer reminders.',
          },
        ],
        order: 12,
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
        order: 13,
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
            text: 'The "Print Prayers" button allows you to print or export your current prayers as a PDF. The "Print Prompts" button prints the prayer prompts so you can use them offline or share them with others. The "Print Personal Prayers" button allows you to print your personal prayers.',
          },
          {
            subtitle: 'Theme Options',
            text: 'Choose from different theme options to customize the app appearance. Light mode is best for bright environments, dark mode reduces eye strain in low light, and system mode automatically follows your device\'s theme preference. Your selected theme preference is saved automatically.',
          },
          {
            subtitle: 'Text size',
            text: 'Use the text size setting to make on-screen text larger for easier reading. Choose Default for standard sizing, Larger for a moderate increase, or Largest for the biggest text. Your choice applies across the app and is saved automatically.',
          },
          {
            subtitle: 'Email Subscription',
            text: 'Enable email subscription to receive notifications about prayer updates and community activities. When enabled, you\'ll get email notifications for new prayers, prayer updates, and other important app notifications. You can toggle this setting at any time to start or stop receiving emails.',
          },
          {
            subtitle: 'Notification Badges',
            text: 'Badges appear on the main filter tabs and sub-filter chips to notify you of new prayers that haven\'t been read yet. You can dismiss badges by clicking directly on the badge number. Or, click the badge on a **Public**, **Prompts**, or community sub-chip to clear all badges for that category at once.',
          },
          {
            subtitle: 'Enabling Badges',
            text: 'To turn on the badge feature, enable "Badge Functionality" in settings. Once enabled, you\'ll see notifications for unread prayers. You can toggle this setting at any time based on your preference.',
          },
          {
            subtitle: 'Show "Pray For" button',
            text: 'Under Prayer encouragement on cards in Settings, you can turn the Pray For button on or off for your own view on community prayer requests. When it is on, you can record that you prayed for a request. When it is off, the button is hidden on cards for you only; other people still see and use prayer encouragement as usual. Your choice is saved to your account.',
          },
          {
            subtitle: 'Show "Praying #" button',
            text: 'In the same section, you can show or hide the praying count (the number of people praying) on prayer cards when the app would display it—for example on your own requests. Your preference is saved to your account.',
          },
          {
            subtitle: 'Personal / member / prompt cooldown',
            text: 'In **Prayer encouragement on cards** (when Prayer Encouragement is enabled for your church), set how many hours—between **1 and 168** (default **4**)—before you can tap **Pray For** again on the same **personal**, **member**, or **prompt** card. Community prayer cards still use the church-wide cooldown set by admins. Your cooldown is saved to your account.',
          },
          {
            subtitle: 'Default Prayer View',
            text: 'Set your preferred default view when you log in. Choose between "Current Prayers View" to see public prayers waiting for prayer, or "Personal Prayers View" to see your personal prayer list. Your selection is saved and will be remembered each time you log in.',
          },
          {
            subtitle: 'Memorization practice',
            text: 'Choose **Standard** or **Strict** for scripture memory sessions. **Standard** auto-reveals blanks after three wrong attempts in Type, Initials, and Word modes. **Strict** disables auto-reveal, shows **Errors: N** during practice when the round has mistakes, and in **Reorder** counts a swap as wrong when no part lands in its correct slot. Strict mode hides **Next round** until the current round finishes with zero errors (use **Repeat this round** until then). Saved to your account and synced across devices.',
          },
          {
            subtitle: 'Memorization reminders (Settings nudges)',
            text: 'Below **Memorization practice**, choose one or more times in **15-minute** steps when you would like a short reminder to practice memorization. Times follow your device time zone. If email subscription is on, you will get an email at those times; if push notifications are on and this device is registered for push, you will also get a push reminder—if both are on, you may receive both. These are separate from **Prayer reminders**.',
          },
          {
            subtitle: 'Prayer reminders (Settings nudges and bell)',
            text: 'In Settings you can choose one or more times in **15-minute** steps for a short reminder to pray. You can also tap the **bell** on any community, personal, member, or prompt card to set a once, daily, or weekly reminder for that specific prayer. Times follow your device time zone. If email subscription is on, you will get an email at those times; if push notifications are on and your phone has the installed app registered for push, you will also get a push—if both are on, you may receive both. Pick a time with the dropdown, tap Add reminder, or Remove a slot you no longer want. These are your personal reminders to pause and pray; they are separate from community prayer update reminders (which admins configure for requesters).',
          },
          {
            subtitle: 'Feedback Form',
            text: 'Have suggestions or found a bug? Use the feedback form in settings to share your thoughts with us. Your feedback helps us improve the app and make it work better for you. Simply describe your feedback, and we\'ll review it to enhance your experience.',
          },
          {
            subtitle: 'Logout',
            text: 'Click the logout button in the settings panel to sign out of your account. Alternatively, you can click on your email badge in the top-right corner of the header, which will prompt you with a confirmation dialog before logging out. Both methods will end your session and return you to the login screen.',
          },
          {
            subtitle: 'Delete your account',
            text: 'At the bottom of the settings panel you can delete your account. A verification dialog will ask you to choose: "Delete account but keep my prayers" so your prayers continue to be lifted up by others, or "Delete my account and all my prayers" to remove your account and all prayers you submitted. After either choice you will be signed out and would need to be re-approved to use the app again.',
          },
        ],
        order: 14,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: 'system',
      },
    ];
  }
}
