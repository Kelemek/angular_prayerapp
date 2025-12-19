import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../services/supabase.service';
import { ToastService } from '../../services/toast.service';

interface PrayerUpdate {
  id: string;
  content: string;
  author: string;
  created_at: string;
  denial_reason?: string | null;
  approval_status?: string;
}

interface Prayer {
  id: string;
  title: string;
  requester: string;
  email: string | null;
  status: string;
  created_at: string;
  denial_reason?: string | null;
  description?: string | null;
  approval_status?: string;
  prayer_for?: string;
  prayer_updates?: PrayerUpdate[];
}

interface EditForm {
  title: string;
  description: string;
  requester: string;
  email: string;
  prayer_for: string;
  status: string;
}

interface NewUpdate {
  content: string;
  author: string;
  author_email: string;
}

@Component({
  selector: 'app-prayer-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './prayer-search.component.html',
  styleUrls: ['./prayer-search.component.css']
})
export class PrayerSearchComponent implements OnInit {
  searchTerm = '';
  statusFilter = '';
  approvalFilter = '';
  searchResults: Prayer[] = [];
  searching = false;
  deleting = false;
  error: string | null = null;
  selectedPrayers = new Set<string>();
  expandedCards = new Set<string>();
  editingPrayer: string | null = null;
  editForm: EditForm = {
    title: '',
    description: '',
    requester: '',
    email: '',
    prayer_for: '',
    status: ''
  };
  saving = false;
  bulkStatus = '';
  updatingStatus = false;
  addingUpdate: string | null = null;
  newUpdate: NewUpdate = { content: '', author: '', author_email: '' };
  savingUpdate = false;

  constructor(
    private supabaseService: SupabaseService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // Initial load is not automatic - user must search or select a filter
  }

