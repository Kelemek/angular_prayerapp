import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { PrayerPrompt } from '../components/prompt-card/prompt-card.component';

@Injectable({
  providedIn: 'root'
})
export class PromptService {
  public promptsSubject = new BehaviorSubject<PrayerPrompt[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(true);
  private errorSubject = new BehaviorSubject<string | null>(null);

  public prompts$ = this.promptsSubject.asObservable();
  public loading$ = this.loadingSubject.asObservable();
  public error$ = this.errorSubject.asObservable();

  constructor(
    private supabase: SupabaseService,
    private toast: ToastService
  ) {
    this.loadPrompts();
  }

  /**
   * Load prompts from database
   */
  async loadPrompts(): Promise<void> {
    try {
      this.loadingSubject.next(true);
      this.errorSubject.next(null);

      const { data, error } = await this.supabase.client
        .from('prayer_prompts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      this.promptsSubject.next(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load prompts';
      console.error('Failed to load prompts:', err);
      this.errorSubject.next(errorMessage);
      this.toast.error('Failed to load prompts');
    } finally {
      this.loadingSubject.next(false);
    }
  }

  /**
   * Add a new prompt
   */
  async addPrompt(prompt: Omit<PrayerPrompt, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .insert({
          title: prompt.title,
          type: prompt.type,
          description: prompt.description
        });

      if (error) throw error;

      this.toast.success('Prompt added successfully');
      await this.loadPrompts();
      return true;
    } catch (error) {
      console.error('Error adding prompt:', error);
      this.toast.error('Failed to add prompt');
      return false;
    }
  }

  /**
   * Update a prompt
   */
  async updatePrompt(id: string, updates: Partial<PrayerPrompt>): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      this.toast.success('Prompt updated successfully');
      await this.loadPrompts();
      return true;
    } catch (error) {
      console.error('Error updating prompt:', error);
      this.toast.error('Failed to update prompt');
      return false;
    }
  }

  /**
   * Delete a prompt
   */
  async deletePrompt(id: string): Promise<boolean> {
    try {
      const { error } = await this.supabase.client
        .from('prayer_prompts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      this.toast.success('Prompt deleted successfully');
      await this.loadPrompts();
      return true;
    } catch (error) {
      console.error('Error deleting prompt:', error);
      this.toast.error('Failed to delete prompt');
      return false;
    }
  }

  /**
   * Filter prompts by type
   */
  filterByType(type: string | null): PrayerPrompt[] {
    const allPrompts = this.promptsSubject.value;
    if (!type) return allPrompts;
    return allPrompts.filter(p => p.type === type);
  }
}
