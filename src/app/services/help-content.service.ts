import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, catchError, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';
import { HelpSection, HelpSectionInput } from '../types/help-content';
import { getDefaultHelpSections } from '../lib/help-content-catalog';

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
    return getDefaultHelpSections();
  }
}