  async handleSearch(): Promise<void> {
    const hasSearchTerm = this.searchTerm.trim().length > 0;
    const hasStatusFilter = this.statusFilter && this.statusFilter !== 'all';
    const hasApprovalFilter = this.approvalFilter && this.approvalFilter !== 'all';
    const hasAllStatusFilter = this.statusFilter === 'all';
    const hasAllApprovalFilter = this.approvalFilter === 'all';

    try {
      this.searching = true;
      this.error = null;
      this.selectedPrayers = new Set();

      const supabaseUrl = this.supabaseService.getSupabaseUrl();
      const supabaseKey = this.supabaseService.getSupabaseKey();

      const params = new URLSearchParams();
      params.set('select', 'id,title,requester,email,status,created_at,denial_reason,description,approval_status,prayer_for,prayer_updates(id,content,author,created_at,denial_reason,approval_status)');
      params.set('order', 'created_at.desc');
      params.set('limit', '100');

      if (this.searchTerm.trim()) {
        params.set('or', `(requester.ilike.%${this.searchTerm}%,email.ilike.%${this.searchTerm}%,title.ilike.%${this.searchTerm}%,description.ilike.%${this.searchTerm}%,denial_reason.ilike.%${this.searchTerm}%)`);
      }

      if (this.statusFilter && this.statusFilter !== 'all') {
        params.set('status', `eq.${this.statusFilter}`);
      }

      if (this.approvalFilter && this.approvalFilter !== 'all' && this.approvalFilter !== 'denied' && this.approvalFilter !== 'pending') {
        params.set('approval_status', `eq.${this.approvalFilter}`);
      }

      const url = `${supabaseUrl}/rest/v1/prayers?${params.toString()}`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Query failed: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      let results = data || [];

      if (this.approvalFilter === 'denied') {
        results = results.filter((prayer: Prayer) => {
          if (prayer.denial_reason) return true;
          if (prayer.prayer_updates && prayer.prayer_updates.length > 0) {
            return prayer.prayer_updates.some(update =>
              update.denial_reason !== null &&
              update.denial_reason !== undefined &&
              update.denial_reason !== ''
            );
          }
          return false;
        });
      }

      if (this.approvalFilter === 'pending') {
        results = results.filter((prayer: Prayer) => {
          const isPrayerPending = prayer.approval_status === 'pending' || prayer.approval_status === null || prayer.approval_status === undefined;
          const hasPendingUpdates = prayer.prayer_updates && prayer.prayer_updates.length > 0 &&
            prayer.prayer_updates.some(update =>
              update.approval_status === 'pending' || update.approval_status === null || update.approval_status === undefined
            );
          return isPrayerPending || hasPendingUpdates;
        });
      }

      this.searchResults = results;
    } catch (err: unknown) {
      console.error('Error searching prayers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to search prayers';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.searching = false;
    }
  }

  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.handleSearch();
    }
  }

  onStatusFilterChange(): void {
    if (this.statusFilter === 'all' || this.statusFilter) {
      this.handleSearch();
    }
  }

  onApprovalFilterChange(): void {
    if (this.approvalFilter === 'all' || this.approvalFilter) {
      this.handleSearch();
    }
  }

  toggleSelectPrayer(prayerId: string): void {
    const newSelected = new Set(this.selectedPrayers);
    if (newSelected.has(prayerId)) {
      newSelected.delete(prayerId);
    } else {
      newSelected.add(prayerId);
    }
    this.selectedPrayers = newSelected;
  }

  toggleSelectAll(): void {
    if (this.selectedPrayers.size === this.searchResults.length) {
      this.selectedPrayers = new Set();
    } else {
      this.selectedPrayers = new Set(this.searchResults.map(p => p.id));
    }
  }

  toggleExpandCard(id: string): void {
    const newExpanded = new Set(this.expandedCards);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    this.expandedCards = newExpanded;
  }

  async deletePrayer(prayer: Prayer): Promise<void> {
    if (!confirm(`Are you sure you want to delete the prayer "${prayer.title}"? This action cannot be undone.`)) {
      return;
    }

    try {
      this.deleting = true;
      this.error = null;

      const { error: updatesError } = await this.supabaseService.getClient()
        .from('prayer_updates')
        .delete()
        .eq('prayer_id', prayer.id);

      if (updatesError) {
        throw new Error(`Failed to delete prayer updates: ${updatesError.message}`);
      }

      const { error: prayerError } = await this.supabaseService.getClient()
        .from('prayers')
        .delete()
        .eq('id', prayer.id);

      if (prayerError) {
        throw new Error(`Failed to delete prayer: ${prayerError.message}`);
      }

      this.searchResults = this.searchResults.filter(p => p.id !== prayer.id);
      this.selectedPrayers.delete(prayer.id);
      this.toast.success('Prayer deleted successfully');
    } catch (err: unknown) {
      console.error('Error deleting prayer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete prayer';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.deleting = false;
    }
  }

  startEditPrayer(prayer: Prayer): void {
    this.editForm = {
      title: prayer.title,
      description: prayer.description || '',
      requester: prayer.requester,
      email: prayer.email || '',
      prayer_for: prayer.prayer_for || '',
      status: prayer.status
    };
    this.editingPrayer = prayer.id;
    this.expandedCards.add(prayer.id);
  }

  cancelEdit(): void {
    this.editingPrayer = null;
    this.editForm = {
      title: '',
      description: '',
      requester: '',
      email: '',
      prayer_for: '',
      status: ''
    };
  }

  async savePrayer(prayerId: string): Promise<void> {
    if (!this.editForm.title.trim() || !this.editForm.description.trim() || !this.editForm.requester.trim()) {
      this.error = 'Title, description, and requester are required';
      this.toast.error(this.error);
      return;
    }

    try {
      this.saving = true;
      this.error = null;

      const { error: updateError } = await this.supabaseService.getClient()
        .from('prayers')
        .update({
          title: this.editForm.title.trim(),
          description: this.editForm.description.trim(),
          requester: this.editForm.requester.trim(),
          email: this.editForm.email.trim() || null,
          prayer_for: this.editForm.prayer_for.trim() || null,
          status: this.editForm.status
        })
        .eq('id', prayerId);

      if (updateError) {
        throw new Error(`Failed to update prayer: ${updateError.message}`);
      }

      this.searchResults = this.searchResults.map(p =>
        p.id === prayerId
          ? {
              ...p,
              title: this.editForm.title.trim(),
              description: this.editForm.description.trim(),
              requester: this.editForm.requester.trim(),
              email: this.editForm.email.trim() || null,
              prayer_for: this.editForm.prayer_for.trim() || undefined,
              status: this.editForm.status
            } as Prayer
          : p
      );

      this.toast.success('Prayer updated successfully');
      this.cancelEdit();
    } catch (err: unknown) {
      console.error('Error updating prayer:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update prayer';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.saving = false;
    }
  }

  async deleteSelected(): Promise<void> {
    if (this.selectedPrayers.size === 0) return;

    if (!confirm(`Are you sure you want to delete ${this.selectedPrayers.size} prayer(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      this.deleting = true;
      this.error = null;

      const prayerIds = Array.from(this.selectedPrayers);

      const { error: updatesError } = await this.supabaseService.getClient()
        .from('prayer_updates')
        .delete()
        .in('prayer_id', prayerIds);

      if (updatesError) {
        throw new Error(`Failed to delete prayer updates: ${updatesError.message}`);
      }

      const { error: prayersError } = await this.supabaseService.getClient()
        .from('prayers')
        .delete()
        .in('id', prayerIds);

      if (prayersError) {
        throw new Error(`Failed to delete prayers: ${prayersError.message}`);
      }

      this.searchResults = this.searchResults.filter(p => !this.selectedPrayers.has(p.id));
      this.selectedPrayers = new Set();
      this.toast.success(`${prayerIds.length} prayers deleted successfully`);
    } catch (err: unknown) {
      console.error('Error deleting prayers:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete selected prayers';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.deleting = false;
    }
  }

  async updateSelectedStatus(): Promise<void> {
    if (this.selectedPrayers.size === 0 || !this.bulkStatus) return;

    const statusLabel = this.bulkStatus === 'current' ? 'Current'
      : this.bulkStatus === 'answered' ? 'Answered'
      : 'Archived';

    if (!confirm(`Are you sure you want to change ${this.selectedPrayers.size} prayer(s) to "${statusLabel}" status?`)) {
      return;
    }

    try {
      this.updatingStatus = true;
      this.error = null;

      const prayerIds = Array.from(this.selectedPrayers);

      const { error: updateError } = await this.supabaseService.getClient()
        .from('prayers')
        .update({ status: this.bulkStatus })
        .in('id', prayerIds);

      if (updateError) {
        throw new Error(`Failed to update prayer statuses: ${updateError.message}`);
      }

      this.searchResults = this.searchResults.map(p =>
        this.selectedPrayers.has(p.id) ? { ...p, status: this.bulkStatus } : p
      );

      this.selectedPrayers = new Set();
      this.bulkStatus = '';
      this.toast.success(`${prayerIds.length} prayers updated to ${statusLabel}`);
    } catch (err: unknown) {
      console.error('Error updating prayer statuses:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update prayer statuses';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.updatingStatus = false;
    }
  }

  async saveNewUpdate(prayerId: string): Promise<void> {
    if (!this.newUpdate.content.trim() || !this.newUpdate.author.trim() || !this.newUpdate.author_email.trim()) {
      this.error = 'Please provide update content, author name, and author email';
      this.toast.error(this.error);
      return;
    }

    try {
      this.savingUpdate = true;
      this.error = null;

      const { data, error: insertError } = await this.supabaseService.getClient()
        .from('prayer_updates')
        .insert({
          prayer_id: prayerId,
          content: this.newUpdate.content.trim(),
          author: this.newUpdate.author.trim(),
          author_email: this.newUpdate.author_email.trim(),
          approval_status: 'approved'
        })
        .select()
        .single();

      if (insertError) {
        throw new Error(`Failed to create update: ${insertError.message}`);
      }

      this.searchResults = this.searchResults.map(p => {
        if (p.id === prayerId) {
          return {
            ...p,
            prayer_updates: [...(p.prayer_updates || []), data]
          };
        }
        return p;
      });

      this.newUpdate = { content: '', author: '', author_email: '' };
      this.addingUpdate = null;
      this.toast.success('Update added successfully');
    } catch (err: unknown) {
      console.error('Error saving update:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to save update';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.savingUpdate = false;
    }
  }

  cancelAddUpdate(): void {
    this.addingUpdate = null;
    this.newUpdate = { content: '', author: '', author_email: '' };
  }

  async deleteUpdate(prayerId: string, updateId: string, updateContent: string): Promise<void> {
    const preview = updateContent.substring(0, 50) + (updateContent.length > 50 ? '...' : '');
    if (!confirm(`Are you sure you want to delete this update? "${preview}"\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      this.deleting = true;
      this.error = null;

      const { error: deleteError } = await this.supabaseService.getClient()
        .from('prayer_updates')
        .delete()
        .eq('id', updateId);

      if (deleteError) {
        throw new Error(`Failed to delete update: ${deleteError.message}`);
      }

      this.searchResults = this.searchResults.map(p => {
        if (p.id === prayerId && p.prayer_updates) {
          return {
            ...p,
            prayer_updates: p.prayer_updates.filter(u => u.id !== updateId)
          };
        }
        return p;
      });

      this.toast.success('Update deleted successfully');
    } catch (err: unknown) {
      console.error('Error deleting update:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete update';
      this.error = errorMessage;
      this.toast.error(errorMessage);
    } finally {
      this.deleting = false;
    }
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchResults = [];
    this.selectedPrayers = new Set();
    this.error = null;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'current':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'answered':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'archived':
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  }

  getApprovalStatusColor(status: string): string {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
      case 'denied':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300';
    }
  }
}
